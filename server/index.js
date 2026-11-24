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
  clearSession, createUserSession, getSessionUser, hashPassword,
  userSessionCookie, verifyPassword, revokeOtherSessions,
} = require('./auth');
const { checkLoginRateLimit, checkRouteRateLimit } = require('./rateLimit');
const { logAdminAction, mapAuditRow } = require('./auditLog');
const { parseAdminListParams, paginationMeta, appendSearch } = require('./adminQuery');
const { mapProductRow } = require('./productMap');
const { getCoinMetrics, getCryptoMarkets, getHistoricalPrices, getUsdRubRate } = require('./cryptoMarkets');
const OPENAPI_SPEC = require('./openapi.json');
const { startTelegramBot } = require('./telegramSalesBot');
const { listOffers, getOfferById, loadServicesCatalog } = require('./servicesCatalog');
const { seedBlogPosts } = require('./blogSeed');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map((value) => value.trim()).filter(Boolean);

const sendJson = (res, status, payload, headers = {}) => {
  const body = payload && typeof payload === 'object' && res.requestId
    ? { ...payload, requestId: res.requestId }
    : payload;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(res.requestId ? { 'X-Request-Id': res.requestId } : {}),
    ...headers,
  });
  res.end(JSON.stringify(body));
};

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  let tooLarge = false;
  req.on('data', (chunk) => {
    if (tooLarge) return;
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > 256 * 1024) {
      tooLarge = true;
      const error = new Error('Размер запроса превышает допустимый предел');
      error.statusCode = 413;
      error.code = 'PAYLOAD_TOO_LARGE';
      reject(error);
    }
  });
  req.on('end', () => {
    if (tooLarge) return;
    if (!raw) return resolve({});
    try { return resolve(JSON.parse(raw)); } catch {
      const error = new Error('Некорректный JSON в запросе');
      error.statusCode = 400;
      error.code = 'INVALID_JSON';
      return reject(error);
    }
  });
  req.on('error', reject);
});

const setCors = (req, res) => {
  const origin = req.headers.origin;
  if (!origin) return;
  if (ALLOWED_ORIGINS.includes(origin) || originMatchesRequestHost(req, origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
};

const requestHost = (req) => String(req.headers.host || '').split(',')[0].trim().toLowerCase();

const originMatchesRequestHost = (req, originHeader) => {
  try {
    return new URL(originHeader).host.toLowerCase() === requestHost(req);
  } catch {
    return false;
  }
};

const checkMutationOrigin = (req) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return true;
  const origin = req.headers.origin;
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    // Сайт и API на одном порту (Docker :8080, VPS) — браузер шлёт Origin, его нет в CORS_ORIGINS dev :3000
    if (originMatchesRequestHost(req, origin)) return true;
    return false;
  }
  if (process.env.NODE_ENV !== 'production') return true;
  return String(req.headers['sec-fetch-site'] || '').toLowerCase() === 'same-origin'
    && /^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''));
};

const clip = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const normalizeEmail = (value) => clip(value, 180).toLowerCase();
const statusLabel = {
  new: 'Новая', processing: 'В работе', completed: 'Выполнен', cancelled: 'Отменён',
  pending: 'Новый', confirmed: 'Подтверждён', awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен', assembling: 'Собирается', shipped: 'Передан в доставку',
  cancelled_customer: 'Отменён покупателем', cancelled_admin: 'Отменён администратором',
};
const isPublishableProduct = ({ category, price, currency = 'USD', sku, stock, description, image, warranty, shippingTime, metadata }) => {
  const hasText = (value) => String(value ?? '').trim().length > 0;
  const minerFields = ['algorithm', 'coins', 'hashrate', 'power', 'noise', 'size', 'weight'];
  return ['miner', 'computer'].includes(category)
    && currency === 'USD'
    && Number.isFinite(Number(price)) && Number(price) > 0
    && hasText(sku)
    && stock != null && Number.isSafeInteger(Number(stock)) && Number(stock) >= 0
    && hasText(description)
    && Boolean(image) && (/^https:\/\//i.test(String(image)) || String(image).startsWith('/'))
    && hasText(warranty) && hasText(shippingTime)
    && hasText(metadata?.brand) && hasText(metadata?.model)
    && (category !== 'miner' || minerFields.every((key) => hasText(metadata?.[key])));
};
const toStatusCode = (value) => ({
  Новая: 'new', 'В работе': 'processing', Выполнен: 'completed', Завершена: 'completed',
  Отменён: 'cancelled_admin', Отменена: 'cancelled_admin', 'Отменён покупателем': 'cancelled_customer',
  'Отменён администратором': 'cancelled_admin', Новый: 'pending', Ожидание: 'pending',
  Подтверждён: 'confirmed', 'Ожидает оплаты': 'awaiting_payment', Оплачен: 'paid',
  Собирается: 'assembling', 'Передан в доставку': 'shipped',
}[value] || value);
const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled_admin'],
  processing: ['confirmed', 'assembling', 'cancelled_admin'],
  confirmed: ['awaiting_payment', 'assembling', 'cancelled_admin'],
  awaiting_payment: ['paid', 'cancelled_admin'],
  paid: ['assembling', 'cancelled_admin'],
  assembling: ['shipped', 'cancelled_admin'],
  shipped: ['completed', 'cancelled_admin'],
};

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
  isActive: row.is_active !== false,
} : null);

const mapLead = (row) => ({
  id: row.id,
  leadNumber: Number(row.lead_number || 0),
  userId: row.user_id,
  type: row.type,
  source: row.source || 'website',
  name: row.name,
  topic: row.topic || '',
  phone: row.phone,
  email: row.email,
  address: row.address,
  deliveryDate: row.delivery_date,
  deliveryTime: row.delivery_time,
  comments: row.comments,
  total: row.total == null ? null : Number(row.total),
  itemsSummary: row.items_summary,
  metadata: row.metadata || {},
  statusCode: row.status,
  status: statusLabel[row.status] || row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  notificationStatus: row.notification_status || 'pending',
  notificationAttempts: Number(row.notification_attempts || 0),
  notificationError: row.notification_error || '',
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
  orderNumber: Number(row.order_number || 0),
  deliveryLatitude: row.delivery_latitude == null ? null : Number(row.delivery_latitude),
  deliveryLongitude: row.delivery_longitude == null ? null : Number(row.delivery_longitude),
  shippingFee: Number(row.shipping_fee || 0),
  cancelReason: row.cancel_reason || '',
  deliveryZone: row.delivery_zone || '',
  statusHistory: row.status_history || [],
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
  moderationNote: row.moderation_note || '',
});

