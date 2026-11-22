let sessionUser = null;
export const readStoredUser = () => sessionUser;
export const setSessionUser = (user) => { sessionUser = user || null; };
export const isAdminSession = () => sessionUser?.role === 'admin';
