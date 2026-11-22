try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch {
  /* optional */
}

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL не задан. Укажите PostgreSQL в .env');
}

const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const bootstrapSchema = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  name TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  patronymic TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  lead_number BIGSERIAL UNIQUE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'lead',
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  delivery_date TEXT NOT NULL DEFAULT '',
  delivery_time TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  total NUMERIC(12, 2),
  items_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  delivery_date TEXT NOT NULL DEFAULT '',
  delivery_time TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  delivery_zone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, order_id, product_id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL DEFAULT '',
  image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON reviews(status, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  request_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
`;

const query = (text, values) => pool.query(text, values);

const hashToken = (token) => require('crypto').createHash('sha256').update(token).digest('hex');

const initDb = async () => {
  await query(bootstrapSchema);
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrations = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
  for (const migration of migrations) {
    const applied = await query('SELECT 1 FROM schema_migrations WHERE version=$1', [migration]);
    if (applied.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(migrationsDir, migration), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [migration]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  const username = process.env.ADMIN_USERNAME || 'admin';
  // Compose interprets `$` in .env values; accepting `$$` keeps bcrypt hashes intact in Docker.
  const passwordHash = String(process.env.ADMIN_PASSWORD_HASH || '').replace(/\$\$/g, '$');
  const email = `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'admin'}@local.admin`;
  if (passwordHash) {
    const cost = /^\$2[aby]\$(\d\d)\$/.exec(passwordHash);
    if (!cost || Number(cost[1]) < 12) throw new Error('ADMIN_PASSWORD_HASH должен быть bcrypt-хешем с cost не ниже 12');
    await query(
      `INSERT INTO users (username, email, password_hash, role, name, first_name)
       VALUES ($1, $2, $3, 'admin', 'Администратор', 'Администратор')
       ON CONFLICT (username) DO UPDATE SET role = 'admin', updated_at = NOW()`,
      [username, email, passwordHash],
    );
  } else {
    const existingAdmin = await query('SELECT 1 FROM users WHERE username=$1 AND role=\'admin\'', [username]);
    if (!existingAdmin.rowCount) throw new Error('Для первого запуска задайте ADMIN_PASSWORD_HASH');
  }
  await query('DELETE FROM sessions WHERE expires_at < NOW()');
};

const createSession = async (userId, days = 30) => {
  const token = require('crypto').randomBytes(32).toString('hex');
  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + ($3::int * INTERVAL \'1 day\'))',
    [userId, hashToken(token), days],
  );
  return token;
};

const findSessionUser = async (token) => {
  if (!token) return null;
  const result = await query(
    `SELECT u.id, u.username, u.email, u.role, u.name, u.first_name AS "firstName",
            u.last_name AS "lastName", u.patronymic, u.phone, u.address
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_active = TRUE` ,
    [hashToken(token)],
  );
  return result.rows[0] || null;
};

module.exports = {
  pool,
  query,
  initDb,
  createSession,
  findSessionUser,
  hashToken,
};
