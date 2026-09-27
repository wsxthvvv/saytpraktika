const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const isProductionStaticEnabled = () => (
  process.env.SERVE_STATIC === 'true' || process.env.NODE_ENV === 'production'
);

const buildExists = () => fs.existsSync(path.join(BUILD_DIR, 'index.html'));

const safeResolve = (urlPath) => {
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const resolved = path.normalize(path.join(BUILD_DIR, relative));
  if (!resolved.startsWith(BUILD_DIR)) return null;
  return resolved;
};

const sendFile = (res, filePath, statusCode = 200) => {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(statusCode, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
};

/**
 * @returns {boolean} true if request handled
 */
const tryServeStatic = (req, res) => {
  if (!isProductionStaticEnabled() || !buildExists()) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname.startsWith('/api/')) return false;

  const filePath = safeResolve(pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    if (req.method === 'HEAD') {
      res.writeHead(200);
      res.end();
    } else {
      sendFile(res, filePath);
    }
    return true;
  }

  const spaIndex = path.join(BUILD_DIR, 'index.html');
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end();
  } else {
    sendFile(res, spaIndex);
  }
  return true;
};

module.exports = {
  tryServeStatic,
  buildExists,
  isProductionStaticEnabled,
  BUILD_DIR,
};
