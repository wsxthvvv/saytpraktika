import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

const CACHE_KEY = '01service_crypto_rates_v1';
const CACHE_TTL = 60000;

const readCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached?.data && cached.updatedAt) return cached;
  } catch {
    // Повреждённый кэш не должен ломать загрузку сайта.
  }
  return null;
};

const RATES_ROUTES = ['/', '/crypto', '/charts'];

const CryptoRatesContext = createContext(null);

export const CryptoRatesProvider = ({ children }) => {
  const { pathname } = useLocation();
  const shouldPoll = RATES_ROUTES.includes(pathname);
  const [cached] = useState(readCache);
  const [simple, setSimple] = useState(cached?.data || null);
  const [markets, setMarkets] = useState(cached?.markets || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(cached?.updatedAt || null);

  const fetchRates = useCallback(async () => {
    let timeout;
    try {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/crypto/markets', { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Курсы временно недоступны');
      setSimple(data.simple || null);
      setMarkets(Array.isArray(data.markets) ? data.markets : []);
      const nextUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();
      setUpdatedAt(nextUpdatedAt);
      setError(data.error || null);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.simple, markets: data.markets || [], updatedAt: nextUpdatedAt }));
      } catch {
        // Кэш браузера необязателен; приватный режим не должен помечать свежий ответ как ошибку.
      }
    } catch (err) {
      setError(err.name === 'AbortError' ? 'timeout' : err.message || 'fetch_failed');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldPoll) return undefined;
    fetchRates();
    const timer = window.setInterval(fetchRates, 60000);
    return () => window.clearInterval(timer);
  }, [shouldPoll, fetchRates]);

  const value = useMemo(
    () => ({
      simple,
      markets,
      loading: shouldPoll && loading && !simple,
      error,
      refresh: fetchRates,
      enabled: shouldPoll,
      updatedAt,
      stale: Boolean(updatedAt && Date.now() - updatedAt > CACHE_TTL),
    }),
    [simple, markets, loading, error, fetchRates, shouldPoll, updatedAt]
  );

  return (
    <CryptoRatesContext.Provider value={value}>
      {children}
    </CryptoRatesContext.Provider>
  );
};

export const useCryptoRates = () => {
  const ctx = useContext(CryptoRatesContext);
  if (!ctx) {
    throw new Error('useCryptoRates must be used within CryptoRatesProvider');
  }
  return ctx;
};
