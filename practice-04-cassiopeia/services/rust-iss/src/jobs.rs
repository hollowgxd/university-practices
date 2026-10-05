use crate::state::AppState;
use std::time::Duration;
use tracing::{error, info};

pub fn spawn(state: AppState) {
    spawn_job(
        state.clone(),
        701,
        state.settings.iss_every_seconds,
        "iss",
        move |st| {
            Box::pin(async move {
                let payload = st.clients.get_json(&st.settings.where_iss_url, &[]).await?;
                st.repo
                    .insert_iss(&st.settings.where_iss_url, payload)
                    .await?;
                Ok(())
            })
        },
    );
    spawn_job(
        state.clone(),
        702,
        state.settings.fetch_every_seconds,
        "osdr",
        move |st| {
            Box::pin(async move {
                let payload = st.clients.get_json(&st.settings.nasa_osdr_url, &[]).await?;
                let items = payload
                    .as_array()
                    .cloned()
                    .or_else(|| {
                        payload
                            .get("items")
                            .and_then(serde_json::Value::as_array)
                            .cloned()
                    })
                    .unwrap_or_else(|| vec![payload]);
                st.repo.upsert_osdr(items).await?;
                Ok(())
            })
        },
    );
}

fn spawn_job<F>(state: AppState, key: i64, every: u64, name: &'static str, task: F)
where
    F: Fn(AppState) -> futures_util::future::BoxFuture<'static, Result<(), crate::error::ApiError>>
        + Send
        + Sync
        + 'static,
{
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(every));
        loop {
            tick.tick().await;
            match state.repo.try_job_lock(key).await {
                Ok(Some(lock)) => {
                    if let Err(e) = task(state.clone()).await {
                        error!(job=name, error=%e, "scheduled job failed");
                    }
                    let _ = state.repo.release_job_lock(lock, key).await;
                }
                Ok(None) => info!(job = name, "skipped overlapping run"),
                Err(e) => error!(job=name, error=%e, "lock check failed"),
            }
        }
    });
}
