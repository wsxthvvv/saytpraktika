const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createSession, findSessionUser, hashToken, query } = require('./db');

const AUTH_COOKIE = '01service_session';
const SESSION_DAYS = 30;

const parseCookies = (header = '') => Object.fromEntries(
  header.split(';')
    .map((part) => part.trim().split(/=(.*)/s).slice(0, 2))
    .filter(([name, value]) => name && value !== undefined)
    .map(([name, value]) => [name, decodeURIComponent(value)]),
);

const getAuthToken = (req) => parseCookies(req.headers.cookie)[AUTH_COOKIE] || null;

const hashPassword = (password) => {
  return bcrypt.hashSync(String(password), 12);
};

const verifyPassword = (password, storedHash) => {
  if (/^\$2[aby]\$/.test(String(storedHash || ''))) {
    try { return bcrypt.compareSync(String(password), storedHash); } catch { return false; }
  }
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  let actual;
  try { actual = crypto.scryptSync(String(password), salt, 64).toString('hex'); } catch { return false; }
  const actualBuffer = Buffer.from(actual, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const userSessionCookie = (token, maxAge = SESSION_DAYS * 24 * 60 * 60) => (
  `${AUTH_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
);

const getSessionUser = (req) => findSessionUser(getAuthToken(req));

const clearSession = async (req) => {
  const token = getAuthToken(req);
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
};

const createUserSession = async (userId) => createSession(userId, SESSION_DAYS);

const revokeOtherSessions = async (userId, currentToken) => {
  await query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2', [userId, hashToken(currentToken)]);
};

module.exports = {
  AUTH_COOKIE,
  clearSession,
  createUserSession,
  getAuthToken,
  getSessionUser,
  hashPassword,
  parseCookies,
  revokeOtherSessions,
  userSessionCookie,
  verifyPassword,
};
