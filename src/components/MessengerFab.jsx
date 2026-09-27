import { MESSENGER_LINKS } from '../constants/messengers';
import { MaxIcon, TelegramIcon } from './MessengerIcons';

const fabItems = [
  { ...MESSENGER_LINKS.telegram, Icon: TelegramIcon },
  { ...MESSENGER_LINKS.max, Icon: MaxIcon },
];

const MessengerFab = () => (
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

export default MessengerFab;
