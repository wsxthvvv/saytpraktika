/**
 * Публичной ссылки «как wa.me по номеру» у MAX нет — в .env укажите REACT_APP_MAX_CHAT_URL
 * из приложения: Профиль → «Пригласить друзей» (https://max.ru/u/…), аккаунт +7 903 764-46-98.
 */
const defaultMaxHref = process.env.REACT_APP_MAX_PROFILE_URL || 'https://max.ru';

export const MESSENGER_LINKS = {
  telegram: {
    id: 'telegram',
    label: 'Написать в Telegram',
    shortLabel: 'Telegram',
    href: process.env.REACT_APP_TELEGRAM_URL || 'https://t.me/Litwin4all',
  },
  max: {
    id: 'max',
    label: 'Написать в MAX',
    shortLabel: 'MAX',
    href: process.env.REACT_APP_MAX_CHAT_URL || process.env.REACT_APP_MAX_PROFILE_URL || defaultMaxHref,
  },
};

export const LEAD_API_URL = process.env.REACT_APP_LEAD_API_URL || '/api/leads';
