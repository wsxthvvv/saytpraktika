// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import Auth from './Auth';
import { mergeSessionWithRecord, persistSessionProfile, toSessionUser } from '../utils/userAuth';
import { consumeLeadNotice } from '../utils/leadNotice';

const Profile = ({ onLogin, onRegister, onLogout, currentUser }) => {
  const readUser = () => {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return currentUser || null;
    return mergeSessionWithRecord(toSessionUser(JSON.parse(saved)));
  };

  const [user, setUser] = useState(readUser);
  const [leadNotice] = useState(() => consumeLeadNotice());

  useEffect(() => {
    const syncUser = () => {
      setUser(readUser());
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('userUpdated', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('userUpdated', syncUser);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readUser стабильна по смыслу
  }, []);

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
                      Итого: <span className="order-total">{order.total?.toLocaleString('ru-RU')} ₽</span>
                    </div>
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