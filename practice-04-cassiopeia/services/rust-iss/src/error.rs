use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("database operation failed: {0}")]
    Database(#[from] sqlx::Error),
    #[error("upstream request failed: {message}")]
    Upstream { code: String, message: String },
    #[error("invalid request: {0}")]
    Invalid(String),
    #[error("internal error: {0}")]
    Internal(String),
}

impl ApiError {
    pub fn code(&self) -> &str {
        match self {
            Self::Database(_) => "DATABASE_ERROR",
            Self::Upstream { code, .. } => code,
            Self::Invalid(_) => "INVALID_REQUEST",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let trace_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| format!("trace-{}", d.as_micros()))
            .unwrap_or_else(|_| "trace-unknown".into());
        let body = Json(json!({
            "ok": false,
            "error": { "code": self.code(), "message": self.to_string(), "trace_id": trace_id }
        }));
        // Contract requirement: clients always receive HTTP 200 and inspect ok=false.
        (StatusCode::OK, body).into_response()
    }
}
