import { formatUsd } from '../utils/currency';

export const ORDER_STATUSES = ['Ожидание', 'В работе', 'Завершена', 'Отменена'];
export const LEAD_STATUSES = ['Новая', 'В работе', 'Завершена', 'Отменена'];
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

export const reviewLabels = {
  pending: 'На проверке',
  approved: 'Опубликован',
  rejected: 'Отклонён',
};

export const LEAD_TYPE_LABELS = {
  service: 'Услуга',
  callback: 'Обратный звонок',
  order: 'Заказ с сайта',
  lead: 'Заявка',
};

export const formatAdminDate = (value) => (value ? new Date(value).toLocaleString('ru-RU') : '—');

export const leadTypeLabel = (type) => LEAD_TYPE_LABELS[type] || type || 'Заявка';

export const formatOrderTotal = (order) => {
  if (!order) return '—';
  const amount = formatUsd(order.total);
  return order.currency && order.currency !== 'USD' ? `${amount} (${order.currency})` : amount;
};

const normalize = (value) => String(value || '').toLowerCase().trim();

export const matchesSearch = (query, ...fields) => {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((field) => normalize(field).includes(q));
};

export const downloadCsv = (filename, rows, columns) => {
  const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  const header = columns.map((col) => escape(col.label)).join(';');
  const body = rows.map((row) => columns.map((col) => escape(col.value(row))).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const adminApi = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
};

export const buildAdminListUrl = (path, { page = 1, limit = 20, q = '', status = 'all', type = 'all', category = 'all' }) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q.trim()) params.set('q', q.trim());
  if (status !== 'all') params.set('status', status);
  if (type !== 'all') params.set('type', type);
  if (category !== 'all') params.set('category', category);
  return `${path}?${params.toString()}`;
};

export const LEAD_STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'new', label: 'Новая' },
  { value: 'processing', label: 'В работе' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

export const ORDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидание' },
  { value: 'processing', label: 'В работе' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

export const syncAdminSessionToProfile = (user) => {
  if (!user) return;
  localStorage.setItem('currentUser', JSON.stringify(user));
  window.dispatchEvent(new Event('userUpdated'));
};
