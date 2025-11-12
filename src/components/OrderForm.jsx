import { useState, useEffect, useRef } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatRussianPhone } from '../utils/phone';

const OrderForm = ({ onOrderSubmit, onCancel }) => {
  const { cart, total, clearCart } = useCart();
  const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  const [formData, setFormData] = useState({
    lastName: savedUser.lastName || '',
    firstName: savedUser.firstName || '',
    patronymic: savedUser.patronymic || '',
    phone: savedUser.phone || '',
    email: savedUser.email || '',
    address: savedUser.address || '',
    deliveryDate: '',
    deliveryTime: '',
    comments: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const mapRef = useRef(null);
  const ymapsRef = useRef(null);

  // Подключаем Яндекс.Карты
  useEffect(() => {
    if (window.ymaps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=17e85236-38e0-4f4a-9a44-6f26c8d2684e&lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        window.ymaps.ready(() => {
          ymapsRef.current = window.ymaps;
          initMap();
        });
      };
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  const initMap = () => {
    if (!ymapsRef.current || mapRef.current) return;

    const ymaps = ymapsRef.current;
    const myMap = new ymaps.Map(mapRef.current, {
      center: [55.7512, 37.6184], // Москва
      zoom: 10,
      controls: []
    });

    const myPlacemark = new ymaps.Placemark(myMap.getCenter(), {}, {
      draggable: true,
      iconLayout: 'default#image',
      iconImageHref: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"%3E%3Ccircle cx="12" cy="10" r="8" fill="%23e10600"/%3E%3C/svg%3E',
      iconImageSize: [24, 24],
      iconImageOffset: [-12, -24]
    });

    myMap.geoObjects.add(myPlacemark);

    const updateAddress = async (coords) => {
      try {
        const res = await ymaps.geocode(coords);
        const address = res.geoObjects.get(0)?.getAddressLine() || `Координаты: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
        setFormData(prev => ({ ...prev, address }));
        myPlacemark.geometry.setCoordinates(coords);
      } catch (err) {
        console.error('Ошибка геокодирования:', err);
      }
    };

    myMap.events.add('click', (e) => {
      const coords = e.get('coords');
      updateAddress(coords);
    });

    myPlacemark.events.add('dragend', () => {
      const coords = myPlacemark.geometry.getCoordinates();
      updateAddress(coords);
    });

    mapRef.current.instance = myMap;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? formatRussianPhone(value) : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const contactName = [formData.lastName, formData.firstName, formData.patronymic].filter(Boolean).join(' ');
      const order = {
        id: Date.now(),
        items: cart,
        total,
        contactName,
        email: formData.email,
        phone: formatRussianPhone(formData.phone),
        address: formData.address,
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        comments: formData.comments,
        status: 'Ожидание',
        createdAt: new Date().toISOString(),
      };

      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (user.email) {
        user.orders = user.orders || [];
        user.orders.push(order);
        Object.assign(user, {
          lastName: formData.lastName,
          firstName: formData.firstName,
          patronymic: formData.patronymic,
          fullName: contactName,
          phone: formatRussianPhone(formData.phone),
          address: formData.address,
          email: formData.email
        });
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.dispatchEvent(new Event('userUpdated'));
      }

      clearCart();
      setIsSubmitting(false);
      onOrderSubmit?.(order);
    }, 800);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="order-form">
      <div className="order-form__header">
        <h3 className="order-form__title">Оформление заказа</h3>
        <button onClick={onCancel} className="order-form__close" aria-label="Закрыть">
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit} className="order-form__body">
        <div className="order-form__grid">
          <div className="order-form__section">
            <h4 className="order-form__section-title">Контактные данные</h4>
            <div className="order-form__fields">
              <div className="form-field">
                <label htmlFor="lastName">Фамилия *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Иванов"
                />
              </div>
              <div className="form-field">
                <label htmlFor="firstName">Имя *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Иван"
                />
              </div>
              <div className="form-field">
                <label htmlFor="patronymic">Отчество</label>
                <input
                  type="text"
                  id="patronymic"
                  name="patronymic"
                  value={formData.patronymic}
                  onChange={handleChange}
                  placeholder="Иванович"
                />
              </div>
              <div className="form-field">
                <label htmlFor="phone">Телефон *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+7 900-000-00-00"
                />
              </div>
              <div className="form-field">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="example@mail.ru"
                />
              </div>
            </div>
          </div>

          <div className="order-form__section">
            <h4 className="order-form__section-title">Адрес доставки</h4>
            <div className="form-field">
              <label htmlFor="address">Адрес *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="г. Москва, ул. Тверская, д. 1"
              />
            </div>
            <div className="order-form__map-container">
              <label className="order-form__map-label">Выберите адрес на карте Москвы</label>
              <div
                ref={mapRef}
                className="order-form__map"
                style={{ width: '100%', height: '400px', borderRadius: '12px', border: '2px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="order-form__section">
            <h4 className="order-form__section-title">Дата и время доставки</h4>
            <div className="order-form__fields">
              <div className="form-field">
                <label htmlFor="deliveryDate">Дата доставки *</label>
                <input
                  type="date"
                  id="deliveryDate"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  required
                  min={minDate}
                  max={maxDate}
                />
              </div>
              <div className="form-field">
                <label htmlFor="deliveryTime">Время доставки *</label>
                <input
                  type="time"
                  id="deliveryTime"
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="order-form__section">
            <h4 className="order-form__section-title">Дополнительно</h4>
            <div className="form-field">
              <label htmlFor="comments">Комментарий к заказу</label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows="3"
                placeholder="Особые пожелания, инструкции для курьера"
              />
            </div>
          </div>
        </div>

        <div className="order-form__summary">
          <div className="order-summary">
            <div className="order-summary__line">
              <span>Товаров:</span>
              <span>{cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} шт.</span>
            </div>
            <div className="order-summary__line order-summary__total">
              <span>Итого:</span>
              <span className="order-total-amount">${total.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>

        <div className="order-form__actions">
          <button type="button" onClick={onCancel} className="btn-outline">
            Отмена
          </button>
          <button type="submit" className="btn btn--large" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="btn-spinner"></span>
                Оформление...
              </>
            ) : (
              'Оформить заказ'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;