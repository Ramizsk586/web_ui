use crate::tools::{Tool, ToolCall, ToolRegistry};
use anyhow::{anyhow, Result};
use std::path::PathBuf;

pub struct Executor {
    registry: ToolRegistry,
}

impl Executor {
    pub fn new() -> Self {
        let registry = ToolRegistry::new();
        Self { registry }
    }

    pub async fn execute(
        &self,
        tool_name: &str,
        input: serde_json::Value,
        workspace: &PathBuf,
    ) -> Result<String> {
        let tool = self.registry.get(tool_name)
            .ok_or_else(|| anyhow!("Unknown tool: {}", tool_name))?;

        let call = ToolCall {
            name: tool_name.to_string(),
            arguments: input,
        };

        let result = tool.execute(call, workspace).await?;
        Ok(result)
    }

    pub fn get_tool_schemas(&self) -> String {
        self.registry
            .all_schemas()
            .into_iter()
            .map(|s| serde_json::to_string_pretty(&s).unwrap_or_default())
            .collect::<Vec<_>>()
            .join("\n\n")
    }
}

impl Default for Executor {
    fn default() -> Self {
        Self::new()
    }
}