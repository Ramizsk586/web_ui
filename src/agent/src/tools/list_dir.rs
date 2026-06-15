use super::{Tool, ToolCall};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use serde_json::Value;
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone)]
pub struct ListDirTool {
    max_depth: usize,
}

impl ListDirTool {
    pub fn new() -> Self {
        Self { max_depth: 5 }
    }

    pub fn with_max_depth(mut self, depth: usize) -> Self {
        self.max_depth = depth;
        self
    }
}

impl Default for ListDirTool {
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

    let normalized_str = normalized.to_string_lossy();
    if normalized_str.contains("..") {
        return Err(anyhow!("Path traversal detected"));
    }

    let full_path = workspace.join(&normalized);
    
    // Ensure within workspace
    let canonical_workspace = workspace.canonicalize()
        .unwrap_or_else(|_| workspace.clone());
    
    if let Ok(canonical_full) = full_path.canonicalize() {
        if !canonical_full.starts_with(&canonical_workspace) {
            return Err(anyhow!("Path is outside workspace"));
        }
    }

    Ok(full_path)
}

async fn list_dir_recursive(
    path: &Path,
    depth: usize,
    max_depth: usize,
    output: &mut String,
) -> Result<()> {
    if depth >= max_depth {
        return Ok(());
    }

    let indent = "  ".repeat(depth);
    
    let mut entries = fs::read_dir(path).await
        .map_err(|e| anyhow!("Failed to read directory: {}", e))?;

    let mut files: Vec<String> = Vec::new();
    let mut dirs: Vec<String> = Vec::new();

    while let Some(entry) = entries.next_entry().await
        .map_err(|e| anyhow!("Failed to read entry: {}", e))?
    {
        let name = entry.file_name().to_string_lossy().to_string();
        let file_type = entry.file_type().await
            .map_err(|e| anyhow!("Failed to get file type: {}", e))?;

        if file_type.is_dir() {
            dirs.push(name);
        } else {
            files.push(name);
        }
    }

    // Sort directories first, then files
    dirs.sort();
    files.sort();

    for dir in dirs {
        output.push_str(&format!("{}{}/\n", indent, dir));
        let subpath = path.join(&dir);
        list_dir_recursive(&subpath, depth + 1, max_depth, output).await?;
    }

    for file in files {
        output.push_str(&format!("{}{}\n", indent, file));
    }

    Ok(())
}

#[async_trait]
impl Tool for ListDirTool {
    fn name(&self) -> &str {
        "list_dir"
    }

    fn description(&self) -> &str {
        "List directory contents recursively. Shows files and folders with indentation."
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path to list (defaults to workspace root)"
                },
                "depth": {
                    "type": "number",
                    "description": "Maximum recursion depth (default: 5, max: 10)"
                }
            },
            "required": []
        })
    }

    async fn execute(&self, call: ToolCall, workspace: &PathBuf) -> Result<String> {
        let path_str = call.arguments.get("path")
            .and_then(|v| v.as_str())
            .unwrap_or(".");

        let depth = call.arguments.get("depth")
            .and_then(|v| v.as_u64())
            .unwrap_or(self.max_depth as u64)
            .min(10) as usize;

        let safe_path = resolve_safe_path(workspace, path_str)?;

        let mut output = String::new();
        output.push_str(&format!("Directory: {}\n\n", safe_path.display()));

        list_dir_recursive(&safe_path, 0, depth, &mut output).await?;

        if output.lines().count() <= 2 {
            return Ok("Directory is empty".to_string());
        }

        Ok(output)
    }
}