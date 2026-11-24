import directionPages from './directionPages.json';

/** Порядок направлений как на 01-service.ru: IT → Майнинг → Бухгалтерия → ИИ */
const DIRECTION_SLUGS = ['it', 'mining-services', 'accounting', 'ai'];

/** Четыре направления как на 01-service.ru (без отдельного «каталога» в меню). */
export const serviceMenuItems = DIRECTION_SLUGS.map((slug) => {
  const page = directionPages[slug];
  return {
    to: page.path,
    label: page.title,
    description: page.highlights[0],
  };
});

export const cryptoMenuItems = [
  { to: '/charts', label: 'Графики и курсы' },
  { to: '/crypto', label: 'Конвертер' },
  { to: '/news', label: 'Новости РБК' },
];

export const directionPaths = DIRECTION_SLUGS.map((slug) => directionPages[slug].path);

export const investmentsPath = '/investments';

export const aboutPath = '/about';

export const servicesPaths = ['/services', ...directionPaths, investmentsPath];