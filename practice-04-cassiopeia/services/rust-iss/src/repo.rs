use crate::config::Settings;
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{
    pool::PoolConnection,
    postgres::{PgPoolOptions, Postgres},
    PgPool, Row,
};

#[derive(Clone)]
pub struct Repositories {
    pub pool: PgPool,
}

impl Repositories {
    pub async fn connect(settings: &Settings) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(&settings.database_url)
            .await?;
        Ok(Self { pool })
    }
    pub async fn migrate(&self) -> anyhow::Result<()> {
        sqlx::query(include_str!("../migrations/001_init.sql"))
            .execute(&self.pool)
            .await?;
        Ok(())
    }
    pub async fn try_job_lock(
        &self,
        key: i64,
    ) -> Result<Option<PoolConnection<Postgres>>, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;
        let locked: bool = sqlx::query_scalar("SELECT pg_try_advisory_lock($1)")
            .bind(key)
            .fetch_one(&mut *conn)
            .await?;
        Ok(locked.then_some(conn))
    }
    pub async fn release_job_lock(
        &self,
        mut conn: PoolConnection<Postgres>,
        key: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT pg_advisory_unlock($1)")
            .bind(key)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
    pub async fn insert_iss(&self, source_url: &str, payload: Value) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO iss_fetch_log(source_url,payload) VALUES($1,$2)")
            .bind(source_url)
            .bind(payload)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
    pub async fn latest_iss(&self) -> Result<Option<Value>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id,fetched_at,source_url,payload FROM iss_fetch_log ORDER BY id DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|r| serde_json::json!({"id":r.get::<i64,_>("id"),"fetched_at":r.get::<DateTime<Utc>,_>("fetched_at"),"source_url":r.get::<String,_>("source_url"),"payload":r.get::<Value,_>("payload")})))
    }
    pub async fn trend_rows(&self) -> Result<Vec<(DateTime<Utc>, Value)>, sqlx::Error> {
        let rows =
            sqlx::query("SELECT fetched_at,payload FROM iss_fetch_log ORDER BY id DESC LIMIT 2")
                .fetch_all(&self.pool)
                .await?;
        Ok(rows
            .into_iter()
            .map(|r| (r.get("fetched_at"), r.get("payload")))
            .collect())
    }
    pub async fn upsert_osdr(&self, items: Vec<Value>) -> Result<usize, sqlx::Error> {
        let mut written = 0;
        for item in items {
            let dataset_id = pick_text(
                &item,
                &[
                    "dataset_id",
                    "id",
                    "uuid",
                    "studyId",
                    "accession",
                    "osdr_id",
                ],
            );
            let title = pick_text(&item, &["title", "name", "label"]);
            let status = pick_text(&item, &["status", "state", "lifecycle"]);
            let updated_at = pick_time(
                &item,
                &[
                    "updated",
                    "updated_at",
                    "modified",
                    "lastUpdated",
                    "timestamp",
                ],
            );
            sqlx::query("INSERT INTO osdr_items(dataset_id,title,status,updated_at,raw) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dataset_id) DO UPDATE SET title=EXCLUDED.title,status=EXCLUDED.status,updated_at=EXCLUDED.updated_at,raw=EXCLUDED.raw")
                .bind(dataset_id).bind(title).bind(status).bind(updated_at).bind(item).execute(&self.pool).await?;
            written += 1;
        }
        Ok(written)
    }
    pub async fn list_osdr(&self, limit: i64) -> Result<Vec<Value>, sqlx::Error> {
        let rows = sqlx::query("SELECT id,dataset_id,title,status,updated_at,inserted_at,raw FROM osdr_items ORDER BY inserted_at DESC LIMIT $1").bind(limit).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| serde_json::json!({"id":r.get::<i64,_>("id"),"dataset_id":r.get::<Option<String>,_>("dataset_id"),"title":r.get::<Option<String>,_>("title"),"status":r.get::<Option<String>,_>("status"),"updated_at":r.get::<Option<DateTime<Utc>>,_>("updated_at"),"inserted_at":r.get::<DateTime<Utc>,_>("inserted_at"),"raw":r.get::<Value,_>("raw")})).collect())
    }
    pub async fn write_cache(&self, source: &str, payload: Value) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO space_cache(source,payload) VALUES($1,$2)")
            .bind(source)
            .bind(payload)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
    pub async fn latest_cache(&self, source: &str) -> Result<Option<Value>, sqlx::Error> {
        Ok(sqlx::query("SELECT fetched_at,payload FROM space_cache WHERE source=$1 ORDER BY id DESC LIMIT 1").bind(source).fetch_optional(&self.pool).await?.map(|r| serde_json::json!({"at":r.get::<DateTime<Utc>,_>("fetched_at"),"payload":r.get::<Value,_>("payload")})))
    }
    pub async fn summary(&self) -> Result<Value, sqlx::Error> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM osdr_items")
            .fetch_one(&self.pool)
            .await?;
        let mut result = serde_json::Map::new();
        for source in ["apod", "neo", "flr", "cme", "spacex"] {
            result.insert(
                source.into(),
                self.latest_cache(source)
                    .await?
                    .unwrap_or_else(|| serde_json::json!({})),
            );
        }
        result.insert(
            "iss".into(),
            self.latest_iss()
                .await?
                .unwrap_or_else(|| serde_json::json!({})),
        );
        result.insert("osdr_count".into(), count.into());
        Ok(Value::Object(result))
    }
}
fn pick_text(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|v| {
            v.as_str()
                .map(str::to_owned)
                .or_else(|| v.as_i64().map(|n| n.to_string()))
        })
    })
}
fn pick_time(value: &Value, keys: &[&str]) -> Option<DateTime<Utc>> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(crate::domain::parse_timestamp))
}