const orderSelect = `
  SELECT o.*, COALESCE(json_agg(json_build_object(
    'id', oi.product_id, 'title', oi.title, 'sku', oi.sku, 'quantity', oi.quantity,
    'price', oi.price, 'lineTotal', oi.line_total, 'metadata', oi.metadata
  ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) AS items
  , COALESCE((SELECT json_agg(json_build_object(
    'previousStatus', h.previous_status, 'status', h.new_status,
    'label', COALESCE((SELECT CASE h.new_status ${Object.entries(statusLabel).map(([code, label]) => `WHEN '${code}' THEN '${label.replace(/'/g, "''")}'`).join(' ')} ELSE h.new_status END), h.new_status),
    'reason', h.reason, 'createdAt', h.created_at
  ) ORDER BY h.created_at) FROM order_status_history h WHERE h.order_id=o.id), '[]'::json) AS status_history
  FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id`;

const getOrders = async (where = '', values = []) => {
  const result = await query(`${orderSelect} ${where} GROUP BY o.id ORDER BY o.created_at DESC`, values);
  return result.rows.map(mapOrder);
};

const getAccountCart = async (userId) => {
  const result = await query(
    `SELECT p.*, LEAST(c.quantity,p.stock) AS cart_quantity,
      (SELECT COUNT(*)::int FROM reviews r WHERE r.product_id=p.id AND r.status='approved') AS review_count,
      (SELECT COALESCE(AVG(r.rating),0)::numeric(4,2) FROM reviews r WHERE r.product_id=p.id AND r.status='approved') AS average_rating
     FROM user_cart_items c JOIN products p ON p.id=c.product_id
     WHERE c.user_id=$1 AND p.is_active=TRUE AND p.category IN ('miner','computer')
       AND p.currency='USD' AND p.price>0 AND p.stock>0
     ORDER BY c.updated_at DESC`,
    [userId],
  );
  return result.rows.map((row) => ({ ...mapProductRow(row, { minerShape: row.category === 'miner' }), quantity: Number(row.cart_quantity) }));
};

const saveAccountCart = async (userId, items, merge = false) => {
  if (!Array.isArray(items) || items.length > 50) throw Object.assign(new Error('Проверьте товары в корзине'), { statusCode: 400 });
  const requested = new Map();
  for (const item of items) {
    const id = clip(item.id, 120);
    const quantity = Number(item.quantity);
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      throw Object.assign(new Error('Количество товара должно быть целым числом от 1 до 100'), { statusCode: 400 });
    }
    requested.set(id, Math.min(100, quantity + (requested.get(id) || 0)));
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (merge) {
      const saved = await client.query('SELECT product_id,quantity FROM user_cart_items WHERE user_id=$1', [userId]);
      saved.rows.forEach((item) => requested.set(item.product_id, Math.min(100, (requested.get(item.product_id) || 0) + Number(item.quantity))));
    }
    const ids = [...requested.keys()];
    const products = ids.length ? await client.query(
      "SELECT id,stock FROM products WHERE id=ANY($1::text[]) AND is_active=TRUE AND category IN ('miner','computer') AND currency='USD' AND price>0 AND stock>0 FOR UPDATE",
      [ids],
    ) : { rows: [] };
    const byId = new Map(products.rows.map((product) => [product.id, product]));
    await client.query('DELETE FROM user_cart_items WHERE user_id=$1', [userId]);
    for (const [id, quantity] of requested) {
      const product = byId.get(id);
      if (!product) continue;
      await client.query(
        'INSERT INTO user_cart_items(user_id,product_id,quantity) VALUES ($1,$2,$3)',
        [userId, id, Math.min(quantity, Number(product.stock), 100)],
      );
    }
    await client.query('COMMIT');
    return { items: await getAccountCart(userId), unavailableIds: ids.filter((id) => !byId.has(id)) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
};

const requireUser = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: 'Требуется вход в аккаунт' });
    return null;
  }
  req.userId = user.id;
  return mapUser(user);
};

const requireAdmin = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    sendJson(res, 401, { ok: false, error: 'Требуется вход администратора' });
    return null;
  }
  req.userId = user.id;
  return mapUser(user);
};

const createLead = async (body, userId = null, source = 'website', dbQuery = query) => {
  const consentAt = body.consent === true ? new Date() : null;
  const email = normalizeEmail(body.email);
  const phone = clip(body.phone, 80);
  const name = clip(body.name, 160);
  const comments = clip(body.comments, 2000);
  if (!consentAt) throw Object.assign(new Error('Требуется согласие на обработку персональных данных'), { statusCode: 400, code: 'CONSENT_REQUIRED' });
  if (name.length < 2 || (!phone && !email)) throw Object.assign(new Error('Укажите имя и телефон или email'), { statusCode: 400, code: 'INVALID_CONTACT' });
  if (phone && (!/^\+?[\d\s().-]{7,32}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) {
    throw Object.assign(new Error('Проверьте номер телефона'), { statusCode: 400, code: 'INVALID_PHONE' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Проверьте адрес email'), { statusCode: 400, code: 'INVALID_EMAIL' });
  if (String(body.comments || '').length > 2000 || String(body.topic || '').length > 200) throw Object.assign(new Error('Проверьте длину темы и комментария'), { statusCode: 400, code: 'FIELD_TOO_LONG' });
  const serviceId = body.serviceId == null ? null : Number(body.serviceId);
  const metadata = {
    serviceId: Number.isFinite(serviceId) ? serviceId : null,
    serviceKind: clip(body.serviceKind, 32) || null,
    serviceCategory: clip(body.serviceCategory, 40) || null,
    direction: clip(body.direction, 40) || null,
  };
  const lead = {
    id: crypto.randomUUID(),
    userId,
    type: clip(body.type || 'lead', 64),
    name,
    phone,
    email,
    topic: clip(body.topic, 200),
    address: clip(body.address, 500),
    deliveryDate: clip(body.deliveryDate, 40),
    deliveryTime: clip(body.deliveryTime, 40),
    comments,
    total: body.total === '' || body.total == null ? null : Number(body.total),
    itemsSummary: clip(body.itemsSummary, 2000),
    source: ['website', 'telegram'].includes(source) ? source : 'website',
    metadata,
  };
  const result = await dbQuery(
    `INSERT INTO leads (id, user_id, type, name, phone, email, topic, address, delivery_date, delivery_time, comments, total, items_summary, source, consent_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [lead.id, lead.userId, lead.type, lead.name, lead.phone, lead.email, lead.topic, lead.address,
      lead.deliveryDate, lead.deliveryTime, lead.comments, Number.isFinite(lead.total) ? lead.total : null, lead.itemsSummary, lead.source, consentAt, JSON.stringify(lead.metadata)],
  );
  const savedLead = mapLead(result.rows[0]);
  await dbQuery(
    `INSERT INTO notification_outbox(entity_type,entity_id,payload) VALUES ('lead',$1,$2)
     ON CONFLICT (entity_type,entity_id) DO NOTHING`,
    [savedLead.id, JSON.stringify(savedLead)],
  );
  return savedLead;
};

const getSetting = async (key) => {
  const result = await query('SELECT value FROM site_settings WHERE key=$1', [key]);
  return result.rows[0]?.value || {};
};

const notificationRetryDelay = (attempt) => Math.min(6 * 60 * 60, 30 * (2 ** Math.max(0, attempt - 1)));
const processNotificationOutbox = async (entityId) => {
  const values = [];
  const specific = entityId ? ' AND entity_id=$1' : '';
  if (entityId) values.push(entityId);
  const tasks = await query(
    `WITH picked AS (
       SELECT id FROM notification_outbox
        WHERE status='pending' AND next_attempt_at <= NOW()${specific}
        ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED
     )
     UPDATE notification_outbox n SET status='sending', attempts=n.attempts+1,
       next_attempt_at=NOW()+INTERVAL '2 minutes'
       FROM picked WHERE n.id=picked.id RETURNING n.*`, values,
  ).catch(() => ({ rows: [] }));
  for (const task of tasks.rows) {
    const attempts = Number(task.attempts || 1);
    let result;
    try {
      result = await notifyLead(task.payload);
    } catch (error) {
      result = { delivered: false, channels: {}, error: error?.name === 'TimeoutError' ? 'timeout' : 'request_failed' };
    }
    const sent = Boolean(result.delivered);
    const errorText = sent ? '' : clip(
      JSON.stringify(result.channels || { error: result.error || 'notification_failed' }), 1200,
    );
    const nextStatus = sent ? 'sent' : attempts >= 8 ? 'failed' : 'pending';
    await query(
      `UPDATE notification_outbox SET status=$1, attempts=$2, last_error=$3,
        next_attempt_at=NOW()+($4::int * INTERVAL '1 second'), sent_at=CASE WHEN $1='sent' THEN NOW() ELSE sent_at END
       WHERE id=$5`,
      [nextStatus, attempts, errorText, notificationRetryDelay(attempts), task.id],
    );
    if (task.entity_type === 'lead') {
      await query(
        `UPDATE leads SET notification_status=$1,notification_attempts=$2,
          notification_next_attempt_at=CASE WHEN $1='pending' THEN NOW()+($3::int * INTERVAL '1 second') ELSE NULL END,
          notification_error=$4 WHERE id=$5`,
        [nextStatus, attempts, notificationRetryDelay(attempts), errorText, task.entity_id],
      );
    }
  }
};

let notificationWorkerTimer;
let telegramBot;
const startNotificationWorker = () => {
  if (notificationWorkerTimer) clearInterval(notificationWorkerTimer);
  notificationWorkerTimer = setInterval(() => {
    query("UPDATE notification_outbox SET status='pending' WHERE status='sending' AND next_attempt_at <= NOW()")
      .then(() => processNotificationOutbox())
      .catch((error) => {
      console.error(JSON.stringify({ code: 'NOTIFICATION_WORKER_ERROR', message: clip(error.message, 200) }));
      });
  }, 30_000);
  notificationWorkerTimer.unref();
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
  if (!row || row.is_active === false || !verifyPassword(password, row.password_hash)) {
    return sendJson(res, 401, { ok: false, error: 'Неверный email или пароль' });
  }
  req.userId = row.id;
  if (!String(row.password_hash).startsWith('$2')) {
    await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [hashPassword(password), row.id]);
  }
  const token = await createUserSession(row.id);
  return sendJson(res, 200, { ok: true, user: mapUser(row) }, { 'Set-Cookie': userSessionCookie(token) });
};

