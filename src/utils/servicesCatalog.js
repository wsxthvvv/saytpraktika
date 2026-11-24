import catalog from '../data/servicesCatalog.json';

const offers = catalog.offers || [];

export const getOffers = (filters = {}) => {
  let list = offers;
  if (filters.kind) list = list.filter((item) => item.kind === filters.kind);
  if (filters.category) list = list.filter((item) => item.category === filters.category);
  if (filters.direction) list = list.filter((item) => item.direction === filters.direction);
  return list;
};

export const getOfferById = (id) => offers.find((item) => String(item.id) === String(id)) || null;

export const getDevOffers = () => getOffers({ kind: 'dev' });

export const getCorporateOffers = () => getOffers({ kind: 'corporate' });