// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import Auth from './Auth';
import { changePassword, mergeSessionWithRecord, persistSessionProfile, toSessionUser } from '../utils/userAuth';
import { consumeLeadNotice } from '../utils/leadNotice';
import { formatUsd, rubToUsd } from '../utils/currency';

const ReviewForm = ({ orderId, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    const response = await fetch('/api/reviews', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, rating: Number(rating), text }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setNotice(data.error || 'Не удалось отправить отзыв');
      return;
    }
    setNotice('Отзыв отправлен на проверку.');
    setText('');
    onSubmitted?.();
  };

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
  const readUser = () => {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return currentUser || null;
    return mergeSessionWithRecord(toSessionUser(JSON.parse(saved)));
  };

  const [user, setUser] = useState(readUser);
  const [leadNotice] = useState(() => consumeLeadNotice());
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [passwordNotice, setPasswordNotice] = useState('');

  useEffect(() => {
    const syncUser = () => {
      setUser(readUser());
    };

    syncUser();
    if (currentUser?.id) {
      fetch('/api/orders', { credentials: 'include' })
        .then((response) => response.json())
        .then((data) => {
          if (data.ok) setUser((previous) => ({ ...previous, orders: data.orders }));
        })
        .catch(() => {});
    }
    window.addEventListener('storage', syncUser);
    window.addEventListener('userUpdated', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('userUpdated', syncUser);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readUser стабильна по смыслу
  }, [currentUser?.id]);

  const handleLogin = (userData) => {
    const merged = mergeSessionWithRecord(userData);
    localStorage.setItem('currentUser', JSON.stringify(merged));
    setUser(merged);
    onLogin?.(merged);
  };

  const handleRegister = (userData) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    persistSessionProfile(userData);
    setUser(userData);
    onRegister?.(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    onLogout?.();
  };

  const cancelOrder = async (orderId) => {
    const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PATCH', credentials: 'include' });
    if (!response.ok) return;
    setUser((previous) => ({ ...previous, orders: previous.orders.map((order) => order.id === orderId ? { ...order, status: 'Отменена' } : order) }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordNotice('');
    const result = await changePassword(passwords.current, passwords.next);
    setPasswordNotice(result.ok ? 'Пароль изменён.' : result.error);
    if (result.ok) setPasswords({ current: '', next: '' });
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
            <button onClick={handleLogout} className="btn">
              Выйти
            </button>
          </div>
          <div className="profile-card__body">
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
              <input type="password" placeholder="Текущий пароль" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required />
              <input type="password" placeholder="Новый пароль (от 8 символов)" minLength={8} value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required />
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
                        <span>Заказ #{order.id}</span>
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
                      Итого: <span className="order-total">{formatUsd(
                        order.currency !== 'USD' && order.items?.length && order.items.every((item) => String(item.id).startsWith('product-'))
                          ? rubToUsd(order.total)
                          : order.total
                      )}</span>
                    </div>
                    {['Ожидание', 'В работе'].includes(order.status) && (
                      <button type="button" className="btn-outline" onClick={() => cancelOrder(order.id)}>Отменить заказ</button>
                    )}
                    {order.status === 'Завершена' && <ReviewForm orderId={order.id} />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-empty">Пока нет заказов — выберите услугу, и мы всё запустим!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
