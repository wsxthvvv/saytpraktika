import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ServiceLeadModal from './ServiceLeadModal';
import CorporateServiceCard from './CorporateServiceCard';
import { corporateServices, CORPORATE_CATEGORY_LABELS, filterCorporateByCategory } from '../utils/corporateServices';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'IT', label: 'IT' },
  { id: 'Mining', label: 'Майнинг' },
  { id: 'Accounting', label: 'Бухгалтерия' },
  { id: 'AI', label: 'ИИ' },
];

const DIRECTION_LINKS = {
  IT: '/it',
  Mining: '/mining-services',
  Accounting: '/accounting',
  AI: '/ai',
};

const CorporateServiceCatalog = ({ title = 'Комплексные услуги для бизнеса', compact = false }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [leadOffer, setLeadOffer] = useState(null);

  const items = useMemo(() => {
    let list = filterCorporateByCategory(corporateServices, category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          (item.summary || '').toLowerCase().includes(q) ||
          (item.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
          (CORPORATE_CATEGORY_LABELS[item.category] || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [category, query]);

  return (
    <>
      <section
        className={`services-section corporate-section${compact ? ' corporate-section--compact' : ''}`}
        aria-labelledby="corporate-catalog-title"
      >
        <div className="services-header">
          <div>
            <p className="section-eyebrow">01 СЕРВИС</p>
            <h2 id="corporate-catalog-title" className="section-title">{title}</h2>
            <p className="services-subtitle">
              IT, майнинг-сервис, бухгалтерия и ИИ — единый каталог с прозрачными стартовыми ценами.
            </p>
          </div>
        </div>

        <div className="corporate-toolbar">
          <input
            type="search"
            className="corporate-toolbar__search"
            placeholder="Поиск по названию или описанию…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск услуг"
          />
          <p className="corporate-toolbar__count" aria-live="polite">
            {items.length} из {corporateServices.length}
          </p>
        </div>

        <div className="product-categories" role="tablist" aria-label="Категории услуг">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={category === filter.id}
              className={`product-category${category === filter.id ? ' is-active' : ''}`}
              onClick={() => setCategory(filter.id)}
            >
              {filter.label}
              {filter.id !== 'all' && (
                <span>
                  {corporateServices.filter((s) => s.category === filter.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="services-grid services-grid--catalog">
          {items.map((service) => (
            <CorporateServiceCard
              key={service.id}
              service={service}
              onRequestLead={setLeadOffer}
              directionLink={
                DIRECTION_LINKS[service.category]
                  ? () => (
                    <Link
                      to={DIRECTION_LINKS[service.category]}
                      className="btn-outline service-card__details"
                    >
                      О направлении
                    </Link>
                  )
                  : null
              }
            />
          ))}
        </div>
      </section>
      <ServiceLeadModal service={leadOffer} onClose={() => setLeadOffer(null)} />
    </>
  );
};

export default CorporateServiceCatalog;