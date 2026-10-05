use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
pub struct Trend {
    pub movement: bool,
    pub delta_km: f64,
    pub dt_sec: f64,
    pub velocity_kmh: Option<f64>,
    pub from_time: Option<DateTime<Utc>>,
    pub to_time: Option<DateTime<Utc>>,
    pub from_lat: Option<f64>,
    pub from_lon: Option<f64>,
    pub to_lat: Option<f64>,
    pub to_lon: Option<f64>,
}

pub fn number(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|v| v.parse().ok()))
}

pub fn parse_timestamp(value: &Value) -> Option<DateTime<Utc>> {
    if let Some(text) = value.as_str() {
        if let Ok(timestamp) = text.parse() {
            return Some(timestamp);
        }
        if let Ok(naive) = NaiveDateTime::parse_from_str(text, "%Y-%m-%d %H:%M:%S") {
            return Some(Utc.from_utc_datetime(&naive));
        }
    }
    value
        .as_i64()
        .and_then(|seconds| Utc.timestamp_opt(seconds, 0).single())
}

pub fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let (lat1_rad, lat2_rad) = (lat1.to_radians(), lat2.to_radians());
    let dlon = (lon2 - lon1).to_radians() / 2.0;
    let dlat = (lat2_rad - lat1_rad) / 2.0;
    let a = dlat.sin().powi(2) + lat1_rad.cos() * lat2_rad.cos() * dlon.sin().powi(2);
    6_371.0 * 2.0 * a.sqrt().atan2((1.0 - a).sqrt())
}

impl Trend {
    pub fn empty() -> Self {
        Self {
            movement: false,
            delta_km: 0.0,
            dt_sec: 0.0,
            velocity_kmh: None,
            from_time: None,
            to_time: None,
            from_lat: None,
            from_lon: None,
            to_lat: None,
            to_lon: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn distance_is_reasonable() {
        assert!((haversine_km(0.0, 0.0, 0.0, 1.0) - 111.19).abs() < 0.5);
    }
    #[test]
    fn parses_rfc3339() {
        assert!(parse_timestamp(&Value::String("2025-01-01T00:00:00Z".into())).is_some());
    }
}
