import { useEffect, useRef, useState } from 'react';

const ContactWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [isSent, setIsSent] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const widgetRef = useRef(null);

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (!digits.startsWith('7')) digits = `7${digits}`;
    digits = digits.slice(0, 11);

    const national = digits.slice(1);
    const p1 = national.slice(0, 3);
    const p2 = national.slice(3, 6);
    const p3 = national.slice(6, 8);
    const p4 = national.slice(8, 10);

    let out = '+7';
    if (p1) out += ` ${p1}`;
    if (p2) out += ` ${p2}`;
    if (p3) out += ` ${p3}`;
    if (p4) out += ` ${p4}`;
    if (out === '+7') out = '+7 ';
    return out;
  };

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!widgetRef.current) return;
      if (!widgetRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const handleRequestCall = (event) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    let hasError = false;

    if (!name.trim()) {
      setNameError('Необходимо ввести имя');
      hasError = true;
    } else {
      setNameError('');
    }

    if (digits.length !== 11 || !digits.startsWith('7')) {
      setPhoneError('Введите полный номер в формате +7 900 000 00 00');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (hasError) return;

    setIsSent(true);
    setName('');
    setPhone('+7 ');
    setTimeout(() => setIsSent(false), 1800);
  };

  return (
    <div className="contact-widget" ref={widgetRef}>
      {isOpen && (
        <div className="contact-widget__panel">
          <p className="contact-widget__title">Контакты</p>
          <p className="contact-widget__subtitle">Руководитель проекта: Лаврентьев Дмитрий Михайлович</p>

          <div className="contact-widget__links">
            <div className="contact-widget__contact-item">+7 903 764 46 98</div>
            <div className="contact-widget__contact-item">5421062@mail.ru</div>
            <div className="contact-widget__contact-item">Telegram: @Litwin4all</div>
          </div>

          <form className="contact-widget__form" onSubmit={handleRequestCall}>
            <input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) setNameError('');
              }}
            />
            {nameError && <p className="contact-widget__error">{nameError}</p>}
            <input
              type="tel"
              placeholder="+7 900 000 00 00"
              value={phone}
              onChange={(event) => {
                setPhone(formatPhone(event.target.value));
                if (phoneError) setPhoneError('');
              }}
            />
            {phoneError && <p className="contact-widget__error">{phoneError}</p>}
            <button type="submit" className="btn contact-widget__cta">
              Готовы обсудить ваши задачи
            </button>
          </form>
          {isSent && <p className="contact-widget__success">Мы вам скоро позвоним.</p>}
        </div>
      )}

      <button
        type="button"
        className={`contact-widget__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Открыть контакты и обратную связь"
      >
        ☎
      </button>
    </div>
  );
};

export default ContactWidget;
