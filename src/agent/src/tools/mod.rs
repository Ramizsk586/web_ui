pub mod bash;
pub mod read_file;
pub mod write_file;
pub mod search;
pub mod list_dir;

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub name: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

impl ToolResult {
    pub fn ok(output: impl Into<String>) -> Self {
        Self {
            success: true,
            output: output.into(),
            error: None,
        }
    }

    pub fn err(error: impl Into<String>) -> Self {
        Self {
            success: false,
            output: String::new(),
            error: Some(error.into()),
        }
    }
}

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn input_schema(&self) -> serde_json::Value;
    
    async fn execute(&self, call: ToolCall, workspace: &PathBuf) -> Result<String>;
}

pub struct ToolRegistry {
    tools: Arc<RwLock<HashMap<String, Box<dyn Tool>>>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        let registry = Self {
            tools: Arc::new(RwLock::new(HashMap::new())),
        };
        registry.register_defaults();
        registry
    }

    fn register_defaults(&self) {
        // Register built-in tools using tokio::spawn_blocking for thread-safe interior mutability
        let tools = self.tools.clone();
        let mut tools_guard = futures::executor::block_on(tools.write());
        
        tools_guard.insert("bash".to_string(), Box::new(bash::BashTool::new()) as Box<dyn Tool>);
        tools_guard.insert("read_file".to_string(), Box::new(read_file::ReadFileTool::new()) as Box<dyn Tool>);
        tools_guard.insert("write_file".to_string(), Box::new(write_file::WriteFileTool::new()) as Box<dyn Tool>);
        tools_guard.insert("search_code".to_string(), Box::new(search::SearchTool::new()) as Box<dyn Tool>);
        tools_guard.insert("list_dir".to_string(), Box::new(list_dir::ListDirTool::new()) as Box<dyn Tool>);
    }

    pub async fn get(&self, name: &str) -> Option<Box<dyn Tool>> {
        let tools = self.tools.read().await;
        tools.get(name).cloned()
    }

    pub async fn all(&self) -> Vec<Box<dyn Tool>> {
        let tools = self.tools.read().await;
        tools.values().cloned().collect()
    }

    pub fn all_schemas(&self) -> Vec<serde_json::Value> {
        futures::executor::block_on(async {
            let tools = self.tools.read().await;
            tools.values()
                .map(|t| serde_json::json!({
                    "name": t.name(),
                    "description": t.description(),
                    "input_schema": t.input_schema(),
                }))
                .collect()
        })
    }

    pub async fn register(&self, tool: Box<dyn Tool>) {
        let mut tools = self.tools.write().await;
        tools.insert(tool.name().to_string(), tool);
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}