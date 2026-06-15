use super::{Tool, ToolCall};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use serde_json::Value;
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone)]
pub struct WriteFileTool;

impl WriteFileTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WriteFileTool {
    fn default() -> Self {
        Self::new()
    }
}

fn resolve_safe_path(workspace: &PathBuf, input_path: &str) -> Result<PathBuf> {
    let input = Path::new(input_path);
    
    // Reject absolute paths
    if input.is_absolute() {
        return Err(anyhow!("Absolute paths are not allowed"));
    }

    // Reject path traversal attempts
    let normalized = input
        .components()
        .filter(|c| !matches!(c, std::path::Component::ParentDir))
        .collect::<PathBuf>();

    // Check for any remaining .. components
    let normalized_str = normalized.to_string_lossy();
    if normalized_str.contains("..") {
        return Err(anyhow!("Path traversal detected"));
    }

    let full_path = workspace.join(&normalized);
    
    // Ensure the resolved path is within workspace
    let canonical_workspace = workspace.canonicalize()
        .unwrap_or_else(|_| workspace.clone());
    
    if let Ok(canonical_full) = full_path.canonicalize() {
        if !canonical_full.starts_with(&canonical_workspace) {
            return Err(anyhow!("Path is outside workspace"));
        }
    }

    Ok(full_path)
}

#[async_trait]
impl Tool for WriteFileTool {
    fn name(&self) -> &str {
        "write_file"
    }

    fn description(&self) -> &str {
        "Write or create a file in the workspace. Use 'append' mode to add content to existing files."
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to the file within the workspace"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                },
                "append": {
                    "type": "boolean",
                    "description": "If true, append to existing file instead of overwriting"
                }
            },
            "required": ["path", "content"]
        })
    }

    async fn execute(&self, call: ToolCall, workspace: &PathBuf) -> Result<String> {
        let path = call.arguments.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing 'path' argument"))?;

        let content = call.arguments.get("content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing 'content' argument"))?;

        let append = call.arguments.get("append")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let safe_path = resolve_safe_path(workspace, path)?;

        // Create parent directories if needed
        if let Some(parent) = safe_path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| anyhow!("Failed to create directory: {}", e))?;
        }

        if append {
            fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&safe_path)
                .await
                .map_err(|e| anyhow!("Failed to open file for append: {}", e))?;
        } else {
            fs::write(&safe_path, content).await
                .map_err(|e| anyhow!("Failed to write file: {}", e))?;
        }

        let action = if append { "Appended to" } else { "Wrote" };
        Ok(format!("{} file: {}", action, safe_path.display()))
    }
}