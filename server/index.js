const http = require('http');
const crypto = require('crypto');
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch {
  /* dotenv is installed in the project; keep the server readable if it is omitted in a deploy. */
}
const { fetchRbcCryptoNews } = require('./rbcCryptoFeed');
const { notifyLead } = require('./leadNotifications');
const { buildExists, isProductionStaticEnabled, tryServeStatic } = require('./serveStatic');
const { initDb, pool, query } = require('./db');
const {
  clearSession,
  createUserSession,
  getSessionUser,
  hashPassword,
  userSessionCookie,
  verifyPassword,
} = require('./auth');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map((value) => value.trim()).filter(Boolean);

const sendJson = (res, status, payload, headers = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(payload));
};

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 256 * 1024) {
      reject(new Error('Payload too large'));
      req.destroy();
    }
  });
  req.on('end', () => {
    if (!raw) return resolve({});
    try { return resolve(JSON.parse(raw)); } catch { return reject(new Error('Invalid JSON')); }
  });
  req.on('error', reject);
});

const setCors = (req, res) => {
  const origin = req.headers.origin;
  if (!origin) return;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const clip = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const normalizeEmail = (value) => clip(value, 180).toLowerCase();
const statusLabel = {
  new: 'Новая', processing: 'В работе', completed: 'Завершена', cancelled: 'Отменена',
  pending: 'Ожидание',
};
const toStatusCode = (value) => ({
  Новая: 'new', 'В работе': 'processing', Завершена: 'completed', Отменена: 'cancelled',
  Ожидание: 'pending',
}[value] || value);

const mapUser = (row) => (row ? {
  id: row.id,
  username: row.username,
  email: row.email,
  role: row.role,
  name: row.name,
  firstName: row.firstName ?? row.first_name ?? '',
  lastName: row.lastName ?? row.last_name ?? '',
  patronymic: row.patronymic ?? '',
  phone: row.phone ?? '',
  address: row.address ?? '',
} : null);

const mapLead = (row) => ({
  ...row,
  status: statusLabel[row.status] || row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

const mapOrder = (row) => ({
  id: row.id,
  userId: row.user_id,
  total: Number(row.total || 0),
  currency: row.currency,
  contactName: row.contact_name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  deliveryDate: row.delivery_date,
  deliveryTime: row.delivery_time,
  comments: row.comments,
  status: statusLabel[row.status] || row.status,
  statusCode: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  items: row.items || [],
});

const mapReview = (row) => ({
  id: row.id,
  orderId: row.order_id,
  productId: row.product_id,
  authorName: row.author_name,
  rating: row.rating,
  text: row.text,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  productTitle: row.product_title || '',
});

const orderSelect = `
  SELECT o.*, COALESCE(json_agg(json_build_object(
    'id', oi.product_id, 'title', oi.title, 'quantity', oi.quantity,
    'price', oi.price, 'metadata', oi.metadata
  ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) AS items
  FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id`;

const getOrders = async (where = '', values = '') => {
  const result = await query(`${orderSelect} ${where} GROUP BY o.id ORDER BY o.created_at DESC`, values);
  return result.rows.map(mapOrder);
};

const requireUser = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: 'Требуется вход в аккаунт' });
    return null;
  }
  return mapUser(user);
};

const requireAdmin = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    sendJson(res, 401, { ok: false, error: 'Требуется вход администратора' });
    return null;
  }
  return mapUser(user);
};

