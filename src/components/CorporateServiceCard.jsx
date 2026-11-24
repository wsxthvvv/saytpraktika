import { useId, useState } from 'react';
import { CORPORATE_CATEGORY_LABELS, formatCorporatePrice } from '../utils/corporateServices';

const CorporateServiceCard = ({ service, onRequestLead, directionLink: DirectionLink }) => {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const summary = service.summary || service.desc;
  const tags = service.tags || [];
  const details = service.details;
  const hasDetails = Boolean(details);

  return (
    <article className="service-card service-card--rich" data-corp={service.category}>
      <nav className="service-card__badge" aria-label="Категория">
        {CORPORATE_CATEGORY_LABELS[service.category] || service.category}
      </nav>
      <header className="service-card__header">
        <h3>{service.title}</h3>
      </header>
      <p className="service-card__description service-card__description--lead">{summary}</p>
      {tags.length > 0 && (
        <ul className="service-card__tags" aria-label="Возможности">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      {expanded && hasDetails && (
        <div id={detailsId} className="service-card__detail-panel">
          <p>{details}</p>
        </div>
      )}
      <footer className="service-card__footer">
        <div className="service-card__price-main">{formatCorporatePrice(service)}</div>
        <div className="service-card__actions service-card__actions--footer">
          {hasDetails && (
            <button
              type="button"
              className="btn-outline service-card__more"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Свернуть' : 'Подробнее'}
            </button>
          )}
          {DirectionLink && <DirectionLink />}
          <button
            type="button"
            className="btn service-card__action"
            onClick={() => onRequestLead({ ...service, kind: 'corporate' })}
          >
            Заявка
          </button>
        </div>
      </footer>
    </article>
  );
};

export default CorporateServiceCard;