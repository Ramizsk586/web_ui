use crate::agent::{AgentState, AgentStep, ContextManager, Executor, Planner, Reflector, Role, StepKind, Turn};
use crate::llm::{LlmClient, LlmResponse};
use crate::streaming::{StreamEvent, StreamHandle};
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AgentRunner {
    state: AgentState,
    context: ContextManager,
    planner: Planner,
    executor: Executor,
    reflector: Reflector,
}

impl AgentRunner {
    pub fn new(state: AgentState, llm: Arc<dyn LlmClient>) -> Self {
        Self {
            state,
            context: ContextManager::new(),
            planner: Planner::new(llm.clone()),
            executor: Executor::new(),
            reflector: Reflector::new(llm),
        }
    }

    pub async fn run(
        &mut self,
        user_input: &str,
        llm: Arc<dyn LlmClient>,
        mut stream: StreamHandle,
    ) -> Result<String> {
        // Add user message to turns
        self.state.add_turn(Turn::user(user_input.to_string()));

        // Main agent loop
        loop {
            self.state.increment_iteration();

            // Check limits
            if self.state.is_exhausted() {
                let msg = format!(
                    "Agent exhausted: {} iterations, {} tokens used",
                    self.state.iteration, self.state.total_tokens
                );
                stream.send(StreamEvent::text_delta(&msg)).await?;
                break;
            }

            // Plan step (every 5 steps or first step)
            if self.state.should_plan() {
                let plan = self.planner.generate_plan(&self.state, llm.as_ref()).await?;
                let step = AgentStep::new(StepKind::Plan, plan);
                self.state.add_step(step);
                stream.send(StreamEvent::text_delta("\n[Planning] ")).await?;
            }

            // Think + LLM call
            let messages = self.state.build_context_messages();
            let system_prompt = self.build_system_prompt();
            
            match llm.complete_stream(&system_prompt, &messages, &mut stream).await {
                Ok(response) => {
                    self.handle_llm_response(response, llm.as_ref(), &mut stream).await?;
                }
                Err(e) => {
                    let step = AgentStep::new(StepKind::Reflect, format!("LLM Error: {}", e))
                        .with_error(e.to_string());
                    self.state.add_step(step);
                    stream.send(StreamEvent::text_delta(&format!("\n[Error] {}", e))).await?;
                    
                    // Reflect on error
                    let reflection = self.reflector.reflect(&self.state).await?;
                    stream.send(StreamEvent::text_delta(&format!("\n[Reflection] {}", reflection))).await?;
                }
            }

            // Check for stop condition
            if self.state.should_stop() {
                break;
            }
        }

        Ok(self.summarize())
    }

    async fn handle_llm_response(
        &mut self,
        response: LlmResponse,
        llm: &dyn LlmClient,
        stream: &mut StreamHandle,
    ) -> Result<()> {
        if let Some(tool_calls) = response.tool_calls {
            // Tool call
            for call in tool_calls {
                let tool_name = call.name.clone();
                let tool_input = call.arguments;
                let call_id = call.id.clone();

                // Record tool call step
                let step = AgentStep::new(StepKind::ToolCall, format!("Calling tool: {}", tool_name))
                    .with_tool_call(tool_name.clone(), tool_input.clone());
                self.state.add_step(step);

                // Dispatch tool
                stream.send(StreamEvent::tool_call_start(&call_id, &tool_name, &tool_input.to_string())).await?;
                
                let result = self.executor.execute(&tool_name, tool_input, &self.state.workspace).await;
                
                match result {
                    Ok(output) => {
                        stream.send(StreamEvent::tool_call_delta(&call_id, &output)).await?;
                        stream.send(StreamEvent::tool_call_result(&call_id, &output)).await?;
                        
                        let step = AgentStep::new(StepKind::ToolResult, "Tool result".to_string())
                            .with_tool_output(serde_json::Value::String(output.clone()));
                        self.state.add_step(step);

                        // Add as turn for context
                        self.state.add_turn(Turn::tool(format!(
                            "Tool {} returned: {}", tool_name, output
                        )));
                    }
                    Err(e) => {
                        let error_msg = e.to_string();
                        stream.send(StreamEvent::tool_call_delta(&call_id, &error_msg)).await?;
                        stream.send(StreamEvent::tool_call_result(&call_id, &error_msg)).await?;
                        
                        let step = AgentStep::new(StepKind::ToolResult, "Tool error".to_string())
                            .with_error(error_msg.clone());
                        self.state.add_step(step);

                        // Reflect on error
                        let reflection = self.reflector.reflect(&self.state).await?;
                        stream.send(StreamEvent::text_delta(&format!("\n[Reflection] {}", reflection))).await?;
                    }
                }
            }
        } else {
            // Text response
            if let Some(content) = response.content {
                let step = AgentStep::new(StepKind::Respond, content.clone());
                self.state.add_step(step);
                self.state.add_turn(Turn::assistant(content));
            }
        }

        Ok(())
    }

    fn build_system_prompt(&self) -> String {
        let tools_schema = self.executor.get_tool_schemas();
        format!(
            r#"You are Lumina Coder Mode, an autonomous coding agent.

You have access to these tools:
{tools_schema}

Rules:
1. When you need to perform an action, use a tool_call
2. Always resolve paths relative to the workspace
3. For file operations, use the provided tools - never pretend to read/write files directly
4. After a tool error, reflect on what went wrong and try a different approach
5. Be concise and focused in your responses

Workspace: {}

Current iteration: {}/{}
"#,
            self.state.workspace.display(),
            self.state.iteration,
            self.state.max_iterations
        )
    }

    fn summarize(&self) -> String {
        let step_count = self.state.steps.len();
        let tool_calls = self.state.steps.iter().filter(|s| matches!(s.kind, StepKind::ToolCall)).count();
        format!(
            "Completed {} steps ({} tool calls, {} tokens used)",
            step_count, tool_calls, self.state.total_tokens
        )
    }
}

trait ShouldStop {
    fn should_stop(&self) -> bool;
}

impl ShouldStop for AgentState {
    fn should_stop(&self) -> bool {
        // Stop if last step was a successful text response (not a tool call)
        if let Some(last) = self.state.steps.last() {
            matches!(last.kind, StepKind::Respond) && last.error.is_none()
        } else {
            false
        }
    }
}