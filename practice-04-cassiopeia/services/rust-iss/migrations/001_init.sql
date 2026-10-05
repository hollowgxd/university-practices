CREATE TABLE IF NOT EXISTS iss_fetch_log (
  id BIGSERIAL PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_url TEXT NOT NULL,
  payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS osdr_items (
  id BIGSERIAL PRIMARY KEY,
  dataset_id TEXT UNIQUE,
  title TEXT,
  status TEXT,
  updated_at TIMESTAMPTZ,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS space_cache (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_space_cache_source ON space_cache(source, fetched_at DESC);
