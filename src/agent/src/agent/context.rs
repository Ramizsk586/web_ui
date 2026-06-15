use anyhow::Result;

pub struct ContextManager {
    max_context_tokens: u32,
    current_tokens: u32,
}

impl ContextManager {
    pub fn new() -> Self {
        Self {
            max_context_tokens: 128_000,
            current_tokens: 0,
        }
    }

    pub fn with_max_tokens(mut self, max: u32) -> Self {
        self.max_context_tokens = max;
        self
    }

    pub fn estimate_tokens(&self, text: &str) -> u32 {
        // Rough estimation: ~4 chars per token for English
        (text.len() as u32) / 4
    }

    pub fn can_fit(&self, text: &str) -> bool {
        self.current_tokens + self.estimate_tokens(text) <= self.max_context_tokens
    }

    pub fn add(&mut self, text: &str) {
        self.current_tokens += self.estimate_tokens(text);
    }

    pub fn reset(&mut self) {
        self.current_tokens = 0;
    }

    pub fn truncate_if_needed(&self, text: &str) -> String {
        let text_tokens = self.estimate_tokens(text);
        if self.current_tokens + text_tokens <= self.max_context_tokens {
            return text.to_string();
        }

        // Truncate to fit
        let available = self.max_context_tokens.saturating_sub(self.current_tokens);
        let chars_to_keep = (available * 4) as usize;
        
        if chars_to_keep >= text.len() {
            text.to_string()
        } else {
            format!("{}...[truncated]", &text[..chars_to_keep])
        }
    }

    pub fn current(&self) -> u32 {
        self.current_tokens
    }

    pub fn remaining(&self) -> u32 {
        self.max_context_tokens.saturating_sub(self.current_tokens)
    }
}

impl Default for ContextManager {
    fn default() -> Self {
        Self::new()
    }
}