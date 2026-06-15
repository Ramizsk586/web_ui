use super::{Tool, ToolCall};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use serde_json::Value;
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone)]
pub struct ReadFileTool;

impl ReadFileTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for ReadFileTool {
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
    let canonical_full = full_path.canonicalize()
        .unwrap_or(full_path.clone());
    
    if !canonical_full.starts_with(&canonical_workspace) {
        return Err(anyhow!("Path is outside workspace"));
    }

    Ok(full_path)
}

#[async_trait]
impl Tool for ReadFileTool {
    fn name(&self) -> &str {
        "read_file"
    }

    fn description(&self) -> &str {
        "Read contents of a file from the workspace. Use this for reading source code, configs, etc."
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to the file within the workspace"
                },
                "offset": {
                    "type": "number",
                    "description": "Optional line offset to start reading from"
                },
                "limit": {
                    "type": "number",
                    "description": "Optional maximum number of lines to read"
                }
            },
            "required": ["path"]
        })
    }

    async fn execute(&self, call: ToolCall, workspace: &PathBuf) -> Result<String> {
        let path = call.arguments.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing 'path' argument"))?;

        let safe_path = resolve_safe_path(workspace, path)?;

        let offset = call.arguments.get("offset")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        let limit = call.arguments.get("limit")
            .and_then(|v| v.as_u64())
            .unwrap_or(u64::MAX) as usize;

        let content = fs::read_to_string(&safe_path).await
            .map_err(|e| anyhow!("Failed to read file: {}", e))?;

        let lines: Vec<&str> = content.lines().collect();
        
        let total_lines = lines.len();
        let end = (offset + limit).min(total_lines);
        
        let selected = if offset < total_lines {
            lines[offset..end].join("\n")
        } else {
            String::new()
        };

        let preview = if selected.len() > 10000 {
            format!("{}...\n\n[Output truncated - showing first 10000 chars]", &selected[..10000])
        } else {
            selected
        };

        Ok(format!(
            "File: {}\nLines: {}-{} of {}\n\n{}",
            safe_path.display(),
            offset + 1,
            end,
            total_lines,
            preview
        ))
    }
}