try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch {
  /* optional */
}

const { Pool } = require('pg');

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

const schema = `
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
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
`;

const query = (text, values) => pool.query(text, values);

const hashToken = (token) => require('crypto').createHash('sha256').update(token).digest('hex');

const initDb = async () => {
  await query(schema);
  const username = process.env.ADMIN_USERNAME || 'admin';
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || '';
  const email = `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'admin'}@local.admin`;
  if (!passwordHash) throw new Error('ADMIN_PASSWORD_HASH не задан');
  await query(
    `INSERT INTO users (username, email, password_hash, role, name, first_name)
     VALUES ($1, $2, $3, 'admin', 'Администратор', 'Администратор')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', updated_at = NOW()`,
    [username, email, passwordHash],
  );
  const products = [
    {
      id: 'product-1', title: 'Офисный ПК', price: 431.35, description: '4 ядра, 8GB RAM, SSD',
      metadata: { badge: 'NEW', features: ['Для офиса и учебы', 'Тихая работа', 'Быстрый SSD'], longDescription: 'Надежный офисный компьютер для повседневных задач: документооборот, CRM, браузер, видеозвонки и работа с таблицами.', useCases: ['Подходит для бухгалтерии, отдела продаж и колл-центра'], includes: ['Системный блок', 'Кабель питания', 'Предустановленная ОС'], support: 'Гарантия 12 месяцев.' },
    },
    {
      id: 'product-2', title: 'Рабочая станция AI', price: 1541.76, description: '8 ядер, RTX3060',
      metadata: { badge: 'HOT', features: ['Для ML/AI задач', 'Высокая производительность', 'Готово к апгрейду'], longDescription: 'Производительная станция для разработки и обучения моделей машинного обучения, 3D-визуализации и рендеринга.', useCases: ['Обучение и тестирование нейросетей'], includes: ['Системный блок', 'Оптимизированные драйверы GPU'], support: 'Гарантия 18 месяцев.' },
    },
    {
      id: 'product-3', title: 'Сервер базовый', price: 1170.57, description: 'Xeon, 64GB RAM',
      metadata: { badge: 'SALE', features: ['Для 24/7 работы', 'Стабильная платформа', 'Серверная память'], longDescription: 'Базовый сервер для запуска внутренних сервисов компании, базы данных и корпоративных приложений.', useCases: ['Файловый сервер и резервное хранение данных'], includes: ['Серверный корпус', 'Настройка BIOS/RAID'], support: 'Гарантия 12 месяцев.' },
    },
  ];
  for (const product of products) {
    await query(
      `INSERT INTO products (id,title,category,price,currency,description,metadata)
       VALUES ($1,$2,'computer',$3,'USD',$4,$5)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, price=EXCLUDED.price, description=EXCLUDED.description, metadata=EXCLUDED.metadata, updated_at=NOW()`,
      [product.id, product.title, product.price, product.description, JSON.stringify(product.metadata)],
    );
  }
  const MINERS_CATALOG = require('./data/minersCatalog');
  for (const miner of MINERS_CATALOG) {
    const {
      id, title, price, description, image, ...metadata
    } = miner;
    await query(
      `INSERT INTO products (id,title,category,price,currency,description,image,metadata,is_active)
       VALUES ($1,$2,'miner',$3,'USD',$4,$5,$6,TRUE)
       ON CONFLICT (id) DO UPDATE SET
         category='miner', is_active=TRUE,
         title=EXCLUDED.title, price=EXCLUDED.price, description=EXCLUDED.description,
         image=EXCLUDED.image, metadata=EXCLUDED.metadata, updated_at=NOW()`,
      [String(id), title, price, description, image || null, JSON.stringify(metadata)],
    );
  }
  await query(
    `UPDATE products SET category='miner', is_active=TRUE
     WHERE id IN (SELECT id FROM products WHERE title ILIKE '%antminer%' OR id ~ '^[0-9]+$')`,
  );
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
      WHERE s.token_hash = $1 AND s.expires_at > NOW()` ,
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
