mod agent;
mod config;
mod llm;
mod streaming;
mod tools;

use agent::{AgentRunner, AgentState, Role, Turn};
use anyhow::Result;
use axum::{
    body::Body,
    extract::{Query, State},
    http::{Method, StatusCode},
    middleware, response::sse, Json, Router,
};
use config::Config;
use llm::{LlmClient, OllamaClient, OpenAIClient};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use streaming::{encode_sse_event, StreamEvent};
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
struct ChatRequest {
    message: String,
    #[serde(default)]
    session_id: Option<Uuid>,
    #[serde(default)]
    workspace: Option<String>,
}

#[derive(Debug, Serialize)]
struct ChatResponse {
    session_id: Uuid,
    message: String,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    version: String,
}

#[derive(Clone)]
struct AppState {
    config: Config,
    llm: Arc<dyn LlmClient>,
}

async fn chat_handler(
    State(state): State<AppState>,
    Json(request): Json<ChatRequest>,
) -> sse::Sse<Body> {
    let session_id = request.session_id.unwrap_or_else(Uuid::new_v4);
    let workspace = request.workspace
        .map(PathBuf::from)
        .unwrap_or_else(|| state.config.workspace.clone());
    let message = request.message.clone();

    let (tx, rx) = mpsc::channel(100);
    let (stream_handle, stream_rx) = streaming::create_stream_channel();

    // Spawn the agent loop
    let llm = state.llm.clone();
    let max_iterations = state.config.max_iterations;
    let max_tokens = state.config.max_tokens;

    tokio::spawn(async move {
        let mut agent_state = AgentState::new(session_id, workspace, max_iterations, max_tokens);
        let mut runner = AgentRunner::new(agent_state, llm.clone());
        
        agent_state.add_turn(Turn::user(message));
        
        let result = runner.run(&message, llm, stream_handle).await;
        if let Err(e) = result {
            let _ = tx.send(Ok::<_, std::convert::Infallible>(
                axum::response::sse::Event::default()
                    .data(encode_sse_event(&StreamEvent::error(&e.to_string())))
            )).await;
        }
        
        let _ = tx.send(Ok(axum::response::sse::Event::default()
            .data(encode_sse_event(&StreamEvent::done("stop"))))).await;
    });

    sse::Sse::new(streaming::write_sse_stream_to_body(stream_rx))
        .keep_alive(
            axum::response::sse::KeepAlive::default()
                .interval(std::time::Duration::from_secs(5))
                .text("keep-alive"),
        )
}

async fn write_sse_stream_to_body(
    mut rx: mpsc::Receiver<StreamEvent>,
) -> impl futures::Stream<Item = Result<sse::Event, std::convert::Infallible>> + Send {
    async_stream::try_stream! {
        while let Some(event) = rx.recv().await {
            yield sse::Event::default().data(encode_sse_event(&event));
        }
    }
}

async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any)
        .expose_headers(Any);

    Router::new()
        .route("/api/agent/chat", axum::routing::post(chat_handler))
        .route("/api/agent/health", axum::routing::get(health_handler))
        .layer(cors)
        .with_state(state)
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "rust_agent=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = Config::from_env()?;
    
    info!("Starting Rust Agent server");
    info!("LLM Provider: {:?}", config.llm_provider);
    info!("Ollama URL: {}", config.ollama_url);
    info!("Default Model: {}", config.default_model);
    info!("Listening on {}:{}", config.host, config.port);

    // Create LLM client
    let llm: Arc<dyn LlmClient> = match config.llm_provider {
        config::LlmProvider::Ollama => Arc::new(
            OllamaClient::new(Some(config.ollama_url.clone()), Some(config.default_model.clone()))
        ),
        config::LlmProvider::OpenAI => Arc::new(
            OpenAIClient::new(
                Some(config.openai_url.clone()),
                Some(config.openai_api_key.clone()),
                Some(config.default_model.clone()),
            )
        ),
    };

    let state = AppState { config, llm };

    let app = create_router(state);

    let addr: SocketAddr = format!("{}:{}", state.config.host, state.config.port)
        .parse()?;
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    use tokio::signal;
    
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Shutting down gracefully...");
}