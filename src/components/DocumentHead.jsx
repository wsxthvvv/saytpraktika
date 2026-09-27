import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { LEGAL_OPERATOR } from '../constants/legalEntity';

const SITE = LEGAL_OPERATOR.siteName;
const DEFAULT = {
  title: `${SITE} — сайты и крипто-сервисы`,
  description:
    'Разработка сайтов, конвертер криптовалют, каталог майнинг-оборудования. ООО «Рутрекер Технолоджи».',
};

const ROUTE_META = {
  '/': DEFAULT,
  '/services': {
    title: `Услуги разработки | ${SITE}`,
    description: 'Создание сайтов, маркетплейсов и интеграций под ключ.',
  },
  '/products': {
    title: `Продукты | ${SITE}`,
    description: 'Готовые решения и продукты для digital и crypto.',
  },
  '/crypto': {
    title: `Конвертер криптовалют | ${SITE}`,
    description: 'Актуальные курсы BTC, ETH и конвертация USD/RUB.',
  },
  '/charts': {
    title: `Графики криптовалют | ${SITE}`,
    description: 'Графики Bitcoin и Ethereum, курсы и аналитика.',
  },
  '/mining': {
    title: `Каталог оборудования | ${SITE}`,
    description: 'Майнинг-оборудование: Antminer и др.',
  },
  '/cart': {
    title: `Корзина | ${SITE}`,
    description: 'Оформление заказа услуг и оборудования.',
  },
  '/profile': {
    title: `Личный кабинет | ${SITE}`,
    description: 'Заказы и профиль пользователя.',
  },
  '/blog': {
    title: `Блог | ${SITE}`,
    description: 'Статьи о разработке и крипто-индустрии.',
  },
  '/news': {
    title: `Новости криптовалют (РБК) | ${SITE}`,
    description: 'Подборка новостей РБК о крипторынке.',
  },
  '/privacy': {
    title: `Политика конфиденциальности | ${SITE}`,
    description: 'Обработка персональных данных на сайте.',
  },
  '/consent': {
    title: `Согласие на обработку ПДн | ${SITE}`,
    description: 'Текст согласия на обработку персональных данных.',
  },
};

const DocumentHead = () => {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] || DEFAULT;

  return (
    <Helmet>
      <html lang="ru" />
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content="website" />
    </Helmet>
  );
};

export default DocumentHead;
