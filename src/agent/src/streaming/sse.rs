use anyhow::Result;
use futures::FutureExt;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub enum StreamEvent {
    TextDelta(String),
    ToolCallStart {
        tool_call_id: String,
        tool_name: String,
        args_text: String,
    },
    ToolCallDelta {
        tool_call_id: String,
        content: String,
    },
    ToolCallResult {
        tool_call_id: String,
        result: String,
    },
    Done {
        finish_reason: String,
        usage: Option<Usage>,
    },
    Error(String),
}

#[derive(Debug, Clone)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

impl StreamEvent {
    pub fn text_delta(text: &str) -> Self {
        Self::TextDelta(text.to_string())
    }

    pub fn tool_call_start(tool_call_id: &str, tool_name: &str, args_text: &str) -> Self {
        Self::ToolCallStart {
            tool_call_id: tool_call_id.to_string(),
            tool_name: tool_name.to_string(),
            args_text: args_text.to_string(),
        }
    }

    pub fn tool_call_delta(tool_call_id: &str, content: &str) -> Self {
        Self::ToolCallDelta {
            tool_call_id: tool_call_id.to_string(),
            content: content.to_string(),
        }
    }

    pub fn tool_call_result(tool_call_id: &str, result: &str) -> Self {
        Self::ToolCallResult {
            tool_call_id: tool_call_id.to_string(),
            result: result.to_string(),
        }
    }

    pub fn done(finish_reason: &str) -> Self {
        Self::Done {
            finish_reason: finish_reason.to_string(),
            usage: None,
        }
    }

    pub fn error(message: &str) -> Self {
        Self::Error(message.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct StreamHandle {
    tx: mpsc::Sender<StreamEvent>,
}

impl StreamHandle {
    pub fn new(tx: mpsc::Sender<StreamEvent>) -> Self {
        Self { tx }
    }

    pub async fn send(&mut self, event: StreamEvent) -> Result<()> {
        self.tx.send(event).await?;
        Ok(())
    }
}

/// Encode an SSE event for the Vercel AI SDK protocol
pub fn encode_sse_event(event: &StreamEvent) -> String {
    match event {
        StreamEvent::TextDelta(text) => {
            format!("0:{}\n\n", escape_sse_text(text))
        }
        StreamEvent::ToolCallStart { tool_call_id, tool_name, args_text } => {
            let json = serde_json::json!({
                "toolCallId": tool_call_id,
                "toolName": tool_name,
                "argsTextDelta": args_text,
            });
            format!("b:{}\n\n", serde_json::to_string(&json).unwrap_or_default())
        }
        StreamEvent::ToolCallDelta { tool_call_id, content } => {
            let json = serde_json::json!({
                "toolCallId": tool_call_id,
                "argsTextDelta": content,
            });
            format!("b:{}\n\n", serde_json::to_string(&json).unwrap_or_default())
        }
        StreamEvent::ToolCallResult { tool_call_id, result } => {
            let json = serde_json::json!({
                "toolCallId": tool_call_id,
                "result": result,
            });
            format!("a:{}\n\n", serde_json::to_string(&json).unwrap_or_default())
        }
        StreamEvent::Done { finish_reason, usage } => {
            let usage_json = usage.map(|u| {
                serde_json::json!({
                    "promptTokens": u.prompt_tokens,
                    "completionTokens": u.completion_tokens,
                    "totalTokens": u.total_tokens,
                })
            });
            let json = serde_json::json!({
                "finishReason": finish_reason,
                "usage": usage_json,
            });
            format!("d:{}\n\n", serde_json::to_string(&json).unwrap_or_default())
        }
        StreamEvent::Error(message) => {
            let json = serde_json::json!({
                "type": "error",
                "message": message,
            });
            format!("e:{}\n\n", serde_json::to_string(&json).unwrap_or_default())
        }
    }
}

fn escape_sse_text(text: &str) -> String {
    // Escape newlines and carriage returns for SSE compliance
    text.replace('\n', "\\n").replace('\r', "\\r")
}

/// Create a streaming response by writing SSE events to a writer
pub async fn write_sse_stream<W: tokio::io::AsyncWrite + Unpin>(
    writer: &mut W,
    mut rx: mpsc::Receiver<StreamEvent>,
) -> Result<()> {
    while let Some(event) = rx.recv().await {
        let encoded = encode_sse_event(&event);
        writer.write_all(encoded.as_bytes()).await?;
        writer.flush().await?;
    }
    Ok(())
}

/// Create a channel-based stream handle for use in agent loops
pub fn create_stream_channel() -> (StreamHandle, mpsc::Receiver<StreamEvent>) {
    let (tx, rx) = mpsc::channel(100);
    (StreamHandle::new(tx), rx)
}