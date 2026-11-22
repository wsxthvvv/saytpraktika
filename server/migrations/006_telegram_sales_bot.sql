CREATE TABLE IF NOT EXISTS telegram_bot_chats (
  chat_id BIGINT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_bot_runtime (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO telegram_bot_runtime(key, value)
VALUES ('last_update_id', '0')
ON CONFLICT (key) DO NOTHING;

UPDATE site_settings
SET value = value || '{"telegramBotUrl":""}'::jsonb
WHERE key = 'contacts' AND NOT (value ? 'telegramBotUrl');
