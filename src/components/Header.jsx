import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { aboutPath, cryptoMenuItems, investmentsPath, serviceMenuItems } from '../data/siteNavigation';

const CRYPTO_PATHS = cryptoMenuItems.map((item) => item.to);
const SERVICES_PATHS = ['/services', investmentsPath, ...serviceMenuItems.map((item) => item.to)];

const profileShortLabel = (user) => {
  if (!user) return 'Войти';
  const raw = user.firstName || user.name || user.email || 'Кабинет';
  if (raw.length <= 14) return raw;
  return `${raw.slice(0, 13)}…`;
};

const Header = ({ cartItemCount, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const headerRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [cryptoOpen, setCryptoOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setServicesOpen(false);
    setCryptoOpen(false);
  };

  const closeDropdowns = () => {
    setServicesOpen(false);
    setCryptoOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const openServices = () => {
    setCryptoOpen(false);
    setServicesOpen((open) => !open);
  };

  const openCrypto = () => {
    setServicesOpen(false);
    setCryptoOpen((open) => !open);
  };

  const servicesActive = SERVICES_PATHS.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const cryptoActive = CRYPTO_PATHS.some((path) => location.pathname.startsWith(path));

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setServicesOpen(false);
    setCryptoOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', isMobileMenuOpen);
    return () => document.body.classList.remove('mobile-nav-open');
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
        closeDropdowns();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!servicesOpen && !cryptoOpen) return undefined;
    const onPointerDown = (event) => {
      if (headerRef.current?.contains(event.target)) return;
      closeDropdowns();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [servicesOpen, cryptoOpen]);

  const actionButtons = (
    <>
      <Link to="/cart" className="btn-outline header-action nav-cart" onClick={closeMobileMenu} title="Корзина">
        <span className="header-action__icon" aria-hidden="true">🛒</span>
        <span className="header-action__text">Корзина</span>
        <span className="badge">{cartItemCount}</span>
      </Link>
      {isAdmin ? (
        <Link to="/admin" className="btn-outline header-action header-action--admin" onClick={closeMobileMenu}>
          Админ
        </Link>
      ) : null}
      <Link
        to="/profile"
        className="btn header-action nav-auth"
        onClick={closeMobileMenu}
        title={currentUser ? 'Личный кабинет' : 'Войти'}
      >
        {profileShortLabel(currentUser)}
      </Link>
    </>
  );

  return (
    <header className="header" ref={headerRef}>
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

      <nav id="site-navigation" className={`header-nav ${isMobileMenuOpen ? 'is-open' : ''}`} aria-label="Основное меню">
        <p className="header-nav__title">Меню</p>
        <ul className="nav-list nav-list--main">
          <li>
            <NavLink to="/" end className="nav-link" onClick={closeMobileMenu}>
              Главная
            </NavLink>
          </li>

          <li
            className={`nav-dropdown${servicesOpen ? ' open' : ''}`}
            onMouseEnter={() => {
              if (window.matchMedia('(min-width: 1025px)').matches) setServicesOpen(true);
            }}
            onMouseLeave={() => {
              if (window.matchMedia('(min-width: 1025px)').matches) setServicesOpen(false);
            }}
          >
            <button
              type="button"
              className={`nav-dropdown-trigger${servicesActive ? ' active' : ''}`}
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={openServices}
            >
              Услуги
            </button>
            <div className="nav-dropdown-menu nav-dropdown-menu--services" role="menu">
              {serviceMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  role="menuitem"
                  className="nav-menu-item"
                >
                  <span className="nav-menu-item__label">{item.label}</span>
                  {item.description ? <span className="nav-menu-item__hint">{item.description}</span> : null}
                </NavLink>
              ))}
            </div>
          </li>

          <li>
            <NavLink to="/products" className="nav-link" onClick={closeMobileMenu}>
              Каталог
            </NavLink>
          </li>

          <li>
            <NavLink to="/blog" className="nav-link" onClick={closeMobileMenu}>
              Блог
            </NavLink>
          </li>

          <li>
            <NavLink to={aboutPath} className="nav-link" onClick={closeMobileMenu}>
              О нас
            </NavLink>
          </li>

          <li>
            <NavLink to={investmentsPath} className="nav-link" onClick={closeMobileMenu}>
              Инвестиции
            </NavLink>
          </li>

          <li
            className={`nav-dropdown${cryptoOpen ? ' open' : ''}`}
            onMouseEnter={() => {
              if (window.matchMedia('(min-width: 1025px)').matches) setCryptoOpen(true);
            }}
            onMouseLeave={() => {
              if (window.matchMedia('(min-width: 1025px)').matches) setCryptoOpen(false);
            }}
          >
            <button
              type="button"
              className={`nav-dropdown-trigger${cryptoActive ? ' active' : ''}`}
              aria-expanded={cryptoOpen}
              aria-haspopup="true"
              onClick={openCrypto}
            >
              Крипто
            </button>
            <div className="nav-dropdown-menu nav-dropdown-menu--crypto" role="menu">
              {cryptoMenuItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={closeMobileMenu} role="menuitem">
                  {item.label}
                </NavLink>
              ))}
            </div>
          </li>
        </ul>
        <div className="header-nav__actions nav-buttons">{actionButtons}</div>
      </nav>

      <div className="nav-right nav-right--desktop nav-buttons">{actionButtons}</div>

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