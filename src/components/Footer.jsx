import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { aboutPath, investmentsPath, serviceMenuItems } from '../data/siteNavigation';

const Footer = () => {
  const { contacts } = useSiteSettings();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <BrandLogo variant="footer" />
            </div>
            <p className="footer-description">
              ООО «Рутрекер Технолоджи»
              <br />
              Компьютеры и обслуживание: ремонт, сборка, IT-сервис, разработка сайтов и крипто-интеграции.
            </p>
          </div>

          <div className="footer-section">
            <h4>Контакты</h4>
            <div className="footer-contacts">
              <div className="contact-item">
                <span className="contact-icon">🏢</span>
                <div>
                  <div>Компания:</div>
                  <span>ООО "Рутрекер Технолоджи"</span>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <div>Адрес:</div>
                  <span>г. Москва</span>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <div>Телефон:</div>
                  <a href={`tel:${(contacts.phone || '+7 903 764 46 98').replace(/[^+\d]/g, '')}`}>{contacts.phone || '+7 903 764 46 98'}</a>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <div>
                  <div>Email:</div>
                  <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-section">
            <h4>График работы</h4>
            <div className="footer-hours">
              <div className="hours-item">
                <span>ПН — ПТ:</span>
                <span>10:40 — 19:20</span>
              </div>
              <div className="hours-item">
                <span>СБ:</span>
                <span>12:30 — 15:30</span>
              </div>
              <div className="hours-item">
                <span>ВС:</span>
                <span>ВЫХОДНОЙ</span>
              </div>
            </div>
          </div>

          <div className="footer-section">
            <h4>Быстрые ссылки</h4>
            <ul className="footer-links">
              {serviceMenuItems.map((item) => (
                <li key={item.to}><Link to={item.to}>{item.label}</Link></li>
              ))}
              <li><Link to="/products?category=miner">Майнеры</Link></li>
              <li><Link to={aboutPath}>О компании</Link></li>
              <li><Link to={investmentsPath}>Инвестиции</Link></li>
              <li><Link to="/blog">Блог</Link></li>
              <li><Link to="/charts">Графики</Link></li>
              <li><Link to="/profile">Личный кабинет</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-legal">
          <Link to="/privacy">Политика конфиденциальности</Link>
          <span className="footer-legal__sep" aria-hidden="true">·</span>
          <Link to="/consent">Согласие на обработку ПДн</Link>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            © 2026 ООО "Рутрекер Технолоджи". Все права защищены.
          </div>
          <div className="footer-payments">
            <span>Принимаем:</span>
            <div className="payment-methods">
              <span>BTC</span>
              <span>ETH</span>
              <span>USDT</span>
              <span>Карты</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
