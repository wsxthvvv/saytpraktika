import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import { CartProvider, useCart } from './contexts/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Services from './components/Services';
import CryptoConverter from './components/CryptoConverter';
import Profile from './components/Profile';
import Cart from './components/Cart';
import Home from './pages/Home';
import Blog from './components/Blog';
import BlogArticle from './components/BlogArticle';
import MiningEquipment from './components/MiningEquipment';
import MinerDetail from './components/MinerDetail';
import ChartsPage from './components/ChartsPage';
import CryptoMarquee from './components/CryptoMarquee';

// Компонент для прокрутки наверх при смене маршрута
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function AppContent() {
  const { itemCount } = useCart();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem('currentUser');
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener('userUpdated', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('userUpdated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="App">
      <Header cartItemCount={itemCount} currentUser={user} />
      <CryptoMarquee />
      <ScrollToTop />
      <main className="main-content container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
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
          <Route path="/mining" element={<MiningEquipment />} />
          <Route path="/mining/:id" element={<MinerDetail />} />
          <Route path="/charts" element={<ChartsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
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