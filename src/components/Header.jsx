import { NavLink, Link } from 'react-router-dom';

const Header = ({ cartItemCount, currentUser }) => {
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
          <li><NavLink to="/crypto">Конвертер</NavLink></li>
          <li><NavLink to="/mining">Майнинг</NavLink></li>
          <li><NavLink to="/blog">Блог</NavLink></li>
          <li><NavLink to="/charts">Графики</NavLink></li> {/* ← НОВЫЙ ПУНКТ */}
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