import { lazy, Suspense, useState, useEffect } from 'react';
import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom';
import './App.css';
import './responsive.css';
import './styles/storefront.css';
import './styles/corporate.css';
import './styles/investments.css';
import './styles/about.css';
import { CartProvider, useCart } from './contexts/CartContext';
import { CryptoRatesProvider } from './contexts/CryptoRatesContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import CryptoConverter from './components/CryptoConverter';
import Profile from './components/Profile';
import Services from './components/Services';
import ProductsPage from './components/ProductsPage';
import MinerDetail from './components/MinerDetail';
import RbcNewsFeed from './components/RbcNewsFeed';
import PrivacyPolicy from './components/PrivacyPolicy';
import ConsentPD from './components/ConsentPD';
import CookieBanner from './components/CookieBanner';
import ContactWidget from './components/ContactWidget';
import MessengerFab from './components/MessengerFab';
import ScrollToTop from './components/ScrollToTop';
import CryptoMarqueeGate from './components/CryptoMarqueeGate';
import DocumentHead from './components/DocumentHead';
import { getCurrentUser, logoutUser, toSessionUser } from './utils/userAuth';
import AdminPanel from './components/AdminPanel';
import SiteNotFound from './components/SiteNotFound';
import DirectionLanding from './components/DirectionLanding';
import { setSessionUser } from './utils/sessionUser';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';

const Home = lazy(() => import('./pages/Home'));
const ChartsPage = lazy(() => import('./components/ChartsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LegacyMinerRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/products/${encodeURIComponent(id)}`} replace />;
};

const RouteFallback = () => (
  <p className="route-loading" role="status">
    Загружаем страницу…
  </p>
);

function AppContent() {
  const { itemCount } = useCart();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const syncUser = (event) => {
      const nextUser = event.detail === undefined ? null : toSessionUser(event.detail);
      setSessionUser(nextUser);
      setUser(nextUser);
    };
    window.addEventListener('userUpdated', syncUser);
    return () => window.removeEventListener('userUpdated', syncUser);
  }, []);

  useEffect(() => {
    getCurrentUser().then((remoteUser) => {
      if (remoteUser) {
        setSessionUser(remoteUser);
        setUser(remoteUser);
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: remoteUser }));
      } else {
        setSessionUser(null);
        setUser(null);
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
      }
    }).catch(() => {
      setSessionUser(null);
      setUser(null);
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
    });
  }, []);

  const handleLogin = (userData) => {
    setSessionUser(userData);
    setUser(userData);
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: userData }));
  };

  const handleRegister = (userData) => {
    setSessionUser(userData);
    setUser(userData);
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: userData }));
  };

  const handleLogout = () => {
    logoutUser().catch(() => {});
    setSessionUser(null);
    setUser(null);
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
  };

  return (
    <SiteSettingsProvider>
    <CryptoRatesProvider>
      <div className={`App${isAdminRoute ? ' App--admin' : ''}`}>
        {!isAdminRoute && (
          <>
            <DocumentHead />
            <a href="#main-content" className="skip-link">
              Перейти к содержимому
            </a>
            <Header cartItemCount={itemCount} currentUser={user} />
            <CryptoMarqueeGate />
            <ScrollToTop />
          </>
        )}
        <main id="main-content" className={isAdminRoute ? 'admin-main' : 'main-content container'}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/it" element={<DirectionLanding slug="it" />} />
              <Route path="/accounting" element={<DirectionLanding slug="accounting" />} />
              <Route path="/ai" element={<DirectionLanding slug="ai" />} />
              <Route path="/mining-services" element={<DirectionLanding slug="mining-services" />} />
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/crypto" element={<CryptoConverter />} />
              <Route
                path="/profile"
                element={
                  <Profile
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    onLogout={handleLogout}
                    currentUser={user}
                  />
                }
              />
              <Route path="/cart" element={<Cart />} />
              <Route path="/news" element={<RbcNewsFeed />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/consent" element={<ConsentPD />} />
              <Route path="/mining" element={<Navigate to="/products?category=miner" replace />} />
              <Route path="/mining/:id" element={<LegacyMinerRedirect />} />
              <Route path="/products/:id" element={<MinerDetail />} />
              <Route path="/charts" element={<ChartsPage />} />
              <Route path="*" element={<SiteNotFound />} />
            </Routes>
          </Suspense>
        </main>
        {!isAdminRoute && (
          <>
            <MessengerFab />
            <ContactWidget />
            <CookieBanner />
            <Footer />
          </>
        )}
      </div>
    </CryptoRatesProvider>
    </SiteSettingsProvider>
  );
}

function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;
