import { useLocation } from 'react-router-dom';
import CryptoMarquee from './CryptoMarquee';

const MARQUEE_PATHS = ['/', '/crypto', '/charts'];

const CryptoMarqueeGate = () => {
  const { pathname } = useLocation();
  if (!MARQUEE_PATHS.includes(pathname)) return null;
  return <CryptoMarquee />;
};

export default CryptoMarqueeGate;
