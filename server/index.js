const http = require('http');
const { notifyLead } = require('./leadNotifications');
const { fetchRbcCryptoNews } = require('./rbcCryptoFeed');
const {
  tryServeStatic,
  buildExists,
  isProductionStaticEnabled,
} = require('./serveStatic');

try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch {
  /* dotenv optional until installed */
}

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 64 * 1024) {
      reject(new Error('Payload too large'));
      req.destroy();
    }
  });
  req.on('end', () => {
    if (!raw) {
      resolve({});
      return;
    }
    try {
      resolve(JSON.parse(raw));
    } catch {
      reject(new Error('Invalid JSON'));
    }
  });
  req.on('error', reject);
});

const setCors = (req, res) => {
  const origin = req.headers.origin;
  if (!origin) return;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/rbc-news')) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit') || 24)));
      const payload = await fetchRbcCryptoNews(limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...payload }));
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error.message, items: [] }));
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      service: '01service-api',
      static: isProductionStaticEnabled() && buildExists(),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      max: Boolean(process.env.MAX_WEBHOOK_URL),
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/leads') {
    try {
      const body = await readJsonBody(req);
      const type = String(body.type || 'lead').slice(0, 64);
      const result = await notifyLead({
        type,
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        deliveryDate: body.deliveryDate,
        deliveryTime: body.deliveryTime,
        comments: body.comments,
        total: body.total,
        itemsSummary: body.itemsSummary,
      });

      const status = result.delivered || result.allSkipped ? 200 : 502;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }

  if (tryServeStatic(req, res)) return;

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, HOST, () => {
  const mode = isProductionStaticEnabled() && buildExists()
    ? 'API + React build (production)'
    : 'API only (dev — run npm start separately)';
  // eslint-disable-next-line no-console
  console.log(`01service server [${mode}] http://${HOST}:${PORT}`);
  if (isProductionStaticEnabled() && !buildExists()) {
    // eslint-disable-next-line no-console
    console.warn('WARN: NODE_ENV=production but build/ missing — run npm run build first');
  }
});
