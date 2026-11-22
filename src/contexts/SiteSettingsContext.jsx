import { createContext, useContext, useEffect, useState } from 'react';
import { LEGAL_OPERATOR } from '../constants/legalEntity';
import { MESSENGER_LINKS } from '../constants/messengers';

const SiteSettingsContext = createContext(null);
const defaults = {
  contacts: {
    telegramUrl: MESSENGER_LINKS.telegram.href,
    telegramBotUrl: '',
    maxUrl: '',
    email: LEGAL_OPERATOR.email,
    phone: LEGAL_OPERATOR.phone,
  },
  delivery: { note: 'Стоимость и сроки доставки подтвердит менеджер.', configured: false, intervals: [] },
};

export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaults);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/settings/public', { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        setSettings({
          contacts: {
            telegramUrl: data.contacts.telegramUrl || defaults.contacts.telegramUrl,
            telegramBotUrl: data.contacts.telegramBotUrl || defaults.contacts.telegramBotUrl,
            maxUrl: data.contacts.maxUrl || defaults.contacts.maxUrl,
            email: data.contacts.email || defaults.contacts.email,
            phone: data.contacts.phone || defaults.contacts.phone,
          },
          delivery: { ...defaults.delivery, ...data.delivery },
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
};

export const useSiteSettings = () => useContext(SiteSettingsContext) || defaults;
