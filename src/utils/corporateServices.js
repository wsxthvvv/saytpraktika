import { getCorporateOffers } from './servicesCatalog';
import enrichmentById from '../data/corporateOfferEnrichment.json';

const mergeEnrichment = (service) => {
  const extra = enrichmentById[String(service.id)];
  if (!extra) return service;
  return { ...service, ...extra };
};

export const CORPORATE_CATEGORY_LABELS = {
  IT: 'IT',
  Mining: 'Майнинг',
  Accounting: 'Бухгалтерия',
  AI: 'ИИ',
};

export const formatCorporatePrice = (service) => {
  if (!service || service.price === 0) return 'Бесплатно';
  const amount = Number(service.price).toLocaleString('ru-RU');
  if (service.period === 'month') return `от ${amount} ₽/мес`;
  return `от ${amount} ₽`;
};

export const filterCorporateByCategory = (services, category) => {
  if (!category || category === 'all') return services;
  return services.filter((item) => item.category === category);
};

export const corporateServices = getCorporateOffers().map(mergeEnrichment);