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
    href: process.env.REACT_APP_MAX_CHAT_URL || 'https://max.ru',
  },
};

export const LEAD_API_URL = process.env.REACT_APP_LEAD_API_URL || '/api/leads';
