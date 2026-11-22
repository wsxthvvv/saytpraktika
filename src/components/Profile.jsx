// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import Auth from './Auth';
import { Link } from 'react-router-dom';
import { changePassword, persistSessionProfile } from '../utils/userAuth';
import { consumeLeadNotice } from '../utils/leadNotice';
import { formatUsd } from '../utils/currency';

const ReviewForm = ({ orderId, productId, productTitle, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, productId, rating: Number(rating), text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(data.error || 'Не удалось отправить отзыв');
        return;
      }
      setNotice(`Отзыв о товаре «${productTitle || 'товар'}» отправлен на проверку.`);
      setText('');
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      setNotice('Не удалось связаться с сервером. Проверьте соединение и повторите отправку.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) return <p className="profile-review-form" role="status">Отзыв на «{productTitle || 'товар'}» отправлен на проверку.</p>;
  return (
    <form className="profile-review-form" onSubmit={submit}>
      <strong>Оставить отзыв</strong>
      <div className="profile-review-form__row">
        <label>Оценка
          <select value={rating} onChange={(event) => setRating(event.target.value)}>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} из 5</option>)}
          </select>
        </label>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Расскажите о заказе" minLength={10} required />
      </div>
      <button type="submit" className="btn-outline" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить на модерацию'}</button>
      {notice && <small>{notice}</small>}
    </form>
  );
};

