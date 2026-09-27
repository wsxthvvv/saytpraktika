const USER_KEY_PREFIX = '01service_user:';
const AUTH_PEPPER = process.env.REACT_APP_AUTH_PEPPER || '01service-demo-pepper-v1';

const toHex = (buffer) => (
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
);

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const userStorageKey = (email) => `${USER_KEY_PREFIX}${normalizeEmail(email)}`;

export async function hashPassword(email, password) {
  const payload = `${AUTH_PEPPER}:${normalizeEmail(email)}:${password}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return toHex(digest);
}

export function toSessionUser(user) {
  if (!user) return null;
  const { password, passwordHash, ...session } = user;
  return session;
}

function readStoredUser(email) {
  const normalized = normalizeEmail(email);
  const keyed = localStorage.getItem(userStorageKey(normalized));
  if (keyed) return { raw: keyed, legacyKey: null };
  const legacy = localStorage.getItem(normalized) || localStorage.getItem(email);
  if (legacy) return { raw: legacy, legacyKey: normalized };
  return { raw: null, legacyKey: null };
}

function persistUser(email, user, legacyKey) {
  const key = userStorageKey(email);
  localStorage.setItem(key, JSON.stringify(user));
  if (legacyKey && legacyKey !== key) {
    localStorage.removeItem(legacyKey);
    localStorage.removeItem(email);
  }
}

export async function registerUser(userFields) {
  const email = normalizeEmail(userFields.email);
  if (readStoredUser(email).raw) {
    return { ok: false, error: 'Пользователь с таким email уже зарегистрирован' };
  }

  const passwordHash = await hashPassword(email, userFields.password);
  const record = {
    ...userFields,
    email,
    passwordHash,
    orders: userFields.orders || [],
  };
  delete record.password;

  persistUser(email, record, null);
  return { ok: true, user: toSessionUser(record) };
}

export async function authenticateUser(email, password) {
  const normalized = normalizeEmail(email);
  const { raw, legacyKey } = readStoredUser(normalized);
  if (!raw) {
    return { ok: false, error: 'Неверный email или пароль' };
  }

  const user = JSON.parse(raw);
  let valid = false;

  if (user.passwordHash) {
    valid = (await hashPassword(normalized, password)) === user.passwordHash;
  } else if (user.password) {
    valid = user.password === password;
    if (valid) {
      user.passwordHash = await hashPassword(normalized, password);
      delete user.password;
    }
  }

  if (!valid) {
    return { ok: false, error: 'Неверный email или пароль' };
  }

  user.email = normalized;
  persistUser(normalized, user, legacyKey);
  return { ok: true, user: mergeSessionWithRecord(toSessionUser(user)) };
}

export function loadUserRecord(email) {
  const { raw } = readStoredUser(normalizeEmail(email));
  return raw ? JSON.parse(raw) : null;
}

export function mergeSessionWithRecord(sessionUser) {
  if (!sessionUser?.email) return sessionUser;
  const record = loadUserRecord(sessionUser.email);
  if (!record) return sessionUser;
  return toSessionUser({
    ...record,
    ...sessionUser,
    orders: record.orders?.length ? record.orders : sessionUser.orders || [],
  });
}

export function persistSessionProfile(sessionUser) {
  if (!sessionUser?.email) return;
  const email = normalizeEmail(sessionUser.email);
  const record = loadUserRecord(email);
  if (!record) return;
  const next = {
    ...record,
    ...sessionUser,
    email,
    passwordHash: record.passwordHash,
    orders: sessionUser.orders ?? record.orders ?? [],
  };
  delete next.password;
  persistUser(email, next, null);
}
