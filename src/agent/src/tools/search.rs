use super::{Tool, ToolCall};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use serde_json::Value;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

#[derive(Debug, Clone)]
pub struct SearchTool;

impl SearchTool {
    pub fn new() -> Self {
        Self
    }
}

impl Default for SearchTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Tool for SearchTool {
    fn name(&self) -> &str {
        "search_code"
    }

    fn description(&self) -> &str {
        "Search for text patterns in code files using ripgrep. Returns matching lines with context."
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "The regex pattern to search for"
                },
                "path": {
                    "type": "string",
                    "description": "Directory path to search in (defaults to workspace root)"
                },
                "file_pattern": {
                    "type": "string",
                    "description": "File pattern to match (e.g., '*.rs', '*.ts')"
                },
                "context": {
                    "type": "number",
                    "description": "Number of lines of context to show around matches"
                },
                "max_results": {
                    "type": "number",
                    "description": "Maximum number of results to return"
                }
            },
            "required": ["pattern"]
        })
    }

    async fn execute(&self, call: ToolCall, workspace: &PathBuf) -> Result<String> {
        let pattern = call.arguments.get("pattern")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing 'pattern' argument"))?;

        let path = call.arguments.get("path")
            .and_then(|v| v.as_str())
            .map(|p| workspace.join(p))
            .unwrap_or_else(|| workspace.clone());

        let file_pattern = call.arguments.get("file_pattern")
            .and_then(|v| v.as_str())
            .unwrap_or("*");

        let context = call.arguments.get("context")
            .and_then(|v| v.as_u64())
            .unwrap_or(2) as i64;

        let max_results = call.arguments.get("max_results")
            .and_then(|v| v.as_u64())
            .unwrap_or(100) as i64;

        // Security: Validate pattern doesn't contain malicious regex
        if pattern.contains("(?<=") || pattern.contains("(?<!") {
            return Err(anyhow!("Lookbehind assertions are not supported"));
        }

        let output = Command::new("rg")
            .args([
                "--color=never",
                "--no-heading",
                "--with-filename",
                "-C", &context.to_string(),
                "--limit", &max_results.to_string(),
                "-g", &format!("*{}", file_pattern),
                pattern,
            ])
            .current_dir(&path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| anyhow!("Failed to execute ripgrep: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if !output.status.success() && !stderr.is_empty() {
            return Err(anyhow!("Search error: {}", stderr));
        }

        if stdout.is_empty() {
            return Ok("No matches found".to_string());
        }

        let result_count = stdout.lines().count() / (context as usize * 2 + 1);
        Ok(format!(
            "Found {} matches:\n\n{}",
            result_count,
            stdout
        ))
    }
}