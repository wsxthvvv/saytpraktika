import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const BrandLogo = ({ variant = 'header', className = '', onClick }) => {
  const isHeader = variant === 'header';

  const inner = (
    <span className={`brand-logo brand-logo--${variant} ${className}`.trim()}>
      <span className="brand-logo__circle" aria-hidden="true">
        01
      </span>
      <span className="brand-logo__text">
        <span className="brand-logo__name">СЕРВИС</span>
        {isHeader && (
          <span className="brand-logo__tagline">КОМПЬЮТЕРЫ И ОБСЛУЖИВАНИЕ</span>
        )}
      </span>
    </span>
  );

  if (onClick) {
    return (
      <Link to="/" className="brand-logo-link" onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <Link to="/" className="brand-logo-link">
      {inner}
    </Link>
  );
};

BrandLogo.propTypes = {
  variant: PropTypes.oneOf(['header', 'footer']),
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default BrandLogo;
