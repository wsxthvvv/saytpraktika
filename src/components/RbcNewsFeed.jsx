import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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



const DEFAULT_PAGE_LIMIT = 24;



const RbcNewsFeed = ({ limit, preview = false, lazyWhenPreview = false }) => {

  const [news, setNews] = useState(FALLBACK_NEWS);

  const [status, setStatus] = useState('idle');

  const [lastUpdated, setLastUpdated] = useState(null);

  const [inView, setInView] = useState(!lazyWhenPreview);

  const sectionRef = useRef(null);



  useEffect(() => {

    if (!lazyWhenPreview || inView) return undefined;

    const node = sectionRef.current;

    if (!node) return undefined;



    const observer = new IntersectionObserver(

      ([entry]) => {

        if (entry.isIntersecting) {

          setInView(true);

          observer.disconnect();

        }

      },

      { rootMargin: '120px' }

    );

    observer.observe(node);

    return () => observer.disconnect();

  }, [lazyWhenPreview, inView]);



  const loadNews = useCallback(async (signal) => {

    setStatus('loading');

    try {

      const fetchLimit = limit || DEFAULT_PAGE_LIMIT;

      const items = await fetchRbcNews(signal, fetchLimit);

      setNews(items);

      setLastUpdated(new Date());

      const isFallback = items.length > 0

        && items.every((item) => String(item.id).startsWith('rbc-fallback'));

      setStatus(isFallback ? 'fallback' : 'ready');

    } catch (error) {

      if (error.name !== 'AbortError') setStatus('error');

    }

  }, [limit]);



  useEffect(() => {

    if (!inView) return undefined;

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

  }, [loadNews, inView]);



  const visibleNews = useMemo(() => (

    limit ? news.slice(0, limit) : news

  ), [limit, news]);



  return (

    <section

      ref={sectionRef}

      className={`rbc-news ${preview ? 'rbc-news--preview' : ''}`}

    >

      <div className="container">

        <div className="rbc-news__header">

          <div>

            <span className="rbc-news__eyebrow">КРИПТО И ЦИФРОВАЯ ЭКОНОМИКА</span>

            <h2 className="section-title">Новости РБК о криптовалютах</h2>

            <p className="rbc-news__subtitle">

              Подборка материалов РБК про крипторынок, блокчейн, майнинг и смежные темы — с переходом к оригиналу.

            </p>

          </div>

          <div className="rbc-news__actions">

            <span className="rbc-news__source">Источник: РБК</span>

            <button

              type="button"

              className="btn-outline rbc-news__refresh"

              onClick={() => loadNews(new AbortController().signal)}

              disabled={status === 'loading' || !inView}

            >

              {status === 'loading' ? 'Обновляем...' : 'Обновить'}

            </button>

            {preview && <Link to="/news" className="btn">Все новости</Link>}

          </div>

        </div>



        {!inView && lazyWhenPreview && (

          <div className="rbc-news__message" role="status">

            Лента загрузится, когда блок появится на экране.

          </div>

        )}



        {(status === 'error' || status === 'fallback') && inView && (

          <div className="rbc-news__message" role="status">

            {status === 'fallback'

              ? 'Полная лента новостей доступна при работающем API (локально: npm run server; на проде — деплой backend с маршрутом /api/rbc-news). Сейчас показаны 3 резервные карточки — нажмите «Обновить» после запуска сервера.'

              : 'Показана резервная крипто-подборка РБК. Не удалось получить свежую ленту, попробуйте обновить страницу позже.'}

          </div>

        )}



        {status === 'loading' && inView && news.length === 0 && (

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