const authRegister = async (req, res) => {
  const body = await readJsonBody(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return sendJson(res, 400, { ok: false, error: 'Укажите корректный email и пароль не короче 8 символов' });
  }
  if (body.consent !== true) return sendJson(res, 400, { ok: false, error: 'Требуется согласие на обработку персональных данных' });
  const firstName = clip(body.firstName, 100);
  const lastName = clip(body.lastName, 100);
  if (!firstName || !lastName) return sendJson(res, 400, { ok: false, error: 'Укажите имя и фамилию' });
  const phone = clip(body.phone, 80);
  if (!phone || !/^\+?[\d\s().-]{7,32}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) {
    return sendJson(res, 400, { ok: false, error: 'Укажите корректный телефон' });
  }
  const patronymic = clip(body.patronymic, 100);
  const name = clip(body.name || firstName || email.split('@')[0], 160);
  try {
    const result = await query(
      `INSERT INTO users (email, password_hash, name, first_name, last_name, patronymic, phone, consent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [email, hashPassword(password), name, firstName, lastName, patronymic, phone],
    );
    req.userId = result.rows[0].id;
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
  if (!sessionUser) return sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', error: 'Войдите в аккаунт, чтобы оформить заказ' });
  req.userId = sessionUser.id;
  if (sessionUser?.role === 'admin') {
    return sendJson(res, 403, {
      ok: false,
      error: 'Администратор не оформляет заказы на сайте. Управляйте заказами в админ-панели.',
    });
  }
  if (body.consent !== true) return sendJson(res, 400, { ok: false, error: 'Требуется согласие на обработку персональных данных' });
  const inputItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  const itemsById = new Map();
  for (const item of inputItems) {
    const id = clip(item.id, 120);
    const quantity = Number(item.quantity);
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      return sendJson(res, 400, { ok: false, error: 'Проверьте товары и их количество' });
    }
    const existing = itemsById.get(id);
    itemsById.set(id, { id, quantity: quantity + (existing?.quantity || 0), clientPrice: Number(item.price) });
  }
  const items = [...itemsById.values()];
  if (!items.length) return sendJson(res, 400, { ok: false, error: 'Корзина пуста' });
  if (items.some((item) => item.quantity > 100 || !Number.isFinite(item.clientPrice) || item.clientPrice < 0)) {
    return sendJson(res, 400, { ok: false, error: 'Проверьте цены и количество товаров' });
  }
  const idempotencyKey = clip(body.idempotencyKey, 80) || crypto.randomUUID();
  const contactName = clip(body.contactName || body.name, 180);
  const phone = clip(body.phone, 80);
  const email = normalizeEmail(body.email);
  const address = clip(body.address, 500);
  const latitude = body.deliveryLatitude == null || body.deliveryLatitude === '' ? null : Number(body.deliveryLatitude);
  const longitude = body.deliveryLongitude == null || body.deliveryLongitude === '' ? null : Number(body.deliveryLongitude);
  const hasLatitude = body.deliveryLatitude != null && body.deliveryLatitude !== '';
  const hasLongitude = body.deliveryLongitude != null && body.deliveryLongitude !== '';
  if (contactName.length < 2 || (!phone && !email) || (phone && (!/^\+?[\d\s().-]{7,32}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15))
      || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return sendJson(res, 400, { ok: false, error: 'Укажите имя и корректный телефон или email' });
  }
  if (!address || hasLatitude !== hasLongitude || (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
      || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
    return sendJson(res, 400, { ok: false, error: 'Укажите адрес доставки и проверьте координаты' });
  }
  const rawDate = body.deliveryDate == null ? '' : String(body.deliveryDate);
  const date = clip(rawDate, 10);
  const time = clip(body.deliveryTime, 40);
  const parsedDeliveryDate = date ? Date.parse(`${date}T00:00:00Z`) : NaN;
  const normalizedDeliveryDate = Number.isFinite(parsedDeliveryDate) ? new Date(parsedDeliveryDate).toISOString().slice(0, 10) : '';
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (date && (rawDate !== date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || normalizedDeliveryDate !== date || date < todayUtc)) {
    return sendJson(res, 400, { ok: false, error: 'Проверьте дату доставки' });
  }
  let orderId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id,user_id FROM orders WHERE idempotency_key=$1', [idempotencyKey],
    );
    if (existing.rowCount) {
      if (String(existing.rows[0].user_id || '') !== String(sessionUser?.id || '')) {
        await client.query('ROLLBACK');
        return sendJson(res, 409, { ok: false, error: 'Ключ заказа уже использован' });
      }
      orderId = existing.rows[0].id;
      await client.query('COMMIT');
    } else {
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = ANY($1::text[]) AND is_active=TRUE ORDER BY id FOR UPDATE',
        [items.map((item) => item.id)],
      );
      const productsById = new Map(productResult.rows.map((product) => [product.id, product]));
      const unavailable = items.filter((item) => {
        const product = productsById.get(item.id);
        return !product || !['miner', 'computer'].includes(product.category)
          || product.currency !== 'USD' || Number(product.price) <= 0
          || product.stock == null || Number(product.stock) < item.quantity;
      });
      if (unavailable.length) {
        await client.query('ROLLBACK');
        return sendJson(res, 409, {
          ok: false, code: 'ITEM_UNAVAILABLE', error: 'Некоторые товары закончились или временно недоступны',
          unavailable: unavailable.map((item) => ({ id: item.id, available: Number(productsById.get(item.id)?.stock || 0) })),
        });
      }
      const priceChanged = items.some((item) => Math.round(item.clientPrice * 100) !== Math.round(Number(productsById.get(item.id).price) * 100));
      if (priceChanged) {
        await client.query('ROLLBACK');
        return sendJson(res, 409, {
          ok: false, code: 'PRICE_CHANGED', error: 'Цена изменилась. Проверьте новую сумму и подтвердите заказ.',
          items: items.map((item) => ({
            id: item.id, quantity: item.quantity, price: Number(productsById.get(item.id).price),
            stock: Number(productsById.get(item.id).stock), title: productsById.get(item.id).title,
          })),
        });
      }
      const itemsTotal = items.reduce((sum, item) => sum + Number(productsById.get(item.id).price) * item.quantity, 0);
      const settingsResult = await client.query("SELECT value FROM site_settings WHERE key='delivery'");
      const delivery = settingsResult.rows[0]?.value || {};
      let shippingFee = Number(delivery.baseFee || 0);
      let deliveryZone = '';
      if (Array.isArray(delivery.zones) && delivery.zones.length) {
        const normalizedAddress = address.toLocaleLowerCase('ru-RU');
        const zone = delivery.zones.find((candidate) => {
          const cityMatch = Array.isArray(candidate.cities)
            && candidate.cities.some((city) => city && normalizedAddress.includes(String(city).toLocaleLowerCase('ru-RU')));
          const pointMatch = latitude !== null && longitude !== null
            && Number.isFinite(Number(candidate.minLatitude)) && Number.isFinite(Number(candidate.maxLatitude))
            && Number.isFinite(Number(candidate.minLongitude)) && Number.isFinite(Number(candidate.maxLongitude))
            && latitude >= Number(candidate.minLatitude) && latitude <= Number(candidate.maxLatitude)
            && longitude >= Number(candidate.minLongitude) && longitude <= Number(candidate.maxLongitude);
          return cityMatch || pointMatch;
        });
        if (!zone) {
          await client.query('ROLLBACK');
          return sendJson(res, 400, { ok: false, code: 'DELIVERY_ZONE_UNAVAILABLE', error: 'Указанный адрес вне настроенных зон доставки. Свяжитесь с менеджером.' });
        }
        shippingFee = Number(zone.fee || 0);
        deliveryZone = clip(zone.name, 120);
      }
      if (delivery.freeFrom != null && itemsTotal >= Number(delivery.freeFrom)) shippingFee = 0;
      const deliveryIntervals = Array.isArray(delivery.intervals) ? delivery.intervals.filter(Boolean).map((value) => String(value)) : [];
      if (deliveryIntervals.length && !deliveryIntervals.includes(time)) {
        await client.query('ROLLBACK');
        return sendJson(res, 400, { ok: false, code: 'DELIVERY_INTERVAL_UNAVAILABLE', error: 'Выберите доступный интервал доставки' });
      }
      const total = itemsTotal + shippingFee;
      orderId = crypto.randomUUID();
      const orderInsert = await client.query(
        `INSERT INTO orders (id,idempotency_key,user_id,total,currency,contact_name,email,phone,address,
          delivery_latitude,delivery_longitude,delivery_date,delivery_time,comments,shipping_fee,delivery_zone,consent_at)
         VALUES ($1,$2,$3,$4,'USD',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()) RETURNING order_number`,
        [orderId, idempotencyKey, sessionUser?.id || null, total, contactName, email, phone, address,
          latitude, longitude, date, time, clip(body.comments, 2000), shippingFee, deliveryZone],
      );
      for (const item of items) {
        const product = productsById.get(item.id);
        const metadata = product.metadata || {};
        await client.query(
          `INSERT INTO order_items (order_id,product_id,title,sku,quantity,price,line_total,metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [orderId, product.id, product.title, product.sku || '', item.quantity, Number(product.price),
            Number(product.price) * item.quantity, JSON.stringify(metadata)],
        );
        await client.query('UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2', [item.quantity, product.id]);
        if (sessionUser?.id) {
          await client.query('DELETE FROM user_cart_items WHERE user_id=$1 AND product_id=$2', [sessionUser.id, item.id]);
        }
      }
      await client.query(
        "INSERT INTO order_status_history(order_id,previous_status,new_status,actor_id,reason) VALUES ($1,NULL,'pending',$2,'Заказ оформлен')",
        [orderId, sessionUser?.id || null],
      );
      const itemsSummary = items.map((item) => `${productsById.get(item.id).title} × ${item.quantity}`).join('; ');
      const notificationPayload = {
        type: 'order', orderId, orderNumber: orderInsert.rows[0].order_number, name: contactName, phone, email,
        address, deliveryDate: date, deliveryTime: time, comments: clip(body.comments, 2000), total,
        currency: 'USD', shippingFee, deliveryZone, itemsSummary,
      };
      await client.query(
        `INSERT INTO notification_outbox(entity_type,entity_id,payload) VALUES ('order',$1,$2)
         ON CONFLICT (entity_type,entity_id) DO NOTHING`, [orderId, JSON.stringify(notificationPayload)],
      );
      await client.query('COMMIT');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const order = (await getOrders('WHERE o.id = $1', [orderId]))[0];
  await processNotificationOutbox(orderId);
  const notification = await query('SELECT status,last_error FROM notification_outbox WHERE entity_type=\'order\' AND entity_id=$1', [orderId]);
  return sendJson(res, 201, {
    ok: true, order, stored: true, delivered: notification.rows[0]?.status === 'sent',
    notificationStatus: notification.rows[0]?.status || 'pending',
    deliveryQuoteRequired: !(await getSetting('delivery')).zones?.length,
  });
};

const publicOrigin = (req) => {
  const configured = String(process.env.PUBLIC_SITE_URL || '').trim();
  const protocol = String(req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'production' ? 'https' : 'http')).split(',')[0].trim();
  const raw = configured || `${protocol === 'https' ? 'https' : 'http'}://${req.headers.host || 'localhost'}`;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : 'https://localhost';
  } catch { return 'https://localhost'; }
};

