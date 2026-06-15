use super::{LlmClient, LlmResponse, ToolCall, Usage};
use crate::streaming::{StreamEvent, StreamHandle};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const DEFAULT_MODEL: &str = "gemma4:31b";
const DEFAULT_URL: &str = "http://localhost:11434";

#[derive(Debug, Clone)]
pub struct OllamaClient {
    client: Client,
    url: String,
    model: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: i32,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
    #[serde(default)]
    tool_calls: Option<Vec<OllamaToolCall>>,
    #[serde(default)]
    total_duration: Option<u64>,
    #[serde(default)]
    eval_count: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct OllamaToolCall {
    #[serde(rename = "function")]
    function: OllamaToolFunction,
}

#[derive(Debug, Deserialize)]
struct OllamaToolFunction {
    name: String,
    arguments: serde_json::Value,
}

impl OllamaClient {
    pub fn new(url: Option<String>, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            url: url.unwrap_or_else(|| DEFAULT_URL.to_string()),
            model: model.unwrap_or_else(|| DEFAULT_MODEL.to_string()),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    fn build_messages(&self, system_prompt: &str, history: &[serde_json::Value]) -> Vec<OllamaMessage> {
        let mut messages = Vec::new();

        if !system_prompt.is_empty() {
            messages.push(OllamaMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            });
        }

        for msg in history {
            let role = msg.get("role")
                .and_then(|v| v.as_str())
                .unwrap_or("user");
            
            let content = if let Some(tool_calls) = msg.get("tool_calls") {
                // Convert tool calls to content format for Ollama
                serde_json::to_string(tool_calls).unwrap_or_default()
            } else {
                msg.get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            };

            messages.push(OllamaMessage {
                role: role.to_string(),
                content,
            });
        }

        messages
    }

    async fn stream_chat(&self, system_prompt: &str, messages: &[serde_json::Value], stream: &mut StreamHandle) -> Result<LlmResponse> {
        let url = format!("{}/api/chat", self.url);
        let msgs = self.build_messages(system_prompt, messages);

        let request = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": true,
            "options": {
                "temperature": 0.7,
                "num_predict": 2048,
            }
        });

        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| anyhow!("Ollama request failed: {}", e))?;

        let mut text_content = String::new();
        let mut tool_calls: Option<Vec<ToolCall>> = None;

        let mut stream_response = response.bytes_stream();
        
        while let Some(chunk) = stream_response.next().await {
            let chunk = chunk.map_err(|e| anyhow!("Stream error: {}", e))?;
            let chunk_str = String::from_utf8_lossy(&chunk);
            
            for line in chunk_str.lines() {
                if let Ok(parsed) = serde_json::from_str::<OllamaStreamChunk>(line) {
                    if let Some(content) = parsed.message.and_then(|m| m.content) {
                        text_content.push_str(&content);
                        stream.send(StreamEvent::text_delta(&content)).await?;
                    }
                    
                    // Handle tool calls from Ollama
                    if let Some(calls) = parsed.message.and_then(|m| m.tool_calls) {
                        let tc = calls.into_iter().map(|c| ToolCall {
                            id: uuid::Uuid::new_v4().to_string(),
                            name: c.function.name,
                            arguments: c.function.arguments,
                        }).collect();
                        tool_calls = Some(tc);
                    }
                }
            }
        }

        Ok(LlmResponse {
            content: if text_content.is_empty() { None } else { Some(text_content) },
            tool_calls,
            finish_reason: Some("stop".to_string()),
            usage: None,
        })
    }

    async fn complete_chat(&self, system_prompt: &str, messages: &[serde_json::Value]) -> Result<LlmResponse> {
        let url = format!("{}/api/chat", self.url);
        let msgs = self.build_messages(system_prompt, messages);

        let request = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": false,
            "options": {
                "temperature": 0.7,
                "num_predict": 2048,
            }
        });

        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| anyhow!("Ollama request failed: {}", e))?;

        let parsed: OllamaResponse = response.json().await
            .map_err(|e| anyhow!("Failed to parse Ollama response: {}", e))?;

        let tool_calls = parsed.tool_calls.map(|calls| {
            calls.into_iter().map(|c| ToolCall {
                id: uuid::Uuid::new_v4().to_string(),
                name: c.function.name,
                arguments: c.function.arguments,
            }).collect()
        });

        Ok(LlmResponse {
            content: Some(parsed.response),
            tool_calls,
            finish_reason: if parsed.done { Some("stop".to_string()) } else { None },
            usage: parsed.total_duration.map(|_| Usage {
                prompt_tokens: 0,
                completion_tokens: parsed.eval_count.unwrap_or(0) as u32,
                total_tokens: 0,
            }),
        })
    }
}

#[derive(Debug, Deserialize)]
struct OllamaStreamChunk {
    message: Option<OllamaStreamMessage>,
}

#[derive(Debug, Deserialize)]
struct OllamaStreamMessage {
    content: Option<String>,
    tool_calls: Option<Vec<OllamaToolCall>>,
}

#[async_trait]
impl LlmClient for OllamaClient {
    async fn complete_text(&self, prompt: &str, messages: &[serde_json::Value]) -> Result<String> {
        let response = self.complete_chat(prompt, messages).await?;
        response.content.ok_or_else(|| anyhow!("No content in response"))
    }

    async fn complete_stream(
        &self,
        system_prompt: &str,
        messages: &[serde_json::Value],
        stream: &mut StreamHandle,
    ) -> Result<LlmResponse> {
        self.stream_chat(system_prompt, messages, stream).await
    }
}