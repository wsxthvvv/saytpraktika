import PropTypes from 'prop-types';
import { MESSENGER_LINKS } from '../constants/messengers';
import { MaxIcon, TelegramIcon } from './MessengerIcons';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const icons = {
  telegram: TelegramIcon,
  max: MaxIcon,
};

const MessengerLinks = ({ variant = 'row', className = '' }) => {
  const { contacts } = useSiteSettings();
  const items = [
    { ...MESSENGER_LINKS.telegram, href: contacts.telegramUrl || MESSENGER_LINKS.telegram.href },
    { ...MESSENGER_LINKS.max, href: contacts.maxUrl },
  ].filter((item) => item.href);

  return (
    <div className={`messenger-links messenger-links--${variant} ${className}`.trim()} role="group" aria-label="Мессенджеры">
      {items.map((item) => {
        const Icon = icons[item.id];
        return (
          <a
            key={item.id}
            href={item.href}
            className={`messenger-btn messenger-btn--${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title={item.label}
          >
            <Icon className="messenger-btn__icon" />
            {variant === 'compact' ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              <span className="messenger-btn__label">{item.label}</span>
            )}
          </a>
        );
      })}
    </div>
  );
};

MessengerLinks.propTypes = {
  variant: PropTypes.oneOf(['row', 'stack', 'compact']),
  className: PropTypes.string,
};

export default MessengerLinks;