const createLead = async (body, userId = null) => {
  const lead = {
    id: crypto.randomUUID(),
    userId,
    type: clip(body.type || 'lead', 64),
    name: clip(body.name, 160),
    phone: clip(body.phone, 80),
    email: normalizeEmail(body.email),
    address: clip(body.address, 500),
    deliveryDate: clip(body.deliveryDate, 40),
    deliveryTime: clip(body.deliveryTime, 40),
    comments: clip(body.comments, 2000),
    total: body.total === '' || body.total == null ? null : Number(body.total),
    itemsSummary: clip(body.itemsSummary, 2000),
  };
  const result = await query(
    `INSERT INTO leads (id, user_id, type, name, phone, email, address, delivery_date, delivery_time, comments, total, items_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [lead.id, lead.userId, lead.type, lead.name, lead.phone, lead.email, lead.address,
      lead.deliveryDate, lead.deliveryTime, lead.comments, Number.isFinite(lead.total) ? lead.total : null, lead.itemsSummary],
  );
  return mapLead(result.rows[0]);
};

const authLogin = async (req, res) => {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email || body.username);
  const password = String(body.password || '');
  if (!email || !password) return sendJson(res, 400, { ok: false, error: 'Введите email и пароль' });
  const result = await query('SELECT * FROM users WHERE lower(email) = $1 OR lower(username) = $1 LIMIT 1', [email]);
  const row = result.rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) {
    return sendJson(res, 401, { ok: false, error: 'Неверный email или пароль' });
  }
  const token = await createUserSession(row.id);
  return sendJson(res, 200, { ok: true, user: mapUser(row) }, { 'Set-Cookie': userSessionCookie(token) });
};

const authRegister = async (req, res) => {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!email || !email.includes('@') || password.length < 8) {
    return sendJson(res, 400, { ok: false, error: 'Укажите корректный email и пароль не короче 8 символов' });
  }
  const firstName = clip(body.firstName, 100);
  const lastName = clip(body.lastName, 100);
  const patronymic = clip(body.patronymic, 100);
  const name = clip(body.name || firstName || email.split('@')[0], 160);
  try {
    const result = await query(
      `INSERT INTO users (email, password_hash, name, first_name, last_name, patronymic, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [email, hashPassword(password), name, firstName, lastName, patronymic, clip(body.phone, 80)],
    );
    const token = await createUserSession(result.rows[0].id);
    return sendJson(res, 201, { ok: true, user: mapUser(result.rows[0]) }, { 'Set-Cookie': userSessionCookie(token) });
  } catch (error) {
    if (error.code === '23505') return sendJson(res, 409, { ok: false, error: 'Пользователь с таким email уже зарегистрирован' });
    throw error;
  }
};

