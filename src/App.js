import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import './responsive.css';
import { CartProvider, useCart } from './contexts/CartContext';
import { CryptoRatesProvider } from './contexts/CryptoRatesContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import CryptoConverter from './components/CryptoConverter';
import Profile from './components/Profile';
import Services from './components/Services';
import ProductsPage from './components/ProductsPage';
import Blog from './components/Blog';
import BlogArticle from './components/BlogArticle';
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
import { flushPendingLeads } from './utils/flushPendingLeads';
import AdminPanel from './components/AdminPanel';

const Home = lazy(() => import('./pages/Home'));
const ChartsPage = lazy(() => import('./components/ChartsPage'));
const MiningEquipment = lazy(() => import('./components/MiningEquipment'));

const RouteFallback = () => (
  <p className="route-loading" role="status">
    Загружаем страницу…
  </p>
);

function AppContent() {
  const { itemCount } = useCart();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? toSessionUser(JSON.parse(stored)) : null;
  });

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem('currentUser');
      setUser(stored ? toSessionUser(JSON.parse(stored)) : null);
    };
    window.addEventListener('userUpdated', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('userUpdated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  useEffect(() => {
    getCurrentUser().then((remoteUser) => {
      if (remoteUser) {
        localStorage.setItem('currentUser', JSON.stringify(remoteUser));
        setUser(remoteUser);
      } else {
        localStorage.removeItem('currentUser');
        setUser(null);
      }
    }).catch(() => {
      // The profile page still renders the local cached state while the API is unavailable.
    });
  }, []);

  useEffect(() => {
    flushPendingLeads();
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setUser(userData);
  };

  const handleRegister = (userData) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    logoutUser().catch(() => {});
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  return (
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
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogArticle />} />
              <Route path="/news" element={<RbcNewsFeed />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/consent" element={<ConsentPD />} />
              <Route path="/mining" element={<MiningEquipment />} />
              <Route path="/mining/:id" element={<MinerDetail />} />
              <Route path="/charts" element={<ChartsPage />} />
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
