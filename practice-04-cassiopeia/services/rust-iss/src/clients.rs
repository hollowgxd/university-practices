use crate::{config::Settings, error::ApiError};
use reqwest::{Client, StatusCode};
use serde_json::Value;
use std::time::Duration;

#[derive(Clone)]
pub struct ExternalClients {
    http: Client,
    settings: Settings,
}

impl ExternalClients {
    pub fn new(settings: Settings) -> Result<Self, reqwest::Error> {
        let http = Client::builder()
            .timeout(settings.http_timeout)
            .user_agent("cassiopeia-rust-iss/0.2")
            .build()?;
        Ok(Self { http, settings })
    }

    pub async fn get_json(&self, url: &str, query: &[(&str, String)]) -> Result<Value, ApiError> {
        let mut last_message = String::from("request failed");
        for attempt in 0..=self.settings.retries {
            let result = self.http.get(url).query(query).send().await;
            match result {
                Ok(response) if response.status().is_success() => {
                    return response.json().await.map_err(|e| ApiError::Upstream {
                        code: "UPSTREAM_INVALID_JSON".into(),
                        message: e.to_string(),
                    });
                }
                Ok(response) => {
                    let status = response.status();
                    last_message = format!("upstream returned HTTP {status}");
                    if !is_retryable(status) {
                        break;
                    }
                }
                Err(error) => last_message = error.to_string(),
            }
            if attempt < self.settings.retries {
                tokio::time::sleep(Duration::from_millis(100 * 2u64.pow(attempt as u32))).await;
            }
        }
        Err(ApiError::Upstream {
            code: upstream_code(&last_message),
            message: last_message,
        })
    }

    pub fn settings(&self) -> &Settings {
        &self.settings
    }
}
fn is_retryable(status: StatusCode) -> bool {
    status == StatusCode::REQUEST_TIMEOUT
        || status == StatusCode::TOO_MANY_REQUESTS
        || status.is_server_error()
}
fn upstream_code(message: &str) -> String {
    message
        .split_whitespace()
        .find(|part| part.starts_with("HTTP"))
        .map(|v| format!("UPSTREAM_{}", v.trim_start_matches("HTTP")))
        .unwrap_or_else(|| "UPSTREAM_UNAVAILABLE".into())
}
