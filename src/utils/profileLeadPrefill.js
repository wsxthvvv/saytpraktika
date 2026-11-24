import { readStoredUser } from './sessionUser';

export const profileDisplayName = (user) => {
  if (!user) return '';
  const fio = [user.lastName, user.firstName, user.patronymic].filter(Boolean).join(' ');
  if (fio) return fio;
  return String(user.name || '').trim();
};

export const leadFieldsFromUser = (user) => {
  if (!user || user.role !== 'customer') {
    return { name: '', phone: '', email: '' };
  }
  return {
    name: profileDisplayName(user),
    phone: String(user.phone || '').trim(),
    email: String(user.email || '').trim(),
  };
};

export const profileLeadFields = () => leadFieldsFromUser(readStoredUser());