use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
    Tool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StepKind {
    Think,
    Plan,
    ToolCall,
    ToolResult,
    Reflect,
    Respond,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStep {
    pub id: Uuid,
    pub kind: StepKind,
    pub content: String,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub tool_output: Option<serde_json::Value>,
    pub error: Option<String>,
    pub token_cost: u32,
}

impl AgentStep {
    pub fn new(kind: StepKind, content: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            kind,
            content,
            tool_name: None,
            tool_input: None,
            tool_output: None,
            error: None,
            token_cost: 0,
        }
    }

    pub fn with_tool_call(mut self, name: String, input: serde_json::Value) -> Self {
        self.tool_name = Some(name);
        self.tool_input = Some(input);
        self
    }

    pub fn with_tool_output(mut self, output: serde_json::Value) -> Self {
        self.tool_output = Some(output);
        self
    }

    pub fn with_error(mut self, error: String) -> Self {
        self.error = Some(error);
        self
    }

    pub fn with_token_cost(mut self, cost: u32) -> Self {
        self.token_cost = cost;
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Turn {
    pub role: Role,
    pub content: String,
}

impl Turn {
    pub fn system(content: String) -> Self {
        Self { role: Role::System, content }
    }

    pub fn user(content: String) -> Self {
        Self { role: Role::User, content }
    }

    pub fn assistant(content: String) -> Self {
        Self { role: Role::Assistant, content }
    }

    pub fn tool(content: String) -> Self {
        Self { role: Role::Tool, content }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentState {
    pub session_id: Uuid,
    pub workspace: std::path::PathBuf,
    pub turns: Vec<Turn>,
    pub steps: Vec<AgentStep>,
    pub total_tokens: u32,
    pub max_tokens: u32,
    pub iteration: u32,
    pub max_iterations: u32,
}

impl AgentState {
    pub fn new(session_id: Uuid, workspace: std::path::PathBuf, max_iterations: u32, max_tokens: u32) -> Self {
        Self {
            session_id,
            workspace,
            turns: Vec::new(),
            steps: Vec::new(),
            total_tokens: 0,
            max_tokens,
            iteration: 0,
            max_iterations,
        }
    }

    pub fn add_turn(&mut self, turn: Turn) {
        self.turns.push(turn);
    }

    pub fn add_step(&mut self, step: AgentStep) {
        self.steps.push(step);
        if let Some(cost) = self.steps.last().map(|s| s.token_cost) {
            self.total_tokens += cost;
        }
    }

    pub fn should_plan(&self) -> bool {
        self.steps.is_empty() || self.steps.len() % 5 == 0
    }

    pub fn is_exhausted(&self) -> bool {
        self.iteration >= self.max_iterations || self.total_tokens >= self.max_tokens
    }

    pub fn increment_iteration(&mut self) {
        self.iteration += 1;
    }

    pub fn build_context_messages(&self) -> Vec<serde_json::Value> {
        let mut messages = Vec::new();

        // Add turns as messages
        for turn in &self.turns {
            messages.push(serde_json::json!({
                "role": turn.role,
                "content": turn.content,
            }));
        }

        // Add steps as tool messages
        for step in &self.steps {
            if step.kind == StepKind::ToolCall {
                if let (Some(name), Some(input)) = (&step.tool_name, &step.tool_input) {
                    messages.push(serde_json::json!({
                        "role": "assistant",
                        "content": null,
                        "tool_calls": [{
                            "id": step.id.to_string(),
                            "type": "function",
                            "function": {
                                "name": name,
                                "arguments": input.to_string(),
                            }
                        }]
                    }));
                }
            } else if step.kind == StepKind::ToolResult {
                if let (Some(name), Some(output)) = (&step.tool_name, &step.tool_output) {
                    messages.push(serde_json::json!({
                        "role": "tool",
                        "tool_call_id": step.id.to_string(),
                        "content": output,
                    }));
                }
            }
        }

        messages
    }
}