const Profile = ({ onLogin, onRegister, onLogout, currentUser }) => {
  const [user, setUser] = useState(currentUser || null);
  const [leadNotice] = useState(() => consumeLeadNotice());
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordNotice, setPasswordNotice] = useState('');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    patronymic: '',
    phone: '',
    email: '',
    address: '',
  });
  const [profileNotice, setProfileNotice] = useState('');

  useEffect(() => {
    setUser(currentUser || null);
    if (currentUser?.id) {
      fetch('/api/orders', { credentials: 'include' })
        .then(async (response) => {
          const ordersData = await response.json();
          const reviewsResponse = await fetch('/api/reviews?mine=1', { credentials: 'include' });
          const reviewsData = await reviewsResponse.json().catch(() => ({}));
          return { ordersData, reviewsData };
        })
        .then(({ ordersData, reviewsData }) => {
          if (ordersData.ok) {
            const reviewed = new Set((reviewsData.reviews || []).map((review) => `${review.orderId}:${review.productId}`));
            const orders = ordersData.orders.map((order) => ({
              ...order,
              items: (order.items || []).map((item) => ({ ...item, hasReview: reviewed.has(`${order.id}:${item.id}`) })),
            }));
            setUser((previous) => previous?.id === currentUser.id ? { ...previous, orders } : previous);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      patronymic: user.patronymic || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- синхронизация формы при смене учётной записи
  }, [user?.id, user?.email]);

  const handleLogin = (userData) => {
    setUser(userData);
    onLogin?.(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
    onRegister?.(userData);
  };

  const handleLogout = () => {
    setUser(null);
    onLogout?.();
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Отменить новый заказ?')) return;
    const reason = window.prompt('Причина отмены (необязательно):') || '';
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { window.alert(data.error || 'Не удалось отменить заказ'); return; }
      setUser((previous) => ({ ...previous, orders: previous.orders.map((order) => order.id === orderId ? data.order : order) }));
    } catch {
      window.alert('Не удалось связаться с сервером. Заказ не изменён.');
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileNotice('');
    const merged = {
      ...user,
      ...profileForm,
      name: [profileForm.lastName, profileForm.firstName, profileForm.patronymic].filter(Boolean).join(' ') || user.name,
    };
    const result = await persistSessionProfile(merged);
    if (!result.ok) {
      setProfileNotice(result.error || 'Не удалось сохранить профиль');
      return;
    }
    const updatedUser = result.user || merged;
    setUser((previous) => ({ ...previous, ...updatedUser, orders: previous?.orders || [] }));
    onLogin?.(updatedUser);
    setProfileNotice('Данные профиля сохранены.');
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordNotice('');
    if (passwords.next !== passwords.confirm) {
      setPasswordNotice('Новые пароли не совпадают.');
      return;
    }
    try {
      const result = await changePassword(passwords.current, passwords.next, passwords.confirm);
      setPasswordNotice(result.ok ? 'Пароль изменён.' : result.error || 'Не удалось изменить пароль.');
      if (result.ok) setPasswords({ current: '', next: '', confirm: '' });
    } catch {
      setPasswordNotice('Не удалось связаться с сервером. Попробуйте позже.');
    }
  };

  const fullName = user
    ? [user.lastName, user.firstName, user.patronymic].filter(Boolean).join(' ') || user.name
    : '';

  return (
    <div className="profile-section">
      <h2 className="section-title">Личный кабинет</h2>
      {leadNotice && (
        <p className="profile-lead-notice" role="status">
          {leadNotice}
        </p>
      )}
      {!user ? (
        <Auth onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <div className="profile-card">
          <div className="profile-card__header">
            <p className="profile-card__greeting">
              Привет, <span>{user.firstName || user.name}</span>!
            </p>
            {user.role === 'admin' && (
              <p className="profile-admin-hint" role="status">
                Вы вошли как администратор. Заказы и корзина на сайте для клиентов — управление в{' '}
                <Link to="/admin">админ-панели</Link>.
              </p>
            )}
            <div className="profile-card__header-actions">
              {user.role === 'admin' && (
                <Link to="/admin" className="btn-outline">Админ-панель</Link>
              )}
              <button onClick={handleLogout} className="btn" type="button">
                Выйти
              </button>
            </div>
          </div>
          <div className="profile-card__body">
            <form className="profile-edit-form" onSubmit={handleProfileSave}>
              <h3>Данные профиля</h3>
              <div className="profile-edit-form__grid">
                <input placeholder="Фамилия" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
                <input placeholder="Имя" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
                <input placeholder="Отчество" value={profileForm.patronymic} onChange={(e) => setProfileForm({ ...profileForm, patronymic: e.target.value })} />
                <input type="tel" placeholder="Телефон" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                <input type="email" placeholder="Email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
                <input placeholder="Адрес по умолчанию" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
              </div>
              <button type="submit" className="btn-outline">Сохранить профиль</button>
              {profileNotice && <p role="status">{profileNotice}</p>}
            </form>
            <div className="profile-card__info">
              {fullName && (
                <div className="profile-info-item">
                  <span className="profile-info-label">ФИО:</span>
                  <span className="profile-info-value">{fullName}</span>
                </div>
              )}
              <div className="profile-info-item">
                <span className="profile-info-label">Email:</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
              {user.phone && (
                <div className="profile-info-item">
                  <span className="profile-info-label">Телефон:</span>
                  <span className="profile-info-value">{user.phone}</span>
                </div>
              )}
            </div>
            <form className="profile-password-form" onSubmit={handlePasswordChange}>
              <h3>Смена пароля</h3>
              <label htmlFor="profile-current-password">Текущий пароль</label>
              <input id="profile-current-password" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required />
              <label htmlFor="profile-new-password">Новый пароль</label>
              <input id="profile-new-password" type="password" autoComplete="new-password" minLength={8} value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required />
              <label htmlFor="profile-confirm-password">Повторите новый пароль</label>
              <input id="profile-confirm-password" type="password" autoComplete="new-password" minLength={8} value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required />
              <button type="submit" className="btn-outline">Изменить пароль</button>
              {passwordNotice && <p role="status">{passwordNotice}</p>}
            </form>
            <h3>История заказов:</h3>
            {user.orders?.length ? (
              <div className="profile-orders">
                {user.orders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-card__header">
                      <div className="order-card__title">
                        <span>Заказ #{order.orderNumber || String(order.id).slice(0, 8)}</span>
                        <span className={`status status--${order.status}`}>{order.status}</span>
                      </div>
                      <div className="order-card__date">
                        {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="order-card__items">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="order-item-small">
                          {item.title} × {item.quantity || 1}
                        </div>
                      ))}
                    </div>
                    <div className="order-card__details">
                      {order.contactName && (
                        <div className="order-detail">
                          <span className="order-detail__icon">👤</span>
                          <span>{order.contactName}</span>
                        </div>
                      )}
                      {order.address && (
                        <div className="order-detail">
                          <span className="order-detail__icon">📍</span>
                          <span>{order.address}</span>
                        </div>
                      )}
                      {order.deliveryDate && order.deliveryTime && (
                        <div className="order-detail">
                          <span className="order-detail__icon">📅</span>
                          <span>
                            {new Date(order.deliveryDate).toLocaleDateString('ru-RU')} в {order.deliveryTime}
                          </span>
                        </div>
                      )}
                      {order.phone && (
                        <div className="order-detail">
                          <span className="order-detail__icon">📞</span>
                          <span>{order.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="order-card__total">
                      Итого: <span className="order-total">{formatUsd(order.total)}</span>
                    </div>
                    {order.status === 'Новый' && (
                      <button type="button" className="btn-outline" onClick={() => cancelOrder(order.id)}>Отменить заказ</button>
                    )}
                    {order.statusHistory?.length > 0 && <details className="order-status-history"><summary>История статусов</summary>{order.statusHistory.map((item, index) => <p key={`${item.createdAt}-${index}`}>{item.label || item.status} · {new Date(item.createdAt).toLocaleString('ru-RU')}{item.reason ? ` · ${item.reason}` : ''}</p>)}</details>}
                    {order.status === 'Выполнен' && order.items?.map((item) => item.hasReview
                      ? <p className="profile-review-form" key={item.id}>Отзыв на «{item.title}» уже отправлен. После модерации он появится на сайте.</p>
                      : <ReviewForm key={item.id} orderId={order.id} productId={item.id} productTitle={item.title} />)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-empty">
                {user.role === 'admin'
                  ? 'Учётная запись администратора: заказы клиентов смотрите в админ-панели → «Заказы».'
                  : 'Пока нет заказов — добавьте майнер или товар в корзину и оформите доставку.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
