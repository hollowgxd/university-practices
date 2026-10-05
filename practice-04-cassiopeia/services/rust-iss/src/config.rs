use std::{env, net::SocketAddr, time::Duration};

use anyhow::{Context, Result};

#[derive(Clone, Debug)]
pub struct Settings {
    pub bind_addr: SocketAddr,
    pub database_url: String,
    pub nasa_osdr_url: String,
    pub nasa_api_url: String,
    pub nasa_api_key: Option<String>,
    pub where_iss_url: String,
    pub fetch_every_seconds: u64,
    pub iss_every_seconds: u64,
    pub apod_every_seconds: u64,
    pub neo_every_seconds: u64,
    pub donki_every_seconds: u64,
    pub spacex_every_seconds: u64,
    pub http_timeout: Duration,
    pub retries: usize,
}

impl Settings {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();
        let database_url = env::var("DATABASE_URL").context("DATABASE_URL is required")?;
        let port = env_u16("PORT", 3000);
        Ok(Self {
            bind_addr: ([0, 0, 0, 0], port).into(),
            database_url,
            nasa_osdr_url: env_string(
                "NASA_API_URL",
                "https://visualization.osdr.nasa.gov/biodata/api/v2/datasets/?format=json",
            ),
            nasa_api_url: env_string("NASA_BASE_URL", "https://api.nasa.gov"),
            nasa_api_key: env::var("NASA_API_KEY")
                .ok()
                .filter(|v| !v.trim().is_empty()),
            where_iss_url: env_string(
                "WHERE_ISS_URL",
                "https://api.wheretheiss.at/v1/satellites/25544",
            ),
            fetch_every_seconds: env_u64("FETCH_EVERY_SECONDS", 600),
            iss_every_seconds: env_u64("ISS_EVERY_SECONDS", 120),
            apod_every_seconds: env_u64("APOD_EVERY_SECONDS", 43_200),
            neo_every_seconds: env_u64("NEO_EVERY_SECONDS", 7_200),
            donki_every_seconds: env_u64("DONKI_EVERY_SECONDS", 3_600),
            spacex_every_seconds: env_u64("SPACEX_EVERY_SECONDS", 3_600),
            http_timeout: Duration::from_secs(env_u64("HTTP_TIMEOUT_SECONDS", 20)),
            retries: env_u64("HTTP_RETRIES", 2) as usize,
        })
    }
}

fn env_string(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}
fn env_u64(key: &str, default: u64) -> u64 {
    env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .filter(|v| *v > 0)
        .unwrap_or(default)
}
fn env_u16(key: &str, default: u16) -> u16 {
    env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .filter(|v| *v > 0)
        .unwrap_or(default)
}
