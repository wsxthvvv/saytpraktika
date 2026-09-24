import { useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const Header = ({ cartItemCount, currentUser }) => {
  const [isMiningMenuOpen, setIsMiningMenuOpen] = useState(false);
  const closeTimerRef = useRef(null);

  const openMiningMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsMiningMenuOpen(true);
  };

  const scheduleCloseMiningMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsMiningMenuOpen(false);
      closeTimerRef.current = null;
    }, 260);
  };

  return (
    <header className="header">
      <Link to="/" className="logo">
        <span className="logo__mark">01</span>
        <span className="logo__word">service</span>
      </Link>
      <nav>
        <ul className="nav-list">
          <li><NavLink to="/" end>Главная</NavLink></li>
          <li><NavLink to="/services">Услуги</NavLink></li>
          <li><NavLink to="/products">Товары</NavLink></li>
          <li><NavLink to="/mining">Майнеры</NavLink></li>
          <li
            className={`nav-dropdown ${isMiningMenuOpen ? 'open' : ''}`}
            onMouseEnter={openMiningMenu}
            onMouseLeave={scheduleCloseMiningMenu}
          >
            <button
              type="button"
              className="nav-dropdown-trigger"
              onClick={() => {
                if (isMiningMenuOpen) {
                  scheduleCloseMiningMenu();
                } else {
                  openMiningMenu();
                }
              }}
            >
              Майнинг
            </button>
            <ul className="nav-dropdown-menu">
              <li>
                <NavLink to="/charts" onClick={() => setIsMiningMenuOpen(false)}>
                  Графики
                </NavLink>
              </li>
              <li>
                <NavLink to="/crypto" onClick={() => setIsMiningMenuOpen(false)}>
                  Конвертер
                </NavLink>
              </li>
            </ul>
          </li>
          <li><NavLink to="/blog">Блог</NavLink></li>
          <li><NavLink to="/uploads">Загрузки</NavLink></li>
        </ul>
      </nav>
      <div className="nav-right">
        <div className="nav-buttons">
          <Link to="/cart" className="btn-outline nav-cart">
            Корзина <span className="badge">{cartItemCount}</span>
          </Link>
          <Link to="/profile" className="btn nav-auth">
            {currentUser ? currentUser.firstName || currentUser.name || currentUser.email : 'Войти'}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;