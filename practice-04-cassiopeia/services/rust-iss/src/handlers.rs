use crate::{
    domain::{haversine_km, number, Trend},
    error::ApiError,
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Utc;
use serde_json::{json, Value};
use std::collections::HashMap;

pub async fn health() -> Result<Json<Value>, ApiError> {
    Ok(Json(json!({"status":"ok", "now": Utc::now()})))
}

pub async fn last_iss(State(st): State<AppState>) -> Result<Json<Value>, ApiError> {
    Ok(Json(
        st.repo
            .latest_iss()
            .await?
            .unwrap_or_else(|| json!({"message":"no data"})),
    ))
}

pub async fn trigger_iss(State(st): State<AppState>) -> Result<Json<Value>, ApiError> {
    let payload = st.clients.get_json(&st.settings.where_iss_url, &[]).await?;
    st.repo
        .insert_iss(&st.settings.where_iss_url, payload)
        .await?;
    last_iss(State(st)).await
}

pub async fn iss_trend(State(st): State<AppState>) -> Result<Json<Trend>, ApiError> {
    let rows = st.repo.trend_rows().await?;
    if rows.len() < 2 {
        return Ok(Json(Trend::empty()));
    }
    let (t2, p2) = &rows[0];
    let (t1, p1) = &rows[1];
    let lat1 = number(&p1["latitude"]);
    let lon1 = number(&p1["longitude"]);
    let lat2 = number(&p2["latitude"]);
    let lon2 = number(&p2["longitude"]);
    let delta_km = match (lat1, lon1, lat2, lon2) {
        (Some(a), Some(b), Some(c), Some(d)) => haversine_km(a, b, c, d),
        _ => 0.0,
    };
    let dt_sec = (*t2 - *t1).num_milliseconds() as f64 / 1000.0;
    Ok(Json(Trend {
        movement: delta_km > 0.1,
        delta_km,
        dt_sec,
        velocity_kmh: number(&p2["velocity"]),
        from_time: Some(*t1),
        to_time: Some(*t2),
        from_lat: lat1,
        from_lon: lon1,
        to_lat: lat2,
        to_lon: lon2,
    }))
}

pub async fn osdr_sync(State(st): State<AppState>) -> Result<Json<Value>, ApiError> {
    let payload = st.clients.get_json(&st.settings.nasa_osdr_url, &[]).await?;
    let items = payload
        .as_array()
        .cloned()
        .or_else(|| payload.get("items").and_then(Value::as_array).cloned())
        .or_else(|| payload.get("results").and_then(Value::as_array).cloned())
        .unwrap_or_else(|| vec![payload]);
    let written = st.repo.upsert_osdr(items).await?;
    Ok(Json(json!({"written": written})))
}

pub async fn osdr_list(State(st): State<AppState>) -> Result<Json<Value>, ApiError> {
    Ok(Json(json!({"items": st.repo.list_osdr(20).await?})))
}

pub async fn space_latest(
    Path(src): Path<String>,
    State(st): State<AppState>,
) -> Result<Json<Value>, ApiError> {
    if !allowed_source(&src) {
        return Err(ApiError::Invalid("unknown space source".into()));
    }
    Ok(Json(
        st.repo
            .latest_cache(&src)
            .await?
            .map(|v| json!({"source":src,"data":v}))
            .unwrap_or_else(|| json!({"source":src,"message":"no data"})),
    ))
}

pub async fn space_refresh(
    Query(q): Query<HashMap<String, String>>,
    State(st): State<AppState>,
) -> Result<Json<Value>, ApiError> {
    let requested = q
        .get("src")
        .map(String::as_str)
        .unwrap_or("apod,neo,flr,cme,spacex");
    let mut refreshed = Vec::new();
    for source in requested
        .split(',')
        .map(str::trim)
        .filter(|s| allowed_source(s))
    {
        let url = match source {
            "apod" => format!("{}/planetary/apod", st.settings.nasa_api_url),
            "neo" => format!("{}/neo/rest/v1/feed", st.settings.nasa_api_url),
            "flr" => format!("{}/DONKI/FLR", st.settings.nasa_api_url),
            "cme" => format!("{}/DONKI/CME", st.settings.nasa_api_url),
            "spacex" => "https://api.spacexdata.com/v4/launches/next".into(),
            _ => continue,
        };
        let payload = st.clients.get_json(&url, &api_query(&st, source)).await?;
        st.repo.write_cache(source, payload).await?;
        refreshed.push(source);
    }
    Ok(Json(json!({"refreshed": refreshed})))
}

pub async fn space_summary(State(st): State<AppState>) -> Result<Json<Value>, ApiError> {
    Ok(Json(st.repo.summary().await?))
}

fn allowed_source(src: &str) -> bool {
    matches!(src, "apod" | "neo" | "flr" | "cme" | "spacex")
}
fn api_query(st: &AppState, source: &str) -> Vec<(&'static str, String)> {
    let mut q = Vec::new();
    if let Some(key) = &st.settings.nasa_api_key {
        q.push(("api_key", key.clone()));
    }
    if matches!(source, "neo" | "flr" | "cme") {
        let today = Utc::now().date_naive();
        q.push(("startDate", (today - chrono::Days::new(2)).to_string()));
        q.push(("endDate", today.to_string()));
    }
    q
}
