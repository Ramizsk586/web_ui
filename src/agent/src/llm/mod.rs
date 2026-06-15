pub mod ollama;
pub mod openai;

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub use ollama::OllamaClient;
pub use openai::OpenAIClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmResponse {
    pub content: Option<String>,
    pub tool_calls: Option<Vec<ToolCall>>,
    pub finish_reason: Option<String>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[async_trait]
pub trait LlmClient: Send + Sync {
    async fn complete_text(&self, prompt: &str, messages: &[serde_json::Value]) -> Result<String>;
    
    async fn complete_stream(
        &self,
        system_prompt: &str,
        messages: &[serde_json::Value],
        stream: &mut super::streaming::StreamHandle,
    ) -> Result<LlmResponse>;
}

#[derive(Debug, Clone)]
pub struct LlmProviderConfig {
    pub provider: ProviderType,
    pub url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Clone, Copy)]
pub enum ProviderType {
    Ollama,
    OpenAI,
}