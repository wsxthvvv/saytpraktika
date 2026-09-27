import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COOKIE_CONSENT_KEY } from '../constants/legalEntity';
import { initYandexMetrika } from '../utils/yandexMetrika';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        setVisible(true);
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed?.accepted) initYandexMetrika();
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        accepted: true,
        at: new Date().toISOString(),
      }));
    } catch {
      /* ignore quota errors */
    }
    initYandexMetrika();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-banner-title" aria-live="polite">
      <div className="cookie-banner__inner container">
        <div className="cookie-banner__text">
          <p id="cookie-banner-title" className="cookie-banner__title">Мы используем cookie</p>
          <p className="cookie-banner__desc">
            Сайт применяет cookie и localStorage для работы сервисов и сохранения настроек.
            Конвертер и новости могут обращаться к внешним API (CoinGecko, РБК и др.) — см.{' '}
            <Link to="/privacy">Политику конфиденциальности</Link>, раздел 7.
          </p>
        </div>
        <button type="button" className="btn cookie-banner__accept" onClick={accept}>
          Принять
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
