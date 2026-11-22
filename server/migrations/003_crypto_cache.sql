CREATE TABLE IF NOT EXISTS crypto_asset_cache (
  asset_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (asset_id, currency)
);

CREATE TABLE IF NOT EXISTS crypto_chart_cache (
  asset_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  days NUMERIC(8, 4) NOT NULL,
  prices JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (asset_id, currency, days)
);
