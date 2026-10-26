const http = require('http');
const crypto = require('crypto');
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch {
  /* dotenv is installed in the project; keep the server readable if it is omitted in a deploy. */
}
const { fetchRbcCryptoNews } = require('./rbcCryptoFeed');
const { reverseGeocodeCoords } = require('./yandexGeocode');
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
const { checkLoginRateLimit } = require('./rateLimit');
const { logAdminAction, mapAuditRow } = require('./auditLog');
const { parseAdminListParams, paginationMeta, appendSearch } = require('./adminQuery');
const { mapProductRow } = require('./productMap');

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
  id: row.id,
  userId: row.user_id,
  type: row.type,
  name: row.name,
  phone: row.phone,
  email: row.email,
  address: row.address,
  deliveryDate: row.delivery_date,
  deliveryTime: row.delivery_time,
  comments: row.comments,
  total: row.total == null ? null : Number(row.total),
  itemsSummary: row.items_summary,
  statusCode: row.status,
  status: statusLabel[row.status] || row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
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
  const rate = checkLoginRateLimit(req);
  if (!rate.allowed) {
    return sendJson(res, 429, {
      ok: false,
      error: `Слишком много попыток входа. Повторите через ${rate.retryAfterSec} с.`,
    });
  }
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
  if (sessionUser?.role === 'admin') {
    return sendJson(res, 403, {
      ok: false,
      error: 'Администратор не оформляет заказы на сайте. Управляйте заказами в админ-панели.',
    });
  }
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
    if (req.method === 'GET' && pathname === '/api/geocode/reverse') {
      const lat = Number(url.searchParams.get('lat'));
      const lon = Number(url.searchParams.get('lon'));
      const result = await reverseGeocodeCoords(lat, lon);
      return sendJson(res, result.ok ? 200 : 502, result);
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
    const productIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (req.method === 'GET' && productIdMatch) {
      const result = await query(
        'SELECT * FROM products WHERE id = $1 AND is_active = TRUE LIMIT 1',
        [clip(productIdMatch[1], 120)],
      );
      if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Товар не найден' });
      const row = result.rows[0];
      const product = mapProductRow(row, { minerShape: row.category === 'miner' });
      return sendJson(res, 200, { ok: true, product });
    }
    if (req.method === 'GET' && pathname === '/api/products') {
      const category = clip(url.searchParams.get('category'), 80);
      const values = []; let where = 'WHERE is_active = TRUE';
      if (category) { values.push(category); where += ' AND category = $1'; }
      const result = await query(`SELECT * FROM products ${where} ORDER BY created_at`, values);
      const minerShape = category === 'miner';
      return sendJson(res, 200, {
        ok: true,
        products: result.rows.map((row) => mapProductRow(row, { minerShape })),
      });
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
          query("SELECT COUNT(*)::int count FROM leads WHERE status='new'"),
          query("SELECT COUNT(*)::int count FROM orders WHERE status IN ('pending','processing')"),
          query("SELECT COUNT(*)::int count FROM reviews WHERE status='pending'"),
          query("SELECT COUNT(*)::int count FROM users WHERE role='customer'"),
        ]);
        return sendJson(res, 200, {
          ok: true,
          stats: {
            newLeads: leads.rows[0].count,
            activeOrders: orders.rows[0].count,
            pendingReviews: reviews.rows[0].count,
            customers: users.rows[0].count,
          },
        });
      }
      if (req.method === 'GET' && pathname === '/api/admin/leads') {
        const { page, limit, offset, q, status, type } = parseAdminListParams(url, clip);
        const values = [];
        let where = 'WHERE 1=1';
        if (status && status !== 'all') { values.push(status); where += ` AND status = $${values.length}`; }
        if (type && type !== 'all') { values.push(type); where += ` AND type = $${values.length}`; }
        const search = appendSearch(['name', 'phone', 'email', 'comments', 'items_summary', 'id::text'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const list = await query(
          `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const countResult = await query(`SELECT COUNT(*)::int count FROM leads ${where}`, values.slice(0, -2));
        return sendJson(res, 200, {
          ok: true,
          leads: list.rows.map(mapLead),
          pagination: paginationMeta(page, limit, countResult.rows[0].count),
        });
      }
      if (req.method === 'GET' && pathname === '/api/admin/orders') {
        const { page, limit, offset, q, status } = parseAdminListParams(url, clip);
        const values = [];
        let where = 'WHERE 1=1';
        if (status && status !== 'all') { values.push(status); where += ` AND o.status = $${values.length}`; }
        const search = appendSearch(['o.contact_name', 'o.email', 'o.phone', 'o.address', 'o.id::text'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const orderList = await query(
          `${orderSelect} ${where} GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const countResult = await query(`SELECT COUNT(*)::int count FROM orders o ${where}`, values.slice(0, -2));
        return sendJson(res, 200, {
          ok: true,
          orders: orderList.rows.map(mapOrder),
          pagination: paginationMeta(page, limit, countResult.rows[0].count),
        });
      }
      if (req.method === 'GET' && pathname === '/api/admin/reviews') {
        const { page, limit, offset, q, status } = parseAdminListParams(url, clip);
        const values = [];
        let where = 'WHERE 1=1';
        if (status && status !== 'all') { values.push(status); where += ` AND r.status = $${values.length}`; }
        const search = appendSearch(['r.author_name', 'r.text', 'r.id::text', 'p.title'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const list = await query(
          `SELECT r.*, COALESCE(p.title,'') product_title FROM reviews r
           LEFT JOIN products p ON p.id=r.product_id ${where}
           ORDER BY r.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const countResult = await query(
          `SELECT COUNT(*)::int count FROM reviews r LEFT JOIN products p ON p.id=r.product_id ${where}`,
          values.slice(0, -2),
        );
        return sendJson(res, 200, {
          ok: true,
          reviews: list.rows.map(mapReview),
          pagination: paginationMeta(page, limit, countResult.rows[0].count),
        });
      }
      if (req.method === 'GET' && pathname === '/api/admin/users') {
        const { page, limit, offset, q } = parseAdminListParams(url, clip);
        const values = [];
        let where = "WHERE role='customer'";
        const search = appendSearch(['name', 'email', 'phone', 'first_name', 'last_name'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const list = await query(
          `SELECT id,email,name,first_name AS "firstName",last_name AS "lastName",phone,created_at AS "createdAt"
           FROM users ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const countResult = await query(`SELECT COUNT(*)::int count FROM users ${where}`, values.slice(0, -2));
        return sendJson(res, 200, { ok: true, users: list.rows, pagination: paginationMeta(page, limit, countResult.rows[0].count) });
      }
      if (req.method === 'GET' && pathname === '/api/admin/products') {
        const { page, limit, offset, q, category } = parseAdminListParams(url, clip);
        const values = [];
        let where = 'WHERE 1=1';
        if (category && category !== 'all') { values.push(category); where += ` AND category = $${values.length}`; }
        const search = appendSearch(['title', 'description', 'id'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const list = await query(
          `SELECT * FROM products ${where} ORDER BY category, title LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const countResult = await query(`SELECT COUNT(*)::int count FROM products ${where}`, values.slice(0, -2));
        return sendJson(res, 200, {
          ok: true,
          products: list.rows.map((row) => mapProductRow(row)),
          pagination: paginationMeta(page, limit, countResult.rows[0].count),
        });
      }
      if (req.method === 'GET' && pathname === '/api/admin/audit') {
        const { page, limit, offset } = parseAdminListParams(url, clip);
        const values = [limit, offset];
        const list = await query(
          `SELECT a.*, u.email AS admin_email FROM admin_audit_log a
           LEFT JOIN users u ON u.id = a.admin_user_id
           ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
          values,
        );
        const countResult = await query('SELECT COUNT(*)::int count FROM admin_audit_log');
        return sendJson(res, 200, {
          ok: true,
          audit: list.rows.map(mapAuditRow),
          pagination: paginationMeta(page, limit, countResult.rows[0].count),
        });
      }
      const productPatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
      if (req.method === 'PATCH' && productPatch) {
        const body = await readJsonBody(req);
        const fields = [];
        const values = [];
        const pushField = (sql, value) => { values.push(value); fields.push(`${sql} = $${values.length}`); };
        if (body.title != null) pushField('title', clip(body.title, 240));
        if (body.description != null) pushField('description', clip(body.description, 4000));
        if (body.price != null) pushField('price', Number(body.price));
        if (body.image != null) pushField('image', clip(body.image, 500) || null);
        if (body.isActive != null) pushField('is_active', Boolean(body.isActive));
        if (body.metadata != null && typeof body.metadata === 'object') pushField('metadata', JSON.stringify(body.metadata));
        if (!fields.length) return sendJson(res, 400, { ok: false, error: 'Нет полей для обновления' });
        values.push(productPatch[1]);
        const result = await query(
          `UPDATE products SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
          values,
        );
        if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Товар не найден' });
        await logAdminAction(query, {
          adminUserId: admin.id,
          action: 'product.update',
          entityType: 'product',
          entityId: productPatch[1],
          details: body,
        });
        return sendJson(res, 200, { ok: true, product: mapProductRow(result.rows[0]) });
      }
      const leadStatus = pathname.match(/^\/api\/admin\/leads\/([0-9a-f-]+)\/status$/i);
      const orderStatus = pathname.match(/^\/api\/admin\/orders\/([0-9a-f-]+)\/status$/i);
      const reviewStatus = pathname.match(/^\/api\/admin\/reviews\/([0-9a-f-]+)\/status$/i);
      if (req.method === 'PATCH' && (leadStatus || orderStatus || reviewStatus)) {
        const body = await readJsonBody(req); const code = toStatusCode(body.status);
        if (leadStatus && ['new', 'processing', 'completed', 'cancelled'].includes(code)) {
          const prev = await query('SELECT status FROM leads WHERE id=$1', [leadStatus[1]]);
          const result = await query('UPDATE leads SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [code, leadStatus[1]]);
          if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Заявка не найдена' });
          await logAdminAction(query, {
            adminUserId: admin.id,
            action: 'lead.status',
            entityType: 'lead',
            entityId: leadStatus[1],
            details: { from: prev.rows[0]?.status, to: code },
          });
          return sendJson(res, 200, { ok: true, lead: mapLead(result.rows[0]) });
        }
        if (orderStatus && ['pending', 'processing', 'completed', 'cancelled'].includes(code)) {
          const prev = await query('SELECT status FROM orders WHERE id=$1', [orderStatus[1]]);
          const result = await query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status', [code, orderStatus[1]]);
          if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Заказ не найден' });
          await logAdminAction(query, {
            adminUserId: admin.id,
            action: 'order.status',
            entityType: 'order',
            entityId: orderStatus[1],
            details: { from: prev.rows[0]?.status, to: code },
          });
          return sendJson(res, 200, {
            ok: true,
            order: {
              id: result.rows[0].id,
              status: statusLabel[result.rows[0].status],
              statusCode: result.rows[0].status,
            },
          });
        }
        if (reviewStatus && ['approved', 'rejected', 'pending'].includes(code)) {
          const prev = await query('SELECT status FROM reviews WHERE id=$1', [reviewStatus[1]]);
          const result = await query('UPDATE reviews SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [code, reviewStatus[1]]);
          if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Отзыв не найден' });
          await logAdminAction(query, {
            adminUserId: admin.id,
            action: 'review.status',
            entityType: 'review',
            entityId: reviewStatus[1],
            details: { from: prev.rows[0]?.status, to: code },
          });
          return sendJson(res, 200, { ok: true, review: mapReview(result.rows[0]) });
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
