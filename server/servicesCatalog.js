const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'src', 'data', 'servicesCatalog.json');

let cache;

const loadServicesCatalog = () => {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  cache = {
    version: raw.version || 1,
    offers: Array.isArray(raw.offers) ? raw.offers : [],
  };
  return cache;
};

const listOffers = ({ kind, category, direction } = {}) => {
  let offers = loadServicesCatalog().offers;
  if (kind) offers = offers.filter((item) => item.kind === kind);
  if (category) offers = offers.filter((item) => item.category === category);
  if (direction) offers = offers.filter((item) => item.direction === direction);
  return offers;
};

const getOfferById = (id) => {
  const key = String(id);
  return loadServicesCatalog().offers.find((item) => String(item.id) === key) || null;
};

/** Telegram: все услуги с префиксом для различения */
const listTelegramServices = () => loadServicesCatalog().offers.map((offer) => ({
  id: offer.id,
  kind: offer.kind,
  title: offer.kind === 'corporate'
    ? `[${offer.category}] ${offer.title}`
    : `[Разработка] ${offer.title}`,
  shortTitle: offer.title,
}));

module.exports = {
  loadServicesCatalog,
  listOffers,
  getOfferById,
  listTelegramServices,
};