const xmlEscape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const server = http.createServer(async (req, res) => {
  const incomingRequestId = String(req.headers['x-request-id'] || '');
  res.requestId = /^[A-Za-z0-9-]{1,80}$/.test(incomingRequestId) ? incomingRequestId : crypto.randomUUID();
  res.once('finish', () => {
    const status = Number(res.statusCode || 200);
    if (!req.url?.startsWith('/api/') || (req.method === 'GET' && status < 400)) return;
    const pathOnly = String(req.url).split('?')[0].slice(0, 240);
    query('INSERT INTO api_request_log(request_id,method,path,status_code,user_id) VALUES ($1,$2,$3,$4,$5)',
      [res.requestId, req.method, pathOnly, status, req.userId || null]).catch(() => {});
  });
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  try {
    const legacyRedirects = {
      '/it-outsourcing': '/it',
      '/calculator': '/services?kind=corporate',
    };
    if (req.method === 'GET' && legacyRedirects[pathname]) {
      res.writeHead(301, { Location: legacyRedirects[pathname] });
      return res.end();
    }
    if (!checkMutationOrigin(req)) {
      return sendJson(res, 403, { ok: false, code: 'ORIGIN_FORBIDDEN', error: 'Запрос с этого источника запрещён' });
    }
    if (req.method === 'GET' && pathname === '/robots.txt') {
      const origin = publicOrigin(req);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /cart\nDisallow: /profile\n\nSitemap: ${origin}/sitemap.xml\n`);
    }
    if (req.method === 'GET' && pathname === '/sitemap.xml') {
      const origin = publicOrigin(req);
      const paths = ['/', '/services', '/products', '/crypto', '/charts', '/news', '/privacy', '/consent', '/blog', '/it', '/accounting', '/ai', '/mining-services'];
      const products = await query("SELECT category,COALESCE(slug,id) slug,updated_at FROM products WHERE category IN ('miner','computer') AND is_active=TRUE AND currency='USD' AND price>0 AND stock IS NOT NULL AND NULLIF(BTRIM(sku),'') IS NOT NULL AND NULLIF(BTRIM(image),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'brand'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'model'),'') IS NOT NULL AND (category <> 'miner' OR (NULLIF(BTRIM(metadata->>'algorithm'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'coins'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'hashrate'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'power'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'noise'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'size'),'') IS NOT NULL AND NULLIF(BTRIM(metadata->>'weight'),'') IS NOT NULL)) ORDER BY updated_at DESC");
      const blogRows = await query('SELECT slug, updated_at FROM blog_posts WHERE is_published = TRUE ORDER BY published_at DESC NULLS LAST, id DESC').catch(() => ({ rows: [] }));
      const urls = paths.map((path) => `<url><loc>${xmlEscape(origin + path)}</loc></url>`);
      products.rows.forEach((product) => {
        urls.push(`<url><loc>${xmlEscape(`${origin}/products/${encodeURIComponent(product.slug)}`)}</loc><lastmod>${new Date(product.updated_at).toISOString().slice(0, 10)}</lastmod></url>`);
      });
      blogRows.rows.forEach((post) => {
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().slice(0, 10) : null;
        urls.push(`<url><loc>${xmlEscape(`${origin}/blog/${encodeURIComponent(post.slug)}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`);
      });
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
    }
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const rate = checkRouteRateLimit(req, 'register', 6, 60 * 60 * 1000);
      if (!rate.allowed) return sendJson(res, 429, { ok: false, error: `Слишком много запросов. Повторите через ${rate.retryAfterSec} с.` });
      return await authRegister(req, res);
    }
    if (req.method === 'POST' && pathname === '/api/auth/login') return await authLogin(req, res);
    if (req.method === 'POST' && pathname === '/api/auth/password') {
      const rate = checkRouteRateLimit(req, 'password-change', 8, 60 * 60 * 1000);
      if (!rate.allowed) return sendJson(res, 429, { ok: false, error: `Слишком много попыток смены пароля. Повторите через ${rate.retryAfterSec} с.` });
    }
    if (req.method === 'POST' && pathname === '/api/leads') {
      const rate = checkRouteRateLimit(req, 'lead', 10, 60 * 60 * 1000);
      if (!rate.allowed) return sendJson(res, 429, { ok: false, error: `Слишком много обращений. Повторите через ${rate.retryAfterSec} с.` });
    }
    if (req.method === 'POST' && pathname === '/api/orders') {
      const rate = checkRouteRateLimit(req, 'order', 8, 60 * 60 * 1000);
      if (!rate.allowed) return sendJson(res, 429, { ok: false, error: `Слишком много заказов. Повторите через ${rate.retryAfterSec} с.` });
    }
    if (req.method === 'POST' && pathname === '/api/reviews') {
      const rate = checkRouteRateLimit(req, 'review', 10, 60 * 60 * 1000);
      if (!rate.allowed) return sendJson(res, 429, { ok: false, error: `Слишком много отзывов. Повторите через ${rate.retryAfterSec} с.` });
    }
    if (req.method === 'GET' && pathname === '/api/services') {
      const kind = clip(url.searchParams.get('kind'), 20) || undefined;
      const category = clip(url.searchParams.get('category'), 40) || undefined;
      const direction = clip(url.searchParams.get('direction'), 40) || undefined;
      const offers = listOffers({ kind, category, direction });
      return sendJson(res, 200, { ok: true, version: loadServicesCatalog().version, offers });
    }
    if (req.method === 'GET' && pathname.startsWith('/api/services/')) {
      const offer = getOfferById(pathname.split('/').pop());
      if (!offer) return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', error: 'Услуга не найдена' });
      return sendJson(res, 200, { ok: true, offer });
    }
    if (req.method === 'GET' && pathname === '/api/blog') {
      const page = Math.max(1, Number(url.searchParams.get('page') || 1));
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 12)));
      const category = clip(url.searchParams.get('category'), 40);
      const values = [];
      let where = 'WHERE is_published = TRUE';
      if (category) {
        values.push(category);
        where += ` AND category = $${values.length}`;
      }
      const offset = (page - 1) * limit;
      values.push(limit, offset);
      const posts = await query(
        `SELECT id, legacy_id AS "legacyId", slug, category, title, excerpt, tags, published_at AS date
         FROM blog_posts ${where} ORDER BY published_at DESC NULLS LAST, id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      const total = await query(`SELECT COUNT(*)::int AS count FROM blog_posts ${where}`, category ? [category] : []);
      return sendJson(res, 200, {
        ok: true,
        posts: posts.rows,
        total: total.rows[0].count,
        page,
        limit,
      });
    }
    if (req.method === 'GET' && pathname.startsWith('/api/blog/')) {
      const slugOrId = decodeURIComponent(pathname.slice('/api/blog/'.length));
      const bySlug = await query(
        `SELECT id, legacy_id AS "legacyId", slug, category, title, excerpt, body, tags, published_at AS date
         FROM blog_posts WHERE slug = $1 OR legacy_id::text = $1 OR id::text = $1 LIMIT 1`,
        [slugOrId],
      );
      if (!bySlug.rowCount) return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', error: 'Статья не найдена' });
      return sendJson(res, 200, { ok: true, post: bySlug.rows[0] });
    }
    if (req.method === 'GET' && pathname === '/api/health') {
      await query('SELECT 1');
      const pending = await query("SELECT COUNT(*)::int AS count FROM notification_outbox WHERE status='pending'");
      return sendJson(res, 200, {
        ok: true, service: '01service-api', database: true,
        static: isProductionStaticEnabled() && buildExists(),
        telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        telegramSalesBotEnabled: String(process.env.TELEGRAM_BOT_ENABLED || '').toLowerCase() === 'true'
          && Boolean(process.env.TELEGRAM_BOT_TOKEN),
        maxConfigured: Boolean(process.env.MAX_WEBHOOK_URL),
        pendingNotifications: pending.rows[0].count,
      });
    }
    if (req.method === 'GET' && pathname === '/api/crypto/markets') {
      const markets = await getCryptoMarkets();
      return sendJson(res, 200, { ok: true, ...markets });
    }
    if (req.method === 'GET' && pathname === '/api/crypto/asset') {
      const metrics = await getCoinMetrics(clip(url.searchParams.get('asset'), 40), clip(url.searchParams.get('currency'), 8));
      return sendJson(res, 200, { ok: true, ...metrics });
    }
    if (req.method === 'GET' && pathname === '/api/crypto/chart') {
      const chart = await getHistoricalPrices(
        clip(url.searchParams.get('asset'), 40),
        clip(url.searchParams.get('currency'), 8),
        url.searchParams.get('days'),
      );
      return sendJson(res, 200, { ok: true, ...chart });
    }
    if (req.method === 'GET' && pathname === '/api/crypto/fx') {
      const fx = await getUsdRubRate();
      return sendJson(res, 200, { ok: true, ...fx });
    }
    if (req.method === 'POST' && pathname === '/api/delivery/quote') {
      const body = await readJsonBody(req);
      const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
      if (body.consent !== true || !clip(body.address, 500) || !items.length) return sendJson(res, 400, { ok: false, error: 'Укажите адрес и товары для расчёта доставки' });
      const ids = items.map((item) => clip(item.id, 120));
      if (items.some((item) => !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 100)) {
        return sendJson(res, 400, { ok: false, error: 'Проверьте количество товаров' });
      }
      const products = await query('SELECT id,category,price,currency,stock,is_active FROM products WHERE id=ANY($1::text[])', [ids]);
      const byId = new Map(products.rows.map((product) => [product.id, product]));
      const unavailable = items.some((item) => {
        const product = byId.get(clip(item.id, 120));
        return !product || !['miner', 'computer'].includes(product.category) || product.currency !== 'USD' || !product.is_active || Number(product.price) <= 0 || product.stock == null || Number(product.stock) < Number(item.quantity);
      });
      if (unavailable) return sendJson(res, 409, { ok: false, code: 'ITEM_UNAVAILABLE', error: 'Некоторые товары закончились или временно недоступны' });
      const total = items.reduce((sum, item) => sum + Number(byId.get(clip(item.id, 120)).price) * Number(item.quantity), 0);
      const delivery = await getSetting('delivery');
      let shippingFee = Number(delivery.baseFee || 0);
      let zone = null;
      const address = clip(body.address, 500).toLocaleLowerCase('ru-RU');
      if (Array.isArray(delivery.zones) && delivery.zones.length) {
        const latitude = body.latitude == null || body.latitude === '' ? null : Number(body.latitude);
        const longitude = body.longitude == null || body.longitude === '' ? null : Number(body.longitude);
      const hasLatitude = body.latitude != null && body.latitude !== '';
      const hasLongitude = body.longitude != null && body.longitude !== '';
      if (hasLatitude !== hasLongitude || (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
          || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
        return sendJson(res, 400, { ok: false, error: 'Проверьте координаты адреса доставки' });
      }
        zone = delivery.zones.find((candidate) => {
          const cityMatch = Array.isArray(candidate.cities)
            && candidate.cities.some((city) => address.includes(String(city).toLocaleLowerCase('ru-RU')));
          const pointMatch = latitude !== null && longitude !== null
            && Number.isFinite(latitude) && Number.isFinite(longitude)
            && Number.isFinite(Number(candidate.minLatitude)) && Number.isFinite(Number(candidate.maxLatitude))
            && Number.isFinite(Number(candidate.minLongitude)) && Number.isFinite(Number(candidate.maxLongitude))
            && latitude >= Number(candidate.minLatitude) && latitude <= Number(candidate.maxLatitude)
            && longitude >= Number(candidate.minLongitude) && longitude <= Number(candidate.maxLongitude);
          return cityMatch || pointMatch;
        });
        if (!zone) return sendJson(res, 400, { ok: false, error: 'Адрес вне настроенных зон доставки' });
        shippingFee = Number(zone.fee || 0);
      }
      if (delivery.freeFrom != null && total >= Number(delivery.freeFrom)) shippingFee = 0;
      return sendJson(res, 200, { ok: true, quote: {
        subtotal: total, shippingFee, total: total + shippingFee,
        zone: zone?.name || '', deliveryQuoteRequired: !Array.isArray(delivery.zones) || !delivery.zones.length,
        currency: 'USD', note: delivery.note || '', intervals: Array.isArray(delivery.intervals) ? delivery.intervals : [],
      } });
    }
    if (req.method === 'GET' && pathname === '/api/settings/public') {
      const [contacts, delivery] = await Promise.all([getSetting('contacts'), getSetting('delivery')]);
      return sendJson(res, 200, {
        ok: true,
        contacts: {
          telegramUrl: contacts.telegramUrl || '', maxUrl: contacts.maxUrl || '',
          telegramBotUrl: contacts.telegramBotUrl || process.env.PUBLIC_TELEGRAM_BOT_URL || '',
          email: contacts.email || '', phone: contacts.phone || '',
        },
        delivery: {
          note: delivery.note || 'Стоимость и сроки доставки подтверждаются менеджером.',
          configured: Array.isArray(delivery.zones) && delivery.zones.length > 0,
          intervals: Array.isArray(delivery.intervals) ? delivery.intervals : [],
        },
      });
    }
    if (req.method === 'GET' && pathname === '/api/openapi.json') {
      return sendJson(res, 200, OPENAPI_SPEC);
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
      if (user) req.userId = user.id;
      return sendJson(res, 200, { ok: true, authenticated: Boolean(user), user: mapUser(user) });
    }
    if (pathname === '/api/cart' || pathname === '/api/cart/merge') {
      const user = await requireUser(req, res); if (!user) return;
      if (user.role !== 'customer') return sendJson(res, 403, { ok: false, error: 'Корзина доступна покупателям' });
      if (req.method === 'GET' && pathname === '/api/cart') {
        return sendJson(res, 200, { ok: true, items: await getAccountCart(user.id) });
      }
      if (req.method === 'PUT' && pathname === '/api/cart') {
        const body = await readJsonBody(req);
        const result = await saveAccountCart(user.id, body.items || [], false);
        return sendJson(res, 200, { ok: true, ...result });
      }
      if (req.method === 'POST' && pathname === '/api/cart/merge') {
        const body = await readJsonBody(req);
        const result = await saveAccountCart(user.id, body.items || [], true);
        return sendJson(res, 200, { ok: true, ...result });
      }
    }
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const sessionUser = await getSessionUser(req);
      if (sessionUser) req.userId = sessionUser.id;
      await clearSession(req);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': userSessionCookie('', 0) });
    }
    if (req.method === 'PATCH' && pathname === '/api/auth/profile') {
      const user = await requireUser(req, res); if (!user) return;
      const body = await readJsonBody(req);
      const email = normalizeEmail(body.email);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { ok: false, error: 'Укажите корректный email' });
      if (!clip(body.firstName, 100)) return sendJson(res, 400, { ok: false, error: 'Укажите имя' });
      try {
        const result = await query(
          `UPDATE users SET name=$1,first_name=$2,last_name=$3,patronymic=$4,phone=$5,address=$6,email=$7,updated_at=NOW()
           WHERE id=$8 RETURNING id,username,email,role,name,first_name AS "firstName",last_name AS "lastName",patronymic,phone,address,is_active`,
          [clip(body.name, 160), clip(body.firstName, 100), clip(body.lastName, 100), clip(body.patronymic, 100), clip(body.phone, 80), clip(body.address, 500), email, user.id],
        );
        return sendJson(res, 200, { ok: true, user: mapUser(result.rows[0]) });
      } catch (error) {
        if (error.code === '23505') return sendJson(res, 409, { ok: false, error: 'Этот email уже используется' });
        throw error;
      }
    }
    if (req.method === 'POST' && pathname === '/api/auth/password') {
      const user = await requireUser(req, res); if (!user) return;
      const body = await readJsonBody(req);
      const result = await query('SELECT password_hash FROM users WHERE id=$1', [user.id]);
      if (!verifyPassword(String(body.currentPassword || ''), result.rows[0]?.password_hash)) return sendJson(res, 400, { ok: false, error: 'Текущий пароль указан неверно' });
      const newPassword = String(body.newPassword || '');
      if (newPassword !== String(body.confirmPassword || '')) return sendJson(res, 400, { ok: false, error: 'Новые пароли не совпадают' });
      if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) return sendJson(res, 400, { ok: false, error: 'Новый пароль должен быть от 8 до 72 байт' });
      await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [hashPassword(newPassword), user.id]);
      const token = await createUserSession(user.id);
      await revokeOtherSessions(user.id, token);
      return sendJson(res, 200, { ok: true, otherSessionsClosed: true }, { 'Set-Cookie': userSessionCookie(token) });
    }
    if (req.method === 'GET' && pathname === '/api/orders') {
      const user = await requireUser(req, res); if (!user) return;
      return sendJson(res, 200, { ok: true, orders: await getOrders('WHERE o.user_id = $1', [user.id]) });
    }
    if (req.method === 'POST' && pathname === '/api/orders') return await createOrder(req, res);
    const cancelMatch = pathname.match(/^\/api\/orders\/([0-9a-f-]+)\/cancel$/i);
    const orderDetailMatch = pathname.match(/^\/api\/orders\/([0-9a-f-]+)$/i);
    if (req.method === 'GET' && orderDetailMatch) {
      const user = await requireUser(req, res); if (!user) return;
      const order = (await getOrders('WHERE o.id = $1 AND (o.user_id=$2 OR $3=TRUE)', [orderDetailMatch[1], user.id, user.role === 'admin']))[0];
      if (!order) return sendJson(res, 404, { ok: false, error: 'Заказ не найден' });
      return sendJson(res, 200, { ok: true, order });
    }
    if ((req.method === 'PATCH' || req.method === 'POST') && cancelMatch) {
      const user = await requireUser(req, res); if (!user) return;
      const body = await readJsonBody(req);
      const reason = clip(body.reason, 500);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const current = await client.query("SELECT status FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE", [cancelMatch[1], user.id]);
        if (!current.rowCount || current.rows[0].status !== 'pending') {
          await client.query('ROLLBACK');
          return sendJson(res, 409, { ok: false, error: 'Покупатель может отменить только новый заказ. По остальным свяжитесь с менеджером.' });
        }
        await client.query("UPDATE orders SET status='cancelled_customer',cancel_reason=$1,updated_at=NOW() WHERE id=$2", [reason, cancelMatch[1]]);
        await client.query(
          "INSERT INTO order_status_history(order_id,previous_status,new_status,actor_id,reason) VALUES ($1,'pending','cancelled_customer',$2,$3)",
          [cancelMatch[1], user.id, reason],
        );
        await client.query(
          `UPDATE products p SET stock=p.stock+oi.quantity,updated_at=NOW()
           FROM order_items oi WHERE oi.order_id=$1 AND p.id=oi.product_id AND p.stock IS NOT NULL`, [cancelMatch[1]],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
      return sendJson(res, 200, { ok: true, order: (await getOrders('WHERE o.id=$1', [cancelMatch[1]]))[0] });
    }
    if (req.method === 'GET' && pathname === '/api/reviews') {
      if (url.searchParams.get('mine') === '1') {
        const user = await requireUser(req, res); if (!user) return;
        const mine = await query('SELECT order_id,product_id,status FROM reviews WHERE user_id=$1', [user.id]);
        return sendJson(res, 200, { ok: true, reviews: mine.rows.map((row) => ({ orderId: row.order_id, productId: row.product_id, status: row.status })) });
      }
      const values = []; let where = `WHERE r.status = 'approved'`;
      if (url.searchParams.get('productId')) { values.push(clip(url.searchParams.get('productId'), 120)); where += ' AND r.product_id = $1'; }
      const result = await query(`SELECT r.*, COALESCE(p.title,'') product_title FROM reviews r LEFT JOIN products p ON p.id = r.product_id ${where} ORDER BY r.created_at DESC LIMIT 100`, values);
      const summary = await query(`SELECT COUNT(*)::int count, COALESCE(AVG(rating),0)::numeric(4,2) average FROM reviews ${where.replaceAll('r.', '')}`, values);
      return sendJson(res, 200, { ok: true, reviews: result.rows.map(mapReview), summary: { count: summary.rows[0].count, average: Number(summary.rows[0].average) } });
    }
    const productIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (req.method === 'GET' && productIdMatch) {
      const result = await query(
        `SELECT p.*,
          (SELECT COUNT(*)::int FROM reviews r WHERE r.product_id=p.id AND r.status='approved') AS review_count,
          (SELECT COALESCE(AVG(r.rating),0)::numeric(4,2) FROM reviews r WHERE r.product_id=p.id AND r.status='approved') AS average_rating
         FROM products p WHERE (p.id = $1 OR p.slug = $1) AND p.is_active = TRUE
           AND p.category IN ('miner','computer') AND p.currency='USD' AND p.price>0
         AND p.stock IS NOT NULL AND NULLIF(BTRIM(p.sku),'') IS NOT NULL AND NULLIF(BTRIM(p.image),'') IS NOT NULL
         AND NULLIF(BTRIM(p.metadata->>'brand'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'model'),'') IS NOT NULL
         AND (p.category <> 'miner' OR (NULLIF(BTRIM(p.metadata->>'algorithm'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'coins'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'hashrate'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'power'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'noise'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'size'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'weight'),'') IS NOT NULL)) LIMIT 1`,
        [clip(productIdMatch[1], 120)],
      );
      if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Товар не найден' });
      const row = result.rows[0];
      const product = mapProductRow(row, { minerShape: row.category === 'miner' });
      return sendJson(res, 200, { ok: true, product });
    }
    if (req.method === 'GET' && pathname === '/api/products') {
      const category = clip(url.searchParams.get('category'), 80);
      const values = []; let where = "WHERE p.is_active = TRUE AND p.category IN ('miner','computer') AND p.currency='USD' AND p.price>0 AND p.stock IS NOT NULL AND NULLIF(BTRIM(p.sku),'') IS NOT NULL AND NULLIF(BTRIM(p.image),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'brand'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'model'),'') IS NOT NULL AND (p.category <> 'miner' OR (NULLIF(BTRIM(p.metadata->>'algorithm'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'coins'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'hashrate'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'power'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'noise'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'size'),'') IS NOT NULL AND NULLIF(BTRIM(p.metadata->>'weight'),'') IS NOT NULL))";
      if (category) { values.push(category); where += ' AND p.category = $1'; }
      const result = await query(`SELECT p.*,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.product_id=p.id AND r.status='approved') AS review_count,
        (SELECT COALESCE(AVG(r.rating),0)::numeric(4,2) FROM reviews r WHERE r.product_id=p.id AND r.status='approved') AS average_rating
        FROM products p ${where} ORDER BY p.created_at DESC`, values);
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
      const productId = clip(body.productId, 120);
      if (!productId) return sendJson(res, 400, { ok: false, error: 'Выберите товар из завершённого заказа' });
      const order = await query(
        `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id=o.id
         WHERE o.id=$1 AND o.user_id=$2 AND o.status='completed' AND oi.product_id=$3`, [body.orderId, user.id, productId],
      );
      if (!order.rowCount) return sendJson(res, 400, { ok: false, error: 'Отзыв доступен только на товар из вашего завершённого заказа' });
      try {
        const result = await query(`INSERT INTO reviews (id,user_id,order_id,product_id,author_name,rating,text) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [crypto.randomUUID(), user.id, body.orderId, productId, clip([user.firstName || user.name, user.lastName].filter(Boolean).join(' '), 160), rating, text]);
        return sendJson(res, 201, { ok: true, review: mapReview(result.rows[0]) });
      } catch (error) {
        if (error.code === '23505') return sendJson(res, 409, { ok: false, error: 'Вы уже оставляли отзыв по этому заказу' });
        throw error;
      }
    }
    if (req.method === 'POST' && pathname === '/api/leads') {
      const user = await getSessionUser(req);
      if (user) req.userId = user.id;
      const lead = await createLead(await readJsonBody(req), user?.id || null);
      await processNotificationOutbox(lead.id);
      const notification = await query("SELECT status,last_error FROM notification_outbox WHERE entity_type='lead' AND entity_id=$1", [lead.id]);
      return sendJson(res, 201, { ok: true, stored: true, leadId: lead.id, leadNumber: lead.leadNumber,
        delivered: notification.rows[0]?.status === 'sent',
        notificationStatus: notification.rows[0]?.status || 'pending' });
    }

    if (pathname.startsWith('/api/admin/')) {
      if (req.method === 'GET' && pathname === '/api/admin/session') {
        const sessionUser = await getSessionUser(req);
        if (sessionUser) req.userId = sessionUser.id;
        return sendJson(res, 200, { ok: true, authenticated: sessionUser?.role === 'admin', user: mapUser(sessionUser) });
      }
      const admin = await requireAdmin(req, res); if (!admin) return;
      const auditAdminAction = (entry) => logAdminAction(query, { ...entry, requestId: res.requestId });
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
        const values = [admin.id];
        let where = 'WHERE id<>$1';
        const search = appendSearch(['name', 'email', 'phone', 'first_name', 'last_name'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const list = await query(
          `SELECT id,email,name,first_name AS "firstName",last_name AS "lastName",phone,role,is_active AS "isActive",created_at AS "createdAt"
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
      if (req.method === 'GET' && pathname === '/api/admin/settings') {
        const [contacts, delivery] = await Promise.all([getSetting('contacts'), getSetting('delivery')]);
        return sendJson(res, 200, { ok: true, settings: { contacts, delivery } });
      }
      if (req.method === 'PATCH' && pathname === '/api/admin/settings') {
        const body = await readJsonBody(req);
        if (body.contacts && typeof body.contacts === 'object' && !Array.isArray(body.contacts)) {
          const contacts = {
            telegramUrl: clip(body.contacts.telegramUrl, 300), maxUrl: clip(body.contacts.maxUrl, 300),
            telegramBotUrl: clip(body.contacts.telegramBotUrl, 300),
            email: normalizeEmail(body.contacts.email), phone: clip(body.contacts.phone, 80),
          };
          for (const key of ['telegramUrl', 'telegramBotUrl', 'maxUrl']) {
            if (contacts[key] && !/^https:\/\//i.test(contacts[key])) return sendJson(res, 400, { ok: false, error: 'Ссылки Telegram и MAX должны использовать HTTPS' });
          }
          if (contacts.telegramBotUrl) {
            let botUrl;
            try { botUrl = new URL(contacts.telegramBotUrl); } catch { botUrl = null; }
            if (botUrl?.hostname.toLowerCase() !== 't.me' || !botUrl.pathname.split('/').filter(Boolean)[0]) {
              return sendJson(res, 400, { ok: false, error: 'Укажите публичную ссылку бота вида https://t.me/имя_бота' });
            }
          }
          if (contacts.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email)) return sendJson(res, 400, { ok: false, error: 'Проверьте контактный email' });
          await query(
            `INSERT INTO site_settings(key,value,updated_by) VALUES ('contacts',$1,$2)
             ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
            [JSON.stringify(contacts), admin.id],
          );
          await auditAdminAction({ adminUserId: admin.id, action: 'settings.update', entityType: 'settings', entityId: 'contacts', details: { keys: Object.keys(contacts) } });
        }
        if (body.delivery && typeof body.delivery === 'object' && !Array.isArray(body.delivery)) {
          const baseFee = Number(body.delivery.baseFee || 0);
          const freeFrom = body.delivery.freeFrom == null || body.delivery.freeFrom === '' ? null : Number(body.delivery.freeFrom);
          const zones = Array.isArray(body.delivery.zones) ? body.delivery.zones.slice(0, 20).map((zone) => ({
            name: clip(zone.name, 120), fee: Number(zone.fee || 0),
            cities: Array.isArray(zone.cities) ? zone.cities.slice(0, 30).map((city) => clip(city, 100)).filter(Boolean) : [],
            minLatitude: zone.minLatitude === '' || zone.minLatitude == null ? null : Number(zone.minLatitude),
            maxLatitude: zone.maxLatitude === '' || zone.maxLatitude == null ? null : Number(zone.maxLatitude),
            minLongitude: zone.minLongitude === '' || zone.minLongitude == null ? null : Number(zone.minLongitude),
            maxLongitude: zone.maxLongitude === '' || zone.maxLongitude == null ? null : Number(zone.maxLongitude),
          })) : [];
          if (!Number.isFinite(baseFee) || baseFee < 0 || (freeFrom !== null && (!Number.isFinite(freeFrom) || freeFrom < 0))
              || zones.some((zone) => !zone.name || !Number.isFinite(zone.fee) || zone.fee < 0)) {
            return sendJson(res, 400, { ok: false, error: 'Проверьте тарифы доставки' });
          }
          const intervals = Array.isArray(body.delivery.intervals)
            ? body.delivery.intervals.slice(0, 24).map((interval) => clip(interval, 80)).filter(Boolean)
            : [];
          const validInterval = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
          if (intervals.some((interval) => !validInterval.test(interval))) {
            return sendJson(res, 400, { ok: false, error: 'Введите интервалы в формате HH:MM-HH:MM' });
          }
          const delivery = { baseFee, freeFrom, zones, intervals, note: clip(body.delivery.note, 400), currency: 'USD' };
          await query(
            `INSERT INTO site_settings(key,value,updated_by) VALUES ('delivery',$1,$2)
             ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
            [JSON.stringify(delivery), admin.id],
          );
          await auditAdminAction({ adminUserId: admin.id, action: 'settings.update', entityType: 'settings', entityId: 'delivery', details: { zoneCount: zones.length } });
        }
        return sendJson(res, 200, { ok: true, settings: { contacts: await getSetting('contacts'), delivery: await getSetting('delivery') } });
      }
      if (req.method === 'POST' && pathname === '/api/admin/products') {
        const body = await readJsonBody(req);
        const title = clip(body.title, 240);
        const category = ['miner', 'computer', 'other'].includes(body.category) ? body.category : null;
        const price = Number(body.price);
        const stock = body.stock === '' || body.stock == null ? null : Number(body.stock);
        const isActive = body.isActive === true;
        if (!title || !category || !Number.isFinite(price) || price < 0 || (stock !== null && (!Number.isSafeInteger(stock) || stock < 0))) {
          return sendJson(res, 400, { ok: false, error: 'Укажите название, категорию, цену USD и целый остаток' });
        }
        const id = crypto.randomUUID();
        const images = Array.isArray(body.images) ? body.images.slice(0, 8).map((image) => clip(image, 500)) : [];
        const image = clip(body.image || images[0], 500) || null;
        const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
        const sku = clip(body.sku, 80);
        const description = clip(body.description, 4000);
        const warranty = clip(body.warranty, 500);
        const shippingTime = clip(body.shippingTime, 160);
        if (isActive && !isPublishableProduct({ category, price, sku, stock, description, image, warranty, shippingTime, metadata })) {
          return sendJson(res, 400, { ok: false, error: 'Для публикации нужны бренд и модель, SKU, описание, цена USD, остаток, фото, гарантия и срок поставки. Для майнера также заполните алгоритм, монеты, хешрейт, потребление, шум, размер и вес.' });
        }
        const result = await query(
          `INSERT INTO products(id,sku,slug,title,category,price,currency,description,image,images,stock,warranty,shipping_time,metadata,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,'USD',$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [id, sku || null, clip(body.slug, 160) || id, title, category, price,
            description, image, JSON.stringify(images), stock, warranty,
            shippingTime, JSON.stringify(metadata), isActive],
        );
        await auditAdminAction({ adminUserId: admin.id, action: 'product.create', entityType: 'product', entityId: id, details: { title, category } });
        return sendJson(res, 201, { ok: true, product: mapProductRow(result.rows[0]) });
      }
      const notificationRetry = pathname.match(/^\/api\/admin\/notifications\/(\d+)\/retry$/);
      if (req.method === 'POST' && notificationRetry) {
        const result = await query("UPDATE notification_outbox SET status='pending',attempts=0,last_error='',next_attempt_at=NOW() WHERE id=$1 AND status='failed' RETURNING id,entity_id", [notificationRetry[1]]);
        if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Уведомление не найдено' });
        await processNotificationOutbox(result.rows[0].entity_id);
        await auditAdminAction({ adminUserId: admin.id, action: 'notification.retry', entityType: 'notification', entityId: notificationRetry[1] });
        return sendJson(res, 200, { ok: true });
      }
      const userStatus = pathname.match(/^\/api\/admin\/users\/(\d+)\/status$/);
      if (req.method === 'PATCH' && userStatus) {
        const body = await readJsonBody(req);
        if (typeof body.isActive !== 'boolean') return sendJson(res, 400, { ok: false, error: 'Укажите новое состояние учётной записи' });
        const result = await query("UPDATE users SET is_active=$1,updated_at=NOW() WHERE id=$2 AND role='customer' RETURNING id,is_active", [body.isActive, userStatus[1]]);
        if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Клиент не найден' });
        if (!body.isActive) await query('DELETE FROM sessions WHERE user_id=$1', [userStatus[1]]);
        await auditAdminAction({ adminUserId: admin.id, action: 'user.status', entityType: 'user', entityId: userStatus[1], details: { isActive: body.isActive } });
        return sendJson(res, 200, { ok: true, user: result.rows[0] });
      }
      const userRole = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
      if (req.method === 'PATCH' && userRole) {
        const body = await readJsonBody(req);
        if (!['customer', 'admin'].includes(body.role) || String(userRole[1]) === String(admin.id)) {
          return sendJson(res, 400, { ok: false, error: 'Укажите допустимую роль другого пользователя' });
        }
        const client = await pool.connect();
        let result;
        try {
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(17012026)');
          if (body.role === 'customer') {
            const target = await client.query('SELECT role,is_active FROM users WHERE id=$1 FOR UPDATE', [userRole[1]]);
            if (!target.rowCount) { await client.query('ROLLBACK'); return sendJson(res, 404, { ok: false, error: 'Пользователь не найден' }); }
            if (target.rows[0].role === 'admin' && target.rows[0].is_active) {
              const count = await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role='admin' AND is_active=TRUE");
              if (count.rows[0].count <= 1) {
                await client.query('ROLLBACK');
                return sendJson(res, 409, { ok: false, error: 'Нельзя снять роль у последнего активного администратора' });
              }
            }
          }
          result = await client.query('UPDATE users SET role=$1,updated_at=NOW() WHERE id=$2 AND id<>$3 RETURNING id,role', [body.role, userRole[1], admin.id]);
          if (!result.rowCount) { await client.query('ROLLBACK'); return sendJson(res, 404, { ok: false, error: 'Пользователь не найден' }); }
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
        if (body.role !== 'admin') await query('DELETE FROM sessions WHERE user_id=$1', [userRole[1]]);
        await auditAdminAction({ adminUserId: admin.id, action: 'user.role', entityType: 'user', entityId: userRole[1], details: { role: body.role } });
        return sendJson(res, 200, { ok: true, user: result.rows[0] });
      }
      const productDelete = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
      if (req.method === 'DELETE' && productDelete) {
        const result = await query('UPDATE products SET is_active=FALSE,updated_at=NOW() WHERE id=$1 RETURNING id', [productDelete[1]]);
        if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Товар не найден' });
        await auditAdminAction({ adminUserId: admin.id, action: 'product.hide', entityType: 'product', entityId: productDelete[1] });
        return sendJson(res, 200, { ok: true });
      }
      if (req.method === 'GET' && pathname === '/api/admin/notifications') {
        const { page, limit, offset, q, status } = parseAdminListParams(url, clip);
        const values = []; let where = 'WHERE 1=1';
        if (status && status !== 'all') { values.push(status); where += ` AND n.status=$${values.length}`; }
        const search = appendSearch(['n.entity_type', 'n.entity_id', 'n.last_error'], q, values);
        where += search.clause;
        values.push(limit, offset);
        const list = await query(`SELECT n.id,n.entity_type,n.entity_id,n.status,n.attempts,n.last_error,n.next_attempt_at,n.sent_at,n.created_at
          FROM notification_outbox n ${where} ORDER BY n.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
        const count = await query(`SELECT COUNT(*)::int count FROM notification_outbox n ${where}`, values.slice(0, -2));
        return sendJson(res, 200, { ok: true, notifications: list.rows, pagination: paginationMeta(page, limit, count.rows[0].count) });
      }
      const productPatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
      if (req.method === 'PATCH' && productPatch) {
        const body = await readJsonBody(req);
        const currentResult = await query('SELECT * FROM products WHERE id=$1', [productPatch[1]]);
        if (!currentResult.rowCount) return sendJson(res, 404, { ok: false, error: 'Товар не найден' });
        const current = currentResult.rows[0];
        const price = body.price == null ? Number(current.price) : Number(body.price);
        const image = body.image == null ? current.image : clip(body.image, 500);
        const sku = body.sku == null ? current.sku : clip(body.sku, 80);
        const stock = body.stock == null ? current.stock : Number(body.stock);
        const warranty = body.warranty == null ? current.warranty : clip(body.warranty, 500);
        const shippingTime = body.shippingTime == null ? current.shipping_time : clip(body.shippingTime, 160);
        const description = body.description == null ? current.description : clip(body.description, 4000);
        const metadata = body.metadata == null ? current.metadata : body.metadata;
        const category = body.category == null ? current.category : body.category;
        const remainsActive = body.isActive == null ? current.is_active : body.isActive === true;
        if (remainsActive && !isPublishableProduct({ category, price, currency: current.currency, sku, stock, description, image, warranty, shippingTime, metadata })) {
          return sendJson(res, 400, { ok: false, error: 'Для публикации нужны бренд и модель, SKU, описание, цена USD, наличие, фото, гарантия и срок поставки. Для майнера укажите алгоритм, монеты, хешрейт, потребление, шум, размер и вес.' });
        }
        const fields = [];
        const values = [];
        const pushField = (sql, value) => { values.push(value); fields.push(`${sql} = $${values.length}`); };
        if (body.title != null) pushField('title', clip(body.title, 240));
        if (body.description != null) pushField('description', clip(body.description, 4000));
        if (body.category != null) {
          if (!['miner', 'computer', 'other'].includes(body.category)) return sendJson(res, 400, { ok: false, error: 'Укажите допустимую категорию товара' });
          pushField('category', body.category);
        }
        if (body.sku !== undefined) pushField('sku', clip(body.sku, 80) || null);
        if (body.slug !== undefined) pushField('slug', clip(body.slug, 160) || null);
        if (body.price != null) {
          const price = Number(body.price);
          if (!Number.isFinite(price) || price <= 0) return sendJson(res, 400, { ok: false, error: 'Цена должна быть положительной суммой в USD' });
          pushField('price', price);
        }
        if (body.stock != null) {
          const stock = Number(body.stock);
          if (!Number.isSafeInteger(stock) || stock < 0) return sendJson(res, 400, { ok: false, error: 'Остаток должен быть целым числом от 0' });
          pushField('stock', stock);
        }
        if (body.warranty != null) pushField('warranty', clip(body.warranty, 500));
        if (body.shippingTime != null) pushField('shipping_time', clip(body.shippingTime, 160));
        if (Array.isArray(body.images)) pushField('images', JSON.stringify(body.images.slice(0, 8).map((image) => clip(image, 500))));
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
        await auditAdminAction({
          adminUserId: admin.id,
          action: 'product.update',
          entityType: 'product',
          entityId: productPatch[1],
          details: {
            changedFields: fields.map((field) => field.slice(0, field.indexOf(' ='))),
            ...(body.title != null ? { title: clip(body.title, 240) } : {}),
            ...(body.category != null ? { category: body.category } : {}),
            ...(body.price != null ? { price: Number(body.price), currency: 'USD' } : {}),
            ...(body.stock != null ? { stock: Number(body.stock) } : {}),
            ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
          },
        });
        return sendJson(res, 200, { ok: true, product: mapProductRow(result.rows[0]) });
      }
      const leadStatus = pathname.match(/^\/api\/admin\/leads\/([0-9a-f-]+)\/status$/i);
      const orderStatus = pathname.match(/^\/api\/admin\/orders\/([0-9a-f-]+)(?:\/status)?$/i);
      const reviewStatus = pathname.match(/^\/api\/admin\/reviews\/([0-9a-f-]+)(?:\/status)?$/i);
      if (req.method === 'PATCH' && (leadStatus || orderStatus || reviewStatus)) {
        const body = await readJsonBody(req); const code = toStatusCode(body.status);
        if (leadStatus && ['new', 'processing', 'completed', 'cancelled'].includes(code)) {
          const prev = await query('SELECT status FROM leads WHERE id=$1', [leadStatus[1]]);
          const result = await query('UPDATE leads SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [code, leadStatus[1]]);
          if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Заявка не найдена' });
          await auditAdminAction({
            adminUserId: admin.id,
            action: 'lead.status',
            entityType: 'lead',
            entityId: leadStatus[1],
            details: { from: prev.rows[0]?.status, to: code },
          });
          return sendJson(res, 200, { ok: true, lead: mapLead(result.rows[0]) });
        }
        if (orderStatus && Object.values(ORDER_TRANSITIONS).some((statuses) => statuses.includes(code))) {
          const reason = clip(body.reason, 500);
          if (['cancelled_admin'].includes(code) && !reason) return sendJson(res, 400, { ok: false, error: 'Для отмены администратором укажите причину' });
          const client = await pool.connect();
          let result; let previousStatus;
          try {
            await client.query('BEGIN');
            const prev = await client.query('SELECT status FROM orders WHERE id=$1 FOR UPDATE', [orderStatus[1]]);
            if (!prev.rowCount) { await client.query('ROLLBACK'); return sendJson(res, 404, { ok: false, error: 'Заказ не найден' }); }
            previousStatus = prev.rows[0].status;
            if (!ORDER_TRANSITIONS[previousStatus]?.includes(code)) {
              await client.query('ROLLBACK');
              return sendJson(res, 409, { ok: false, error: `Недопустимый переход из статуса «${statusLabel[previousStatus] || previousStatus}»` });
            }
            result = await client.query('UPDATE orders SET status=$1,cancel_reason=CASE WHEN $1=\'cancelled_admin\' THEN $2 ELSE cancel_reason END,updated_at=NOW() WHERE id=$3 RETURNING id,status', [code, reason, orderStatus[1]]);
            if (code === 'cancelled_admin' && previousStatus !== 'shipped') {
              await client.query(`UPDATE products p SET stock=p.stock+oi.quantity,updated_at=NOW() FROM order_items oi WHERE oi.order_id=$1 AND p.id=oi.product_id AND p.stock IS NOT NULL`, [orderStatus[1]]);
            }
            await client.query('INSERT INTO order_status_history(order_id,previous_status,new_status,actor_id,reason) VALUES ($1,$2,$3,$4,$5)', [orderStatus[1], previousStatus, code, admin.id, reason]);
            await client.query('COMMIT');
          } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
          await auditAdminAction({
            adminUserId: admin.id,
            action: 'order.status',
            entityType: 'order',
            entityId: orderStatus[1],
            details: { from: previousStatus, to: code, reason: code === 'cancelled_admin' ? reason : '' },
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
        if (reviewStatus && ['approved', 'rejected', 'pending', 'hidden', 'deleted'].includes(code)) {
          const prev = await query('SELECT status FROM reviews WHERE id=$1', [reviewStatus[1]]);
          const result = await query('UPDATE reviews SET status=$1,moderation_note=$2,moderated_by=$3,moderated_at=NOW(),updated_at=NOW() WHERE id=$4 RETURNING *', [code, clip(body.note, 500), admin.id, reviewStatus[1]]);
          if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Отзыв не найден' });
          await auditAdminAction({
            adminUserId: admin.id,
            action: 'review.status',
            entityType: 'review',
            entityId: reviewStatus[1],
            details: { from: prev.rows[0]?.status, to: code, note: clip(body.note, 500) },
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
    console.error(JSON.stringify({ requestId: res.requestId, method: req.method, path: pathname, code: error.code || 'INTERNAL_ERROR' }));
    const duplicate = error.code === '23505';
    const status = Number(error.statusCode || (duplicate ? 409 : 500));
    const code = /^[A-Z][A-Z0-9_]{1,63}$/.test(String(error.code || ''))
      ? error.code
      : duplicate ? 'DUPLICATE_RECORD' : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
    return sendJson(res, status >= 400 && status < 600 ? status : 500, {
      ok: false,
      code,
      error: status >= 500
        ? 'Внутренняя ошибка сервера'
        : duplicate ? 'Запись с такими уникальными данными уже существует' : String(error.message || 'Некорректный запрос'),
    });
  }
});

initDb()
  .then(() => seedBlogPosts(query))
  .then(() => {
    startNotificationWorker();
    telegramBot = startTelegramBot({ pool, query, createLead, processNotificationOutbox });
    return server.listen(PORT, HOST, () => console.log(`01service API + DB http://${HOST}:${PORT}`));
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  });

process.on('SIGTERM', async () => { await telegramBot?.stop?.(); await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await telegramBot?.stop?.(); await pool.end(); process.exit(0); });
