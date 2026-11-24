import { useState } from 'react';
import { Link } from 'react-router-dom';
import directionPages from '../data/directionPages.json';
import ServiceLeadModal from './ServiceLeadModal';
import CorporateServiceCard from './CorporateServiceCard';
import { corporateServices } from '../utils/corporateServices';
import SiteNotFound from './SiteNotFound';

const formatTariffPrice = (amount, period) => {
  const value = Number(amount).toLocaleString('ru-RU');
  if (period === 'month') return `${value} ₽/мес`;
  return `${value} ₽`;
};

const DirectionLanding = ({ slug }) => {
  const config = directionPages[slug];
  const [leadOffer, setLeadOffer] = useState(null);

  if (!config) return <SiteNotFound />;

  const related = corporateServices.filter((item) => item.category === config.category);

  return (
    <div className="direction-page">
      <section className="direction-hero">
        <p className="section-eyebrow">{config.eyebrow.toUpperCase()}</p>
        <h1 className="section-title">{config.title}</h1>
        <p className="direction-hero__lead">{config.lead}</p>
        <div className="direction-hero__cta">
          <Link to="/services?kind=corporate" className="btn">Каталог услуг</Link>
          <Link to="/blog" className="btn-outline">Статьи в блоге</Link>
          <button type="button" className="btn-outline" onClick={() => setLeadOffer({
            id: related[0]?.id,
            kind: 'corporate',
            category: config.category,
            direction: slug,
            title: config.title,
            desc: config.lead,
          })}
          >
            Консультация
          </button>
        </div>
        <ul className="direction-hero__list">
          {config.highlights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="direction-hero__stats">
          {config.stats.map((item) => (
            <div key={item.label} className="direction-hero__stat">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="direction-related services-section direction-services-panel">
        <p className="section-eyebrow">ТАРИФЫ</p>
        <h2 className="section-title">{config.servicesTitle || 'Услуги направления'}</h2>
        <div className="services-grid services-grid--direction">
          {related.map((service) => (
            <CorporateServiceCard
              key={service.id}
              service={service}
              onRequestLead={setLeadOffer}
            />
          ))}
        </div>
      </section>

      {config.cases?.length > 0 && (
        <section className="direction-block" aria-labelledby="direction-cases-title">
          <h2 id="direction-cases-title" className="section-title">Кейсы и результаты</h2>
          <div className="direction-cases">
            {config.cases.map((item) => (
              <article key={item.title} className="direction-case-card">
                <p className="direction-case-card__metric">{item.metric}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {item.tags?.length > 0 && (
                  <ul className="service-card__tags service-card__tags--compact">
                    {item.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {config.industries?.length > 0 && (
        <section className="direction-block" aria-labelledby="direction-industries-title">
          <h2 id="direction-industries-title" className="section-title">Для каких отраслей</h2>
          <div className="direction-industries">
            {config.industries.map((item) => (
              <article key={item.title} className="direction-industry-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {config.tariffs?.length > 0 && (
        <section className="direction-block direction-tariffs" aria-labelledby="direction-tariffs-title">
          <h2 id="direction-tariffs-title" className="section-title">Готовые тарифы</h2>
          <div className="direction-tariff-grid">
            {config.tariffs.map((plan) => (
              <article
                key={plan.name}
                className={`direction-tariff-card${plan.highlight ? ' direction-tariff-card--highlight' : ''}`}
              >
                <h3>{plan.name}</h3>
                <p className="direction-tariff-card__price">{formatTariffPrice(plan.price, plan.period)}</p>
                <ul>
                  {plan.features.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`btn${plan.highlight ? '' : ' btn-outline'}`}
                  onClick={() => setLeadOffer({
                    kind: 'corporate',
                    category: config.category,
                    direction: slug,
                    title: `Тариф «${plan.name}» — ${config.title}`,
                    desc: plan.features.join('; '),
                    price: plan.price,
                    period: plan.period,
                  })}
                >
                  Оставить заявку
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <ServiceLeadModal service={leadOffer} onClose={() => setLeadOffer(null)} />
    </div>
  );
};

export default DirectionLanding;