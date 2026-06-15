use crate::agent::{AgentState, StepKind};
use crate::llm::LlmClient;
use anyhow::Result;
use std::sync::Arc;

pub struct Planner {
    llm: Arc<dyn LlmClient>,
}

impl Planner {
    pub fn new(llm: Arc<dyn LlmClient>) -> Self {
        Self { llm }
    }

    pub async fn generate_plan(&self, state: &AgentState, llm: &dyn LlmClient) -> Result<String> {
        // Build context summary
        let recent_steps = state.steps.iter().rev().take(10).collect::<Vec<_>>();
        let context_summary = recent_steps
            .iter()
            .map(|s| format!("{:?}: {}", s.kind, s.content))
            .collect::<Vec<_>>()
            .join("\n");

        let user_goal = state
            .turns
            .iter()
            .rev()
            .find(|t| matches!(t.role, crate::agent::Role::User))
            .map(|t| t.content.as_str())
            .unwrap_or("Unknown");

        let prompt = format!(
            r#"Based on the conversation history and recent steps, create a plan for the next actions.

Current user request: {}

Recent steps:
{}

Requirements:
1. Be specific about what tool to use and why
2. Consider what has already been tried
3. Suggest concrete next steps
4. Keep the plan concise (3-5 bullet points)

Respond with a brief plan in plain text."#,
            user_goal, context_summary
        );

        let plan = llm.complete_text(&prompt, &[]).await?;
        
        Ok(plan)
    }

    pub async fn should_replan(&self, state: &AgentState) -> Result<bool> {
        // Check if we need to generate a new plan
        let step_count = state.steps.len();
        
        // Replan every 5 steps
        Ok(step_count > 0 && step_count % 5 == 0)
    }
}