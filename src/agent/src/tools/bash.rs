use super::{Tool, ToolCall, ToolResult};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use serde_json::Value;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const DEFAULT_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Clone)]
pub struct BashTool {
    timeout_secs: u64,
}

impl BashTool {
    pub fn new() -> Self {
        Self {
            timeout_secs: DEFAULT_TIMEOUT_SECS,
        }
    }

    pub fn with_timeout(mut self, secs: u64) -> Self {
        self.timeout_secs = secs;
        self
    }
}

impl Default for BashTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Tool for BashTool {
    fn name(&self) -> &str {
        "bash"
    }

    fn description(&self) -> &str {
        "Execute a shell command in the workspace. Returns stdout/stderr output."
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute"
                },
                "timeout": {
                    "type": "number",
                    "description": "Optional timeout in seconds (default: 30)"
                }
            },
            "required": ["command"]
        })
    }

    async fn execute(&self, call: ToolCall, workspace: &PathBuf) -> Result<String> {
        let command = call.arguments.get("command")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Missing 'command' argument"))?
            .to_string();

        let timeout_secs = call.arguments.get("timeout")
            .and_then(|v| v.as_u64())
            .unwrap_or(self.timeout_secs);

        // Security: reject dangerous commands
        let command_lower = command.to_lowercase();
        if command_lower.contains("sudo") 
            || command_lower.contains("rm -rf /")
            || command_lower.contains(":(){:|:&};:")  // fork bomb
            || command_lower.contains("curl | sh")
            || command_lower.contains("wget | sh")
        {
            return Err(anyhow!("Rejected potentially dangerous command"));
        }

        let result = timeout(
            Duration::from_secs(timeout_secs),
            self.run_command(&command, workspace)
        ).await;

        match result {
            Ok(Ok(output)) => Ok(output),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(anyhow!("Command timed out after {} seconds", timeout_secs)),
        }
    }
}

impl BashTool {
    async fn run_command(&self, command: &str, workspace: &PathBuf) -> Result<String> {
        // Use bash -c for proper shell behavior
        let mut child = Command::new("bash")
            .args(["-c", command])
            .current_dir(workspace)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let mut stdout = String::new();
        let mut stderr = String::new();

        if let Some(mut out) = child.stdout.take() {
            out.read_to_string(&mut stdout).await?;
        }

        if let Some(mut err) = child.stderr.take() {
            err.read_to_string(&mut stderr).await?;
        }

        let status = child.wait().await?;

        let mut output = String::new();
        
        if !stdout.is_empty() {
            output.push_str("STDOUT:\n");
            output.push_str(&stdout);
        }
        
        if !stderr.is_empty() {
            if !output.is_empty() {
                output.push_str("\n");
            }
            output.push_str("STDERR:\n");
            output.push_str(&stderr);
        }

        if !status.success() {
            if !output.is_empty() {
                output.push_str("\n");
            }
            output.push_str(&format!("Exit code: {}", status.code().unwrap_or(-1)));
        }

        Ok(output)
    }
}