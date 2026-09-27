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
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,rub&include_24hr_change=true';

const RATES_ROUTES = ['/', '/crypto', '/charts'];

const CryptoRatesContext = createContext(null);

export const CryptoRatesProvider = ({ children }) => {
  const { pathname } = useLocation();
  const shouldPoll = RATES_ROUTES.includes(pathname);
  const [simple, setSimple] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(COINGECKO_SIMPLE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSimple(data);
    } catch (err) {
      setError(err.message || 'fetch_failed');
    } finally {
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
    }),
    [simple, loading, error, fetchRates, shouldPoll]
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