const createOrder = async (req, res) => {
  const body = await readJsonBody(req);
  const sessionUser = await getSessionUser(req);
  const items = Array.isArray(body.items) ? body.items.slice(0, 100) : [];
  if (!items.length) return sendJson(res, 400, { ok: false, error: 'Корзина пуста' });
  const orderId = crypto.randomUUID();
  const total = Number(body.total);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO orders (id,user_id,total,currency,contact_name,email,phone,address,delivery_date,delivery_time,comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [orderId, sessionUser?.id || null, Number.isFinite(total) ? total : 0, 'USD',
        clip(body.contactName || body.name, 180), normalizeEmail(body.email), clip(body.phone, 80),
        clip(body.address, 500), clip(body.deliveryDate, 40), clip(body.deliveryTime, 40), clip(body.comments, 2000)],
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id,product_id,title,quantity,price,metadata) VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, clip(item.id, 120), clip(item.title || item.name, 240), Math.max(1, Number(item.quantity) || 1),
          Number(item.price) || 0, JSON.stringify(item)],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const order = (await getOrders('WHERE o.id = $1', [orderId]))[0];
  const notification = await notifyLead({
    type: 'order', name: order.contactName, phone: order.phone, email: order.email,
    address: order.address, deliveryDate: order.deliveryDate, deliveryTime: order.deliveryTime,
    comments: order.comments, total: order.total, itemsSummary: order.items.map((item) => `${item.title} × ${item.quantity}`).join('; '),
  });
  return sendJson(res, 201, { ok: true, order, delivered: notification.delivered, stored: true });
};

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      await query('SELECT 1');
      return sendJson(res, 200, { ok: true, service: '01service-api', database: true, static: isProductionStaticEnabled() && buildExists() });
    }
    if (req.method === 'GET' && pathname === '/api/rbc-news') {
      const payload = await fetchRbcCryptoNews(Math.min(48, Math.max(1, Number(url.searchParams.get('limit') || 24))));
      return sendJson(res, 200, { ok: true, ...payload });
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') return await authRegister(req, res);
    if (req.method === 'POST' && pathname === '/api/auth/login') return await authLogin(req, res);
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const user = await getSessionUser(req);
      return sendJson(res, 200, { ok: true, authenticated: Boolean(user), user: mapUser(user) });
    }
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      await clearSession(req);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': userSessionCookie('', 0) });
    }
    if (req.method === 'PATCH' && pathname === '/api/auth/profile') {
      const user = await requireUser(req, res); if (!user) return;
      const body = await readJsonBody(req);
      const result = await query(
        `UPDATE users SET name=$1,first_name=$2,last_name=$3,patronymic=$4,phone=$5,address=$6,updated_at=NOW()
         WHERE id=$7 RETURNING id,username,email,role,name,first_name AS "firstName",last_name AS "lastName",patronymic,phone,address`,
        [clip(body.name, 160), clip(body.firstName, 100), clip(body.lastName, 100), clip(body.patronymic, 100), clip(body.phone, 80), clip(body.address, 500), user.id],
      );
      return sendJson(res, 200, { ok: true, user: mapUser(result.rows[0]) });
    }
    if (req.method === 'POST' && pathname === '/api/auth/password') {
      const user = await requireUser(req, res); if (!user) return;
      const body = await readJsonBody(req);
      const result = await query('SELECT password_hash FROM users WHERE id=$1', [user.id]);
      if (!verifyPassword(String(body.currentPassword || ''), result.rows[0]?.password_hash)) return sendJson(res, 400, { ok: false, error: 'Текущий пароль указан неверно' });
      if (String(body.newPassword || '').length < 8) return sendJson(res, 400, { ok: false, error: 'Новый пароль должен быть не короче 8 символов' });
      await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [hashPassword(body.newPassword), user.id]);
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'GET' && pathname === '/api/orders') {
      const user = await requireUser(req, res); if (!user) return;
      return sendJson(res, 200, { ok: true, orders: await getOrders('WHERE o.user_id = $1', [user.id]) });
    }
    if (req.method === 'POST' && pathname === '/api/orders') return await createOrder(req, res);
    const cancelMatch = pathname.match(/^\/api\/orders\/([0-9a-f-]+)\/cancel$/i);
    if (req.method === 'PATCH' && cancelMatch) {
      const user = await requireUser(req, res); if (!user) return;
      const result = await query(`UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ('pending','processing') RETURNING id`, [cancelMatch[1], user.id]);
      if (!result.rowCount) return sendJson(res, 400, { ok: false, error: 'Заказ нельзя отменить на текущем этапе' });
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'GET' && pathname === '/api/reviews') {
      const values = []; let where = `WHERE r.status = 'approved'`;
      if (url.searchParams.get('productId')) { values.push(clip(url.searchParams.get('productId'), 120)); where += ' AND r.product_id = $1'; }
      const result = await query(`SELECT r.*, COALESCE(p.title,'') product_title FROM reviews r LEFT JOIN products p ON p.id = r.product_id ${where} ORDER BY r.created_at DESC LIMIT 100`, values);
      return sendJson(res, 200, { ok: true, reviews: result.rows.map(mapReview) });
    }
    if (req.method === 'GET' && pathname === '/api/products') {
      const category = clip(url.searchParams.get('category'), 80);
      const values = []; let where = 'WHERE is_active = TRUE';
      if (category) { values.push(category); where += ' AND category = $1'; }
      const result = await query(`SELECT id,title,category,price,currency,description,image,metadata FROM products ${where} ORDER BY created_at`, values);
      return sendJson(res, 200, { ok: true, products: result.rows.map((row) => ({ ...row, price: Number(row.price), metadata: row.metadata || {} })) });
    }
    if (req.method === 'POST' && pathname === '/api/reviews') {
      const user = await requireUser(req, res); if (!user) return;
      const body = await readJsonBody(req);
      const rating = Number(body.rating); const text = clip(body.text, 3000);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 10) return sendJson(res, 400, { ok: false, error: 'Оценка от 1 до 5 и текст от 10 символов обязательны' });
      const order = await query("SELECT id FROM orders WHERE id=$1 AND user_id=$2 AND status='completed'", [body.orderId, user.id]);
      if (!order.rowCount) return sendJson(res, 400, { ok: false, error: 'Отзыв можно оставить после завершённого заказа' });
      try {
        const result = await query(`INSERT INTO reviews (id,user_id,order_id,product_id,author_name,rating,text) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [crypto.randomUUID(), user.id, body.orderId, clip(body.productId || 'general', 120), clip([user.firstName || user.name, user.lastName].filter(Boolean).join(' '), 160), rating, text]);
        return sendJson(res, 201, { ok: true, review: mapReview(result.rows[0]) });
      } catch (error) {
        if (error.code === '23505') return sendJson(res, 409, { ok: false, error: 'Вы уже оставляли отзыв по этому заказу' });
        throw error;
      }
    }
    if (req.method === 'POST' && pathname === '/api/leads') {
      const user = await getSessionUser(req);
      const lead = await createLead(await readJsonBody(req), user?.id || null);
      const notification = await notifyLead(lead);
      return sendJson(res, 200, { ok: true, stored: true, leadId: lead.id, delivered: notification.delivered, allSkipped: notification.allSkipped });
    }

    if (pathname.startsWith('/api/admin/')) {
      if (req.method === 'GET' && pathname === '/api/admin/session') {
        const sessionUser = await getSessionUser(req);
        return sendJson(res, 200, { ok: true, authenticated: sessionUser?.role === 'admin', user: mapUser(sessionUser) });
      }
      const admin = await requireAdmin(req, res); if (!admin) return;
      if (req.method === 'GET' && pathname === '/api/admin/dashboard') {
        const [leads, orders, reviews, users] = await Promise.all([
          query("SELECT COUNT(*)::int count FROM leads WHERE status='new'"), query("SELECT COUNT(*)::int count FROM orders WHERE status IN ('pending','processing')"), query("SELECT COUNT(*)::int count FROM reviews WHERE status='pending'"), query("SELECT COUNT(*)::int count FROM users WHERE role='customer'"),
        ]);
        return sendJson(res, 200, { ok: true, stats: { newLeads: leads.rows[0].count, activeOrders: orders.rows[0].count, pendingReviews: reviews.rows[0].count, customers: users.rows[0].count } });
      }
      if (req.method === 'GET' && pathname === '/api/admin/leads') return sendJson(res, 200, { ok: true, leads: (await query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500')).rows.map(mapLead) });
      if (req.method === 'GET' && pathname === '/api/admin/orders') return sendJson(res, 200, { ok: true, orders: await getOrders('', []) });
      if (req.method === 'GET' && pathname === '/api/admin/reviews') return sendJson(res, 200, { ok: true, reviews: (await query("SELECT r.*, COALESCE(p.title,'') product_title FROM reviews r LEFT JOIN products p ON p.id=r.product_id ORDER BY r.created_at DESC LIMIT 500")).rows.map(mapReview) });
      if (req.method === 'GET' && pathname === '/api/admin/users') return sendJson(res, 200, { ok: true, users: (await query("SELECT id,email,name,first_name AS \"firstName\",last_name AS \"lastName\",phone,created_at AS \"createdAt\" FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT 500")).rows });
      const leadStatus = pathname.match(/^\/api\/admin\/leads\/([0-9a-f-]+)\/status$/i);
      const orderStatus = pathname.match(/^\/api\/admin\/orders\/([0-9a-f-]+)\/status$/i);
      const reviewStatus = pathname.match(/^\/api\/admin\/reviews\/([0-9a-f-]+)\/status$/i);
      if (req.method === 'PATCH' && (leadStatus || orderStatus || reviewStatus)) {
        const body = await readJsonBody(req); const code = toStatusCode(body.status);
        if (leadStatus && ['new','processing','completed','cancelled'].includes(code)) {
          const result = await query('UPDATE leads SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [code, leadStatus[1]]);
          return result.rowCount ? sendJson(res, 200, { ok: true, lead: mapLead(result.rows[0]) }) : sendJson(res, 404, { ok: false, error: 'Заявка не найдена' });
        }
        if (orderStatus && ['pending','processing','completed','cancelled'].includes(code)) {
          const result = await query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status', [code, orderStatus[1]]);
          return result.rowCount ? sendJson(res, 200, { ok: true, order: { id: result.rows[0].id, status: statusLabel[result.rows[0].status], statusCode: result.rows[0].status } }) : sendJson(res, 404, { ok: false, error: 'Заказ не найден' });
        }
        if (reviewStatus && ['approved','rejected','pending'].includes(code)) {
          const result = await query('UPDATE reviews SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [code, reviewStatus[1]]);
          return result.rowCount ? sendJson(res, 200, { ok: true, review: mapReview(result.rows[0]) }) : sendJson(res, 404, { ok: false, error: 'Отзыв не найден' });
        }
        return sendJson(res, 400, { ok: false, error: 'Недопустимый статус' });
      }
      return sendJson(res, 404, { ok: false, error: 'Not found' });
    }

    if (tryServeStatic(req, res)) return;
    return sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return sendJson(res, 500, { ok: false, error: 'Внутренняя ошибка сервера' });
  }
});

initDb()
  .then(() => server.listen(PORT, HOST, () => console.log(`01service API + DB http://${HOST}:${PORT}`)))
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  });

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
