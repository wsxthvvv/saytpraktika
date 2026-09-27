import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FALLBACK_NEWS, fetchRbcNews, REFRESH_INTERVAL_MS } from '../data/rbcNews';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
};

const RbcNewsFeed = ({ limit, preview = false }) => {
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [status, setStatus] = useState('loading');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadNews = useCallback(async (signal) => {
    setStatus('loading');
    try {
      const items = await fetchRbcNews(signal);
      setNews(items);
      setLastUpdated(new Date());
      setStatus('ready');
    } catch (error) {
      if (error.name !== 'AbortError') setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadNews(controller.signal);
    const timer = window.setInterval(() => {
      const refreshController = new AbortController();
      loadNews(refreshController.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadNews]);

  const visibleNews = useMemo(() => (
    limit ? news.slice(0, limit) : news
  ), [limit, news]);

  return (
    <section className={`rbc-news ${preview ? 'rbc-news--preview' : ''}`}>
      <div className="container">
        <div className="rbc-news__header">
          <div>
            <span className="rbc-news__eyebrow">АКТУАЛЬНАЯ ЛЕНТА</span>
            <h2 className="section-title">Новости РБК</h2>
            <p className="rbc-news__subtitle">
              Короткие анонсы важных событий с переходом на оригинальные материалы РБК.
            </p>
          </div>
          <div className="rbc-news__actions">
            <span className="rbc-news__source">Источник: РБК</span>
            <button
              type="button"
              className="btn-outline rbc-news__refresh"
              onClick={() => loadNews(new AbortController().signal)}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Обновляем...' : 'Обновить'}
            </button>
            {preview && <Link to="/news" className="btn">Все новости</Link>}
          </div>
        </div>

        {status === 'error' && (
          <div className="rbc-news__message" role="status">
            Показана резервная подборка РБК. Не удалось получить свежую ленту, попробуйте обновить страницу позже.
          </div>
        )}

        {status === 'loading' && news.length === 0 && (
          <div className="rbc-news__message" role="status">Загружаем свежие новости...</div>
        )}

        {visibleNews.length > 0 && (
          <div className="rbc-news__grid">
            {visibleNews.map((item) => (
              <article className="rbc-news-card" key={item.id}>
                <div className="rbc-news-card__topline">
                  <span className="rbc-news-card__mark">РБК</span>
                  <span className="rbc-news-card__category">{item.category}</span>
                </div>
                <h3 className="rbc-news-card__title">{item.title}</h3>
                {item.excerpt && <p className="rbc-news-card__excerpt">{item.excerpt}</p>}
                <div className="rbc-news-card__footer">
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="rbc-news-card__link"
                  >
                    Читать на РБК <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="rbc-news__note">
          {lastUpdated
            ? `Лента обновлена ${lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}. Автообновление каждые 15 минут.`
            : 'Источник и оригинальный материал открываются на сайте РБК.'}
        </div>
      </div>
    </section>
  );
};

export default RbcNewsFeed;
