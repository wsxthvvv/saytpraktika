ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  legacy_id INTEGER,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'it-services',
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at DATE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts(category, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(is_published, published_at DESC);