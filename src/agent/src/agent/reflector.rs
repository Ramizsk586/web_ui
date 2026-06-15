use crate::agent::{AgentState, StepKind};
use crate::llm::LlmClient;
use anyhow::Result;
use std::sync::Arc;

pub struct Reflector {
    llm: Arc<dyn LlmClient>,
}

impl Reflector {
    pub fn new(llm: Arc<dyn LlmClient>) -> Self {
        Self { llm }
    }

    pub async fn reflect(&self, state: &AgentState) -> Result<String> {
        // Find the most recent error
        let error_step = state.steps.iter().rev()
            .find(|s| s.error.is_some());

        let error_info = if let Some(step) = error_step {
            format!("Error: {} in step {:?}", step.error.as_deref().unwrap_or("Unknown"), step.kind)
        } else {
            "No explicit error".to_string()
        };

        // Get recent context
        let recent_steps = state.steps.iter().rev().take(10).collect::<Vec<_>>();
        let context = recent_steps
            .iter()
            .map(|s| format!("{:?}: {}", s.kind, s.content))
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = format!(
            r#"You are reflecting on an agent's recent actions to help it recover from errors.

Error context: {}

Recent steps:
{}

Reflection questions:
1. What went wrong?
2. What should the agent try differently?
3. What alternative approaches could work?

Provide a brief, actionable reflection (2-3 sentences)."#,
            error_info, context
        );

        let reflection = self.llm.complete_text(&prompt, &[]).await?;
        Ok(reflection)
    }

    pub async fn should_continue(&self, state: &AgentState) -> Result<bool> {
        // Check if we're stuck in a loop
        let recent_tool_calls: Vec<_> = state.steps.iter()
            .rev()
            .take(5)
            .filter(|s| matches!(s.kind, StepKind::ToolCall))
            .collect();

        // If we've called the same tool 3+ times recently, we might be stuck
        if recent_tool_calls.len() >= 3 {
            if let Some(last_tool) = recent_tool_calls.first().and_then(|s| s.tool_name.as_ref()) {
                let same_tool_count = recent_tool_calls.iter()
                    .filter(|s| s.tool_name.as_deref() == Some(last_tool.as_str()))
                    .count();
                
                if same_tool_count >= 3 {
                    return Ok(false);
                }
            }
        }

        Ok(true)
    }
}