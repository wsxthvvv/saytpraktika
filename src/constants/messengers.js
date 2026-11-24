/**
 * Публичной ссылки «как wa.me по номеру» у MAX нет — в .env укажите REACT_APP_MAX_CHAT_URL
 * или задайте ссылку в админке (Контакты и доставка).
 */
export const DEFAULT_MAX_PROFILE_URL =
  'https://max.ru/u/f9LHodD0cOLuytX3WSVE2iHjw2loX35tAsSUa-FzxEOvwDkKM7rpj3a0_gg';

export const MESSENGER_LINKS = {
  telegram: {
    id: 'telegram',
    label: 'Написать в Telegram',
    shortLabel: 'Telegram',
    href: process.env.REACT_APP_TELEGRAM_URL || '',
  },
  max: {
    id: 'max',
    label: 'Написать в MAX',
    shortLabel: 'MAX',
    href:
      process.env.REACT_APP_MAX_CHAT_URL
      || process.env.REACT_APP_MAX_PROFILE_URL
      || DEFAULT_MAX_PROFILE_URL,
  },
};

export const LEAD_API_URL = process.env.REACT_APP_LEAD_API_URL || '/api/leads';
