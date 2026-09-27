import { Link } from 'react-router-dom';

const PersonalDataConsentCheckbox = ({
  id = 'pd-consent',
  checked,
  onChange,
  error,
}) => (
  <div className={`pd-consent ${error ? 'pd-consent--error' : ''}`}>
    <label className="pd-consent__label" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        name="pdConsent"
        className="pd-consent__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="pd-consent__text">
        Я согласен на обработку персональных данных и подтверждаю, что ознакомлен с{' '}
        <Link to="/consent" target="_blank" rel="noopener noreferrer">
          Согласием на обработку ПДн
        </Link>
        {' '}и{' '}
        <Link to="/privacy" target="_blank" rel="noopener noreferrer">
          Политикой конфиденциальности
        </Link>
      </span>
    </label>
    {error && <p className="pd-consent__error" role="alert">{error}</p>}
  </div>
);

export default PersonalDataConsentCheckbox;
