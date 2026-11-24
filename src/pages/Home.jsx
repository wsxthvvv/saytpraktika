import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import Technologies from '../components/Technologies';
import FAQ from '../components/FAQ';
import Testimonials from '../components/Testimonials';
import RbcNewsFeed from '../components/RbcNewsFeed';
import MarketOverview from '../components/MarketOverview';

const Home = () => {
  return (
    <div className="home">
      <section className="hero">
        <AnimatedBackground />
        <div className="hero__content">
          <span className="hero__eyebrow">01 SERVICE · КОМПЬЮТЕРЫ И ОБСЛУЖИВАНИЕ</span>
          <h1
            className="hero__title glitch"
            data-text="Ремонт, сборка ПК, IT-сервис и разработка под ключ"
          >
            Ремонт, сборка ПК, IT-сервис и разработка под ключ
          </h1>
          <p className="hero__subtitle">
            От диагностики ноутбука до сайта с крипто-модулями — один партнёр, фирменное качество
            и понятный сервис.
          </p>
          <div className="hero__cta">
            <Link to="/services" className="btn">
              Все услуги
            </Link>
            <Link to="/blog" className="btn-outline">
              Блог
            </Link>
            <Link to="/crypto" className="btn-outline">
              Курс криптовалют
            </Link>
          </div>
        </div>
        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-number">8</span>
            <span className="hero__stat-label">Услуг разработки</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-number">USD</span>
            <span className="hero__stat-label">Цены оборудования</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-number">1 мин</span>
            <span className="hero__stat-label">Обновление курсов</span>
          </div>
        </div>
      </section>

      <section className="home-process" aria-labelledby="home-process-title">
        <div className="home-process__intro">
          <p className="section-eyebrow">ПРОСТОЙ ПОРЯДОК</p>
          <h2 id="home-process-title" className="section-title">Как начать</h2>
          <p>Услуги выберите на сайте, заявку оформите через Telegram. Майнеры находятся в разделе «Товары».</p>
        </div>
        <div className="home-process__steps">
          <article className="home-process__step"><span>01</span><h3>Выберите услугу</h3><p>Посмотрите, что входит в работу, и выберите направление разработки.</p></article>
          <article className="home-process__step"><span>02</span><h3>Опишите задачу</h3><p>Бот соберёт контакты и описание, а заявка появится в системе сайта.</p></article>
          <article className="home-process__step"><span>03</span><h3>Согласуйте условия</h3><p>Менеджер уточнит объём работ, сроки и стоимость до начала проекта.</p></article>
        </div>
        <Link to="/products?category=miner" className="home-process__equipment-link">Смотреть майнеры в товарах →</Link>
      </section>

      <MarketOverview />

      <section className="panels">
        <article className="panel-card">
          <h3>Разработка сайта</h3>
          <p>
            Подберём состав работ для нового сайта, доработки существующего проекта или интеграции с API.
          </p>
        </article>
        <article className="panel-card">
          <h3>Подбор оборудования</h3>
          <p>
            В карточках каталога показываются подтверждённые цена, наличие, характеристики и гарантия.
          </p>
        </article>
        <article className="panel-card">
          <h3>Понятная заявка</h3>
          <p>
            Заявки на разработку принимаются через Telegram-бота и сохраняются в панели управления.
          </p>
        </article>
      </section>

      <Technologies />
      <Testimonials />
<FAQ />
<RbcNewsFeed limit={3} preview lazyWhenPreview />
    </div>
  );
};

export default Home;
