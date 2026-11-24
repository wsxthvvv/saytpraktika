import { MESSENGER_LINKS } from '../constants/messengers';
import { MaxIcon, TelegramIcon } from './MessengerIcons';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const MessengerFab = () => {
  const { contacts } = useSiteSettings();
  const fabItems = [
    { ...MESSENGER_LINKS.telegram, href: contacts.telegramUrl || MESSENGER_LINKS.telegram.href, Icon: TelegramIcon },
    { ...MESSENGER_LINKS.max, href: contacts.maxUrl || MESSENGER_LINKS.max.href, Icon: MaxIcon },
  ].filter((item) => item.href);
  return (
  <div className="messenger-fab" aria-label="Быстрые мессенджеры">
    {fabItems.map(({ id, href, label, Icon }) => (
      <a
        key={id}
        href={href}
        className={`messenger-fab__btn messenger-fab__btn--${id}`}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        aria-label={label}
      >
        <Icon className="messenger-fab__icon" />
      </a>
    ))}
  </div>
  );
};

export default MessengerFab;
