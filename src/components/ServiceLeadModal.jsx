import { useState } from 'react';
import PersonalDataConsentCheckbox from './PersonalDataConsentCheckbox';
import { submitLead } from '../api/submitLead';
import { formatRussianPhone } from '../utils/phone';

const ServiceLeadModal = ({ service, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [pdConsent, setPdConsent] = useState(false);
  const [pdError, setPdError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!pdConsent) {
      setPdError('Необходимо дать согласие на обработку персональных данных');
      return;
    }
    setPdError('');
    setBusy(true);
    const result = await submitLead({
      type: 'service',
      name: name.trim(),
      phone: formatRussianPhone(phone),
      email: email.trim(),
      comments: comments.trim() || undefined,
      itemsSummary: service?.title ? `Услуга: ${service.title}` : undefined,
    });
    setBusy(false);
    setDone(result);
  };

  if (!service) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content service-lead-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header service-lead-modal__header">
          <div>
            <h2 className="modal-title">Заявка на услугу</h2>
            <p className="service-lead-modal__service-name">{service.title}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        {done ? (
          <div className="service-lead-modal__body service-lead-modal__success" role="status">
            <p>
              {done.delivered
                ? 'Заявка отправлена руководителю. Мы свяжемся с вами в рабочее время.'
                : done.stored
                  ? 'Заявка сохранена. Менеджер увидит её в системе и свяжется с вами.'
                  : 'Заявка сохранена на устройстве и будет отправлена при подключении сервера. Срочно: +7 903 764 46 98, 5421062@mail.ru.'}
            </p>
            <button type="button" className="btn" onClick={onClose}>Закрыть</button>
          </div>
        ) : (
          <form className="service-lead-modal__body service-lead-modal__form" onSubmit={handleSubmit}>
            <p className="service-lead-modal__hint">
              Заявка уйдёт менеджеру в Telegram. Оборудование для майнинга оформляется через корзину.
            </p>
            <div className="service-lead-modal__fields">
              <label className="service-lead-modal__field service-lead-modal__field--full">
                <span className="service-lead-modal__label">Имя *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                />
              </label>
              <label className="service-lead-modal__field">
                <span className="service-lead-modal__label">Телефон *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+7 900 000 00 00"
                  autoComplete="tel"
                />
              </label>
              <label className="service-lead-modal__field">
                <span className="service-lead-modal__label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.ru"
                  autoComplete="email"
                />
              </label>
              <label className="service-lead-modal__field service-lead-modal__field--full">
                <span className="service-lead-modal__label">Комментарий</span>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  placeholder="Кратко опишите задачу"
                />
              </label>
            </div>
            <div className="service-lead-modal__consent">
              <PersonalDataConsentCheckbox
                id="service-lead-pd"
                checked={pdConsent}
                onChange={(value) => {
                  setPdConsent(value);
                  if (value) setPdError('');
                }}
                error={pdError}
              />
            </div>
            <div className="service-lead-modal__actions">
              <button type="button" className="btn-outline" onClick={onClose}>Отмена</button>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? 'Отправляем…' : 'Отправить заявку'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ServiceLeadModal;
