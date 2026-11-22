import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SiteNotFound = () => (
  <>
  <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
  <section className="profile-section" aria-labelledby="not-found-title">
    <h1 id="not-found-title" className="section-title">Страница не найдена</h1>
    <p>Проверьте адрес или перейдите на главную страницу.</p>
    <Link className="btn" to="/">На главную</Link>
  </section>
  </>
);

export default SiteNotFound;
