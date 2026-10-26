export const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAdminSession = () => readStoredUser()?.role === 'admin';
