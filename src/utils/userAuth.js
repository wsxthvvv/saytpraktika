const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: data.error || `HTTP ${response.status}` };
  return data;
};

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
export const toSessionUser = (user) => (user ? { ...user } : null);

export async function registerUser(userFields) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...userFields, email: normalizeEmail(userFields.email) }),
  });
}

export async function authenticateUser(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  });
}

export async function getCurrentUser() {
  const result = await request('/api/auth/me', { method: 'GET' });
  return result.authenticated ? result.user : null;
}

export async function logoutUser() {
  return request('/api/auth/logout', { method: 'POST', body: '{}' });
}

export async function persistSessionProfile(sessionUser) {
  if (!sessionUser) return { ok: false, error: 'Нет пользователя' };
  return request('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(sessionUser),
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export const mergeSessionWithRecord = (user) => user;
export const loadUserRecord = () => null;
