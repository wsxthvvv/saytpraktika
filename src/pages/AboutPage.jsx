import { Link } from 'react-router-dom';
import about from '../data/aboutPage.json';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { LEGAL_OPERATOR } from '../constants/legalEntity';

const AboutPage = () => {
  const { contacts } = useSiteSettings();
  const phone = contacts.phone || LEGAL_OPERATOR.phone;
  const email = contacts.email || LEGAL_OPERATOR.email;
  const tel = phone.replace(/[^\d+]/g, '');

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero__content">
          <p className="section-eyebrow">{about.eyebrow}</p>
          <h1 className="section-title">{about.title}</h1>
          <p className="about-hero__lead">{about.lead}</p>
          <p className="about-hero__legal">{LEGAL_OPERATOR.name} · {LEGAL_OPERATOR.city}</p>
        </div>
        <div className="about-hero__stats" role="list">
          {about.stats.map((item) => (
            <div key={item.label} className="about-hero__stat" role="listitem">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="about-sections">
        {about.sections.map((block) => (
          <section key={block.title} className="about-panel">
            <span className="about-panel__icon" aria-hidden="true">{block.icon}</span>
            <h2>{block.title}</h2>
            {block.paragraphs.map((text) => (
              <p key={text.slice(0, 32)}>{text}</p>
            ))}
          </section>
        ))}
      </div>

      <section className="about-contact-panel" aria-labelledby="about-contacts-title">
        <div className="about-contact-panel__main">
          <h2 id="about-contacts-title">Связаться с нами</h2>
          <p className="about-contact-panel__lead">
            Позвоните, напишите на почту или оставьте заявку в разделе услуг — ответим в рабочее время.
          </p>
          <div className="about-contact-actions">
            <a href={`tel:${tel}`} className="btn about-contact-actions__phone">
              {phone}
            </a>
            <a href={`mailto:${email}`} className="btn-outline about-contact-actions__email">
              {email}
            </a>
          </div>
        </div>
        <div className="about-contact-panel__side">
          <h3>График работы</h3>
          <ul className="about-hours">
            {about.hours.map((row) => (
              <li key={row.days}>
                <span>{row.days}</span>
                <span>{row.time}</span>
              </li>
            ))}
          </ul>
          <p className="about-legal-links">
            <Link to="/privacy">Политика конфиденциальности</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/consent">Согласие на обработку ПДн</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;