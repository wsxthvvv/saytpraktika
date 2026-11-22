ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS stock INTEGER,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warranty TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_time TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx ON products(sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON products(slug) WHERE slug IS NOT NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number BIGSERIAL,
  ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique_idx
  ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_allowed_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_allowed_check CHECK (status IN (
  'pending', 'confirmed', 'awaiting_payment', 'paid', 'assembling', 'shipped',
  'completed', 'cancelled_customer', 'cancelled_admin', 'processing', 'cancelled'
));

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS sku TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(12, 2);
UPDATE order_items SET line_total = price * quantity WHERE line_total IS NULL;
ALTER TABLE order_items ALTER COLUMN line_total SET NOT NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_status_allowed_check;
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS moderation_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS moderated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE reviews ADD CONSTRAINT reviews_status_allowed_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'hidden', 'deleted'));

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON order_status_history(order_id, created_at);
INSERT INTO order_status_history(order_id,previous_status,new_status,reason,created_at)
SELECT o.id,NULL,o.status,'История заказов перенесена при обновлении базы',o.created_at
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id=o.id);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_number BIGSERIAL,
  ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notification_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_error TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS leads_number_unique_idx ON leads(lead_number);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE (entity_type, entity_id)
);
ALTER TABLE notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_status_check;
ALTER TABLE notification_outbox ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'failed'));
UPDATE notification_outbox SET status='pending' WHERE status='sending';
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx ON notification_outbox(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS crypto_cache (
  asset_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  price_usd NUMERIC(24, 8),
  change_24h NUMERIC(12, 6),
  market_cap NUMERIC(24, 2),
  volume_24h NUMERIC(24, 2),
  fetched_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_request_log (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_request_log_request_idx ON api_request_log(request_id);
CREATE INDEX IF NOT EXISTS api_request_log_created_idx ON api_request_log(created_at DESC);

INSERT INTO site_settings(key, value) VALUES
  ('contacts', '{"telegramUrl":"","maxUrl":"","email":""}'::jsonb),
  ('delivery', '{"zones":[],"freeFrom":null,"currency":"USD","note":"Стоимость и сроки доставки подтверждаются менеджером."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- The original sample computer products had invented specifications and are not approved offers.
UPDATE products SET is_active = FALSE, updated_at = NOW()
WHERE id IN ('product-1', 'product-2', 'product-3') AND sku IS NULL;

-- Remove legacy ruble-denominated sample service tariffs from public settings.
-- Service prices are agreed with the customer and are not equipment prices.

