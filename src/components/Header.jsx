import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const Header = ({ cartItemCount, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', isMobileMenuOpen);
    return () => document.body.classList.remove('mobile-nav-open');
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMobileMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navLinks = (
    <>
      <li><NavLink to="/" end onClick={closeMobileMenu}>Главная</NavLink></li>
      <li><NavLink to="/services" onClick={closeMobileMenu}>Услуги</NavLink></li>
      <li><NavLink to="/products" onClick={closeMobileMenu}>Товары</NavLink></li>
      <li><NavLink to="/charts" onClick={closeMobileMenu}>Графики</NavLink></li>
      <li><NavLink to="/crypto" onClick={closeMobileMenu}>Конвертер</NavLink></li>
      <li><NavLink to="/news" onClick={closeMobileMenu}>Новости</NavLink></li>
    </>
  );

  return (
    <header className="header">
      <BrandLogo variant="header" onClick={closeMobileMenu} />

      <button
        type="button"
        className={`header-burger ${isMobileMenuOpen ? 'is-open' : ''}`}
        aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={isMobileMenuOpen}
        aria-controls="site-navigation"
        onClick={toggleMobileMenu}
      >
        <span className="header-burger__bar" aria-hidden="true" />
        <span className="header-burger__bar" aria-hidden="true" />
        <span className="header-burger__bar" aria-hidden="true" />
      </button>

      <nav id="site-navigation" className={`header-nav ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <ul className="nav-list">{navLinks}</ul>
        <div className="header-nav__actions nav-buttons">
          {isAdmin ? (
            <Link to="/admin" className="btn-outline" onClick={closeMobileMenu}>Админ-панель</Link>
          ) : (
            <Link to="/cart" className="btn-outline nav-cart" onClick={closeMobileMenu}>
              Корзина <span className="badge">{cartItemCount}</span>
            </Link>
          )}
          <Link to="/profile" className="btn nav-auth" onClick={closeMobileMenu}>
            {currentUser ? currentUser.firstName || currentUser.name || currentUser.email : 'Войти'}
          </Link>
        </div>
      </nav>

      <div className="nav-right nav-right--desktop">
        <div className="nav-buttons">
          {isAdmin ? (
            <Link to="/admin" className="btn-outline">Админ-панель</Link>
          ) : (
            <Link to="/cart" className="btn-outline nav-cart">
              Корзина <span className="badge">{cartItemCount}</span>
            </Link>
          )}
          <Link to="/profile" className="btn nav-auth">
            {currentUser ? currentUser.firstName || currentUser.name || currentUser.email : 'Войти'}
          </Link>
        </div>
      </div>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="header-nav-backdrop"
          aria-label="Закрыть меню"
          onClick={closeMobileMenu}
        />
      )}
    </header>
  );
};

export default Header;
