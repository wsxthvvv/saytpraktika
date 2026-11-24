import { useEffect, useState } from 'react';
import PersonalDataConsentCheckbox from './PersonalDataConsentCheckbox';
import { submitLead } from '../api/submitLead';
import { formatRussianPhone } from '../utils/phone';
import { leadFieldsFromUser, profileLeadFields } from '../utils/profileLeadPrefill';

const ServiceLeadModal = ({ service, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [pdConsent, setPdConsent] = useState(false);
  const [pdError, setPdError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    const applyContacts = (fields) => {
      if (cancelled) return;
      setName(fields.name);
      setPhone(fields.phone);
      setEmail(service.prefillEmail || fields.email);
    };
    applyContacts(profileLeadFields());
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (!data.authenticated || !data.user) return;
        applyContacts(leadFieldsFromUser(data.user));
      })
      .catch(() => {});
    setComments(service.commentsPreset || '');
    setPdConsent(false);
    setPdError('');
    setDone(null);
    setBusy(false);
    return () => { cancelled = true; };
  }, [service]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!phone.trim() && !email.trim()) {
      setDone({ error: 'Укажите телефон или email, чтобы менеджер мог связаться с вами.' });
      return;
    }
    if (!pdConsent) {
      setPdError('Необходимо дать согласие на обработку персональных данных');
      return;
    }
    setDone(null);
    setPdError('');
    setBusy(true);
    const isCorporate = service?.kind === 'corporate' || Number(service?.id) >= 100;
    const result = await submitLead({
      type: isCorporate ? 'corporate_service' : 'service',
      topic: service?.title || 'Консультация по услуге',
      name: name.trim(),
      phone: formatRussianPhone(phone),
      email: email.trim(),
      comments: comments.trim() || undefined,
      itemsSummary: service?.title ? `Услуга #${service.id}: ${service.title}` : undefined,
      serviceId: service?.id,
      serviceKind: service?.kind || (isCorporate ? 'corporate' : 'dev'),
      serviceCategory: service?.category,
      direction: service?.direction,
      consent: true,
    });
    setBusy(false);
    if (result.stored) setDone(result);
    else setDone({ error: result.error || 'Не удалось сохранить заявку. Проверьте соединение и попробуйте ещё раз.' });
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
        {done && done.stored ? (
          <div className="service-lead-modal__body service-lead-modal__success" role="status">
            <p>
              {done.delivered
                ? 'Заявка отправлена руководителю. Мы свяжемся с вами в рабочее время.'
                : done.stored
                  ? `Заявка №${done.leadNumber || done.leadId || '—'} сохранена. Менеджер свяжется с вами.`
                  : 'Не удалось отправить заявку. Проверьте соединение и повторите попытку.'}
            </p>
            <button type="button" className="btn" onClick={onClose}>Закрыть</button>
          </div>
        ) : (
          <form className="service-lead-modal__body service-lead-modal__form" onSubmit={handleSubmit}>
            {done?.error && <p className="contact-widget__error" role="alert">{done.error}</p>}
            <p className="service-lead-modal__hint">
              Оставьте телефон или email. Заявка сохранится в системе и будет передана менеджеру. Оборудование для майнинга оформляется через корзину.
              {' '}
              Если вы вошли в личный кабинет, контакты подставятся из профиля — их можно изменить перед отправкой.
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
                <span className="service-lead-modal__label">Телефон</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
