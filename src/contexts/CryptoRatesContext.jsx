import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

const COINGECKO_SIMPLE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

const CACHE_KEY = '01service_crypto_rates_v1';
const CACHE_TTL = 120000;

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
      const res = await fetch(COINGECKO_SIMPLE_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSimple(data);
      const nextUpdatedAt = Date.now();
      setUpdatedAt(nextUpdatedAt);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, updatedAt: nextUpdatedAt }));
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
      loading: shouldPoll && loading && !simple,
      error,
      refresh: fetchRates,
      enabled: shouldPoll,
      updatedAt,
      stale: Boolean(updatedAt && Date.now() - updatedAt > CACHE_TTL),
    }),
    [simple, loading, error, fetchRates, shouldPoll, updatedAt]
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
