mod clients;
mod config;
mod domain;
mod error;
mod handlers;
mod jobs;
mod repo;
mod routes;
mod state;

use anyhow::Context;
use config::Settings;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()))
        .init();
    let settings = Settings::from_env()?;
    let repo = repo::Repositories::connect(&settings)
        .await
        .context("connect PostgreSQL")?;
    repo.migrate().await.context("run migrations")?;
    let clients =
        clients::ExternalClients::new(settings.clone()).context("configure HTTP client")?;
    let state = AppState {
        repo,
        clients,
        settings: settings.clone(),
    };
    jobs::spawn(state.clone());
    let listener = tokio::net::TcpListener::bind(settings.bind_addr).await?;
    tracing::info!(addr=%settings.bind_addr, "rust_iss listening");
    axum::serve(listener, routes::router(state)).await?;
    Ok(())
}
