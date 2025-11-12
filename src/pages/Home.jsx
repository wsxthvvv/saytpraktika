import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import Technologies from '../components/Technologies';
import FAQ from '../components/FAQ';
import Testimonials from '../components/Testimonials';
import AnimatedCounter from '../components/AnimatedCounter';
import BlogPreview from '../components/BlogPreview';

const Home = () => {
  return (
    <div className="home">
      <section className="hero">
        <AnimatedBackground />
        <div className="hero__content">
          <span className="hero__eyebrow">WEB3 DIGITAL STUDIO</span>
          <h1
            className="hero__title glitch"
            data-text="Создаем сайты и крипто-сервисы, которые выделяются"
          >
            Создаем сайты и крипто-сервисы, которые выделяются
          </h1>
          <p className="hero__subtitle">
            От лендинга до сложной платформы с конвертацией криптовалют. Ваша команда разработки,
            стратеги и дизайнеры — в одном месте.
          </p>
          <div className="hero__cta">
            <Link to="/services" className="btn">
              Заказать разработку
            </Link>
            <Link to="/crypto" className="btn-outline">
              Курс криптовалют
            </Link>
          </div>
        </div>
        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-number">
              <AnimatedCounter value="48+" />
            </span>
            <span className="hero__stat-label">Запущенных проектов</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-number">
              <AnimatedCounter value="3.5x" />
            </span>
            <span className="hero__stat-label">Средний рост лидов</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-number">24/7</span>
            <span className="hero__stat-label">Поддержка в Telegram</span>
          </div>
        </div>
      </section>

      <section className="ticker" aria-hidden="true">
        <div className="ticker__inner">
          <span>UI/UX DESIGN</span>
          <span>DEFI & NFT</span>
          <span>SMART CONTRACT INTEGRATION</span>
          <span>MARKETPLACE</span>
          <span>CUSTOM DASHBOARD</span>
        </div>
        <div className="ticker__inner" aria-hidden="true">
          <span>UI/UX DESIGN</span>
          <span>DEFI & NFT</span>
          <span>SMART CONTRACT INTEGRATION</span>
          <span>MARKETPLACE</span>
          <span>CUSTOM DASHBOARD</span>
        </div>
      </section>

      <section className="panels">
        <article className="panel-card">
          <h3>Модульная архитектура</h3>
          <p>
            Подключаем экосистему аналитики, CMS, платежей и фиат/крипто шлюзов. Растете —
            масштабируете без боли.
          </p>
        </article>
        <article className="panel-card">
          <h3>Прозрачная крипто-конвертация</h3>
          <p>
            Точность курса из CoinGecko и резервный источник. Подсветка важных скачков и push
            уведомления.
          </p>
        </article>
        <article className="panel-card">
          <h3>Коммуникация в одном окне</h3>
          <p>
            Telegram-бот подключается к вашему кабинету. Храните историю, поддерживайте клиентов
            прямо на сайте.
          </p>
        </article>
      </section>

      <Technologies />
      <Testimonials />
<FAQ />
<BlogPreview /> {/* ← сюда */}
    </div>
  );
};

export default Home;

