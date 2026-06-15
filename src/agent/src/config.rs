use std::path::PathBuf;
use anyhow::Result;

#[derive(Debug, Clone)]
pub struct Config {
    pub llm_provider: LlmProvider,
    pub ollama_url: String,
    pub openai_url: String,
    pub openai_api_key: String,
    pub default_model: String,
    pub host: String,
    pub port: u16,
    pub workspace: PathBuf,
    pub max_iterations: u32,
    pub max_tokens_per_step: u32,
    pub total_token_budget: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LlmProvider {
    Ollama,
    OpenAI,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            llm_provider: LlmProvider::Ollama,
            ollama_url: std::env::var("OLLAMA_URL")
                .unwrap_or_else(|_| "http://localhost:11434".to_string()),
            openai_url: std::env::var("OPENAI_URL")
                .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
            openai_api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
            default_model: std::env::var("DEFAULT_MODEL")
                .unwrap_or_else(|_| "gemma4:31b".to_string()),
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .unwrap_or(3001),
            workspace: std::env::var("WORKSPACE")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from(".")),
            max_iterations: std::env::var("MAX_ITERATIONS")
                .unwrap_or_else(|_| "50".to_string())
                .parse()
                .unwrap_or(50),
            max_tokens_per_step: std::env::var("MAX_TOKENS_PER_STEP")
                .unwrap_or_else(|_| "2048".to_string())
                .parse()
                .unwrap_or(2048),
            total_token_budget: std::env::var("TOTAL_TOKEN_BUDGET")
                .unwrap_or_else(|_| "100000".to_string())
                .parse()
                .unwrap_or(100000),
        }
    }
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();
        Ok(Config::default())
    }
}