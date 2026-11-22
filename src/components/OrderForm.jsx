import { useState, useEffect, useRef } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatRussianPhone } from '../utils/phone';
import PersonalDataConsentCheckbox from './PersonalDataConsentCheckbox';
import { formatUsd } from '../utils/currency';
import { setLeadNotice } from '../utils/leadNotice';
import { loadYandexMaps } from '../utils/loadYandexMaps';
import { resolveDeliveryAddress } from '../utils/yandexReverseGeocode';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const OrderForm = ({ onOrderSubmit, onCancel }) => {
  const { cart, total, clearCart, updateCartItem } = useCart();
  const { delivery } = useSiteSettings();
  
  const [sessionUser, setSessionUser] = useState(null);
  const getUserData = () => {
    const savedUser = sessionUser || {};
    return {
      lastName: savedUser.lastName || '',
      firstName: savedUser.firstName || '',
      patronymic: savedUser.patronymic || '',
      phone: savedUser.phone || '',
      email: savedUser.email || '',
      address: savedUser.address || '',
    };
  };
  
  const [formData, setFormData] = useState({
    lastName: '', firstName: '', patronymic: '', phone: '', email: '', address: '',
    deliveryDate: '', deliveryTime: '', comments: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdConsent, setPdConsent] = useState(false);
  const [pdConsentError, setPdConsentError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [mapNotice, setMapNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [priceUpdated, setPriceUpdated] = useState(false);
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [idempotencyKey, setIdempotencyKey] = useState(() => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const deliveryIntervals = Array.isArray(deliveryQuote?.intervals) && deliveryQuote.intervals.length
    ? deliveryQuote.intervals
    : Array.isArray(delivery.intervals) ? delivery.intervals : [];
  const mapRef = useRef(null);
  const ymapsRef = useRef(null);
  const placemarkRef = useRef(null);

  // Автоматическое обновление данных при изменении пользователя
  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (!mounted || !data.authenticated || !data.user) return;
        const userData = data.user;
        setSessionUser(userData);
      setFormData(prev => ({
        ...prev,
        lastName: prev.lastName || userData.lastName,
        firstName: prev.firstName || userData.firstName,
        patronymic: prev.patronymic || userData.patronymic,
        phone: prev.phone || userData.phone,
        email: prev.email || userData.email,
        address: prev.address || userData.address,
      }));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Функция для заполнения всех полей из профиля
  const fillFromProfile = () => {
    const userData = getUserData();
    setFormData(prev => ({
      ...prev,
      lastName: userData.lastName,
      firstName: userData.firstName,
      patronymic: userData.patronymic,
      phone: userData.phone,
      email: userData.email,
      address: userData.address,
    }));
    
    // Обновляем карту, если адрес есть
    if (userData.address && ymapsRef.current && mapRef.current?.instance) {
      const ymaps = ymapsRef.current;
      ymaps.geocode(userData.address, { results: 1 }).then((res) => {
        const geoObject = res.geoObjects.get(0);
        if (geoObject) {
          const coords = geoObject.geometry.getCoordinates();
          const map = mapRef.current.instance;
          const placemark = placemarkRef.current;
          if (map && placemark) {
            map.setCenter(coords, 15);
            placemark.geometry.setCoordinates(coords);
            setCoordinates({ latitude: Number(coords[0]), longitude: Number(coords[1]) });
          }
        }
      }).catch(err => {
        console.error('Ошибка геокодирования адреса:', err);
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled) return;
        ymapsRef.current = ymaps;
        initMap();
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Яндекс.Карты не загрузились:', err);
        setMapNotice('Карта недоступна. Введите адрес вручную.');
      });
    return () => {
      cancelled = true;
    };
    // initMap создаёт карту один раз при монтировании формы
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initMap = () => {
    if (!ymapsRef.current || mapRef.current?.instance) return;

    const ymaps = ymapsRef.current;
    
    // Проверяем, есть ли уже адрес с координатами в форме
    const currentAddress = formData.address;
    let initialCenter = [55.7512, 37.6184]; // Москва по умолчанию
    let initialZoom = 10;
    
    // Если в адресе есть координаты, используем их
    if (currentAddress && currentAddress.startsWith('Координаты:')) {
      const coordsMatch = currentAddress.match(/Координаты:\s*([\d.]+),\s*([\d.]+)/);
      if (coordsMatch) {
        initialCenter = [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])];
        initialZoom = 15;
      }
    }
    
    const myMap = new ymaps.Map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      controls: ['zoomControl']
    });

    const myPlacemark = new ymaps.Placemark(initialCenter, {}, {
      draggable: true,
      preset: 'islands#redDotIcon'
    });

    myMap.geoObjects.add(myPlacemark);
    placemarkRef.current = myPlacemark;

    const applyCoordsToDelivery = async (coords, zoom = 17) => {
      myPlacemark.geometry.setCoordinates(coords);
      myMap.setCenter(coords, zoom, { duration: 200 });
      setCoordinates({ latitude: Number(coords[0]), longitude: Number(coords[1]) });
      try {
        const address = await resolveDeliveryAddress(ymaps, coords);
        if (address) {
          setFormData((prev) => ({ ...prev, address }));
          setMapNotice('');
        } else {
          setMapNotice(
            'Не удалось определить адрес. Проверьте REACT_APP_YANDEX_MAPS_API_KEY в .env и перезапустите npm run server и npm start, либо введите адрес вручную.'
          );
        }
      } catch (err) {
        console.error('Ошибка геокодирования:', err);
        setMapNotice('Не удалось определить адрес. Попробуйте ещё раз или введите вручную.');
      }
    };

    // Если адрес был с координатами, пытаемся получить полный адрес
    if (currentAddress && currentAddress.startsWith('Координаты:')) {
      const coordsMatch = currentAddress.match(/Координаты:\s*([\d.]+),\s*([\d.]+)/);
      if (coordsMatch) {
        const coords = [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])];
        applyCoordsToDelivery(coords);
      }
    }

    myMap.events.add('click', (e) => {
      const coords = e.get('coords');
      applyCoordsToDelivery(coords);
    });

    myPlacemark.events.add('dragend', () => {
      const coords = myPlacemark.geometry.getCoordinates();
      applyCoordsToDelivery(coords);
    });

    mapRef.current.instance = myMap;
  };

  // Функция для определения местоположения
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMapNotice('Геолокация не поддерживается вашим браузером.');
      return;
    }
    setMapNotice('');

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        // Обновляем карту, если она уже инициализирована
        if (ymapsRef.current && mapRef.current?.instance) {
          const ymaps = ymapsRef.current;
          const map = mapRef.current.instance;
          const placemark = placemarkRef.current;

          try {
            map.setCenter(coords, 17);
            if (placemark) placemark.geometry.setCoordinates(coords);
            setCoordinates({ latitude, longitude });
            const address = await resolveDeliveryAddress(ymaps, coords);
            if (address) {
              setFormData((prev) => ({ ...prev, address }));
              setMapNotice('');
            } else {
              setMapNotice('Точка отмечена. Уточните адрес вручную или кликните по дому на карте.');
            }
          } catch (err) {
            console.error('Ошибка геокодирования:', err);
            map.setCenter(coords, 17);
            if (placemark) placemark.geometry.setCoordinates(coords);
            setCoordinates({ latitude, longitude });
            setMapNotice('Точка отмечена на карте. Введите адрес вручную, если он не подставился.');
          }
        } else {
          // Если карта еще не загружена, сохраняем координаты и адрес
          // Адрес будет определен позже, когда карта загрузится
          setFormData(prev => ({ 
            ...prev, 
            address: `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
          }));
          setCoordinates({ latitude, longitude });
          
          // Пытаемся получить адрес через геокодирование, если Яндекс.Карты еще не загружены
          if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(async () => {
              try {
                const ymaps = window.ymaps;
                const address = await resolveDeliveryAddress(ymaps, coords);
                if (address) setFormData((prev) => ({ ...prev, address }));
              } catch (err) {
                console.error('Ошибка геокодирования:', err);
              }
            });
          }
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = 'Не удалось определить местоположение';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Информация о местоположении недоступна.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Превышено время ожидания запроса геолокации.';
            break;
          default:
            break;
        }

        setMapNotice(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const geocodeAddressField = async () => {
    const address = formData.address.trim();
    if (!address || !ymapsRef.current || !mapRef.current?.instance) {
      setMapNotice('Введите адрес или выберите точку на карте.');
      return;
    }
    try {
      const ymaps = ymapsRef.current;
      const res = await ymaps.geocode(address, { results: 1, kind: 'house' });
      let geoObject = res.geoObjects.get(0);
      if (!geoObject) {
        const fallback = await ymaps.geocode(address, { results: 1 });
        geoObject = fallback.geoObjects.get(0);
      }
      if (geoObject) {
        const coords = geoObject.geometry.getCoordinates();
        const canonicalAddress = geoObject.getAddressLine() || address;
        const map = mapRef.current.instance;
        const placemark = placemarkRef.current;
        map.setCenter(coords, 17);
        placemark.geometry.setCoordinates(coords);
        setFormData((prev) => ({ ...prev, address: canonicalAddress }));
        setCoordinates({ latitude: Number(coords[0]), longitude: Number(coords[1]) });
        setMapNotice('');
      } else {
        setMapNotice('Адрес не найден. Уточните или отметьте точку на карте.');
      }
    } catch (err) {
      console.error('Ошибка поиска адреса:', err);
      setMapNotice('Не удалось найти адрес. Проверьте написание.');
    }
  };

  // Геокодирование по нажатию Enter
  const handleAddressKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      geocodeAddressField();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? formatRussianPhone(value) : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    if (name === 'address') setCoordinates({ latitude: null, longitude: null });
  };

  useEffect(() => {
    if (!pdConsent || !formData.address.trim() || !cart.length) { setDeliveryQuote(null); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDeliveryQuoteLoading(true);
      try {
        const response = await fetch('/api/delivery/quote', {
          method: 'POST', credentials: 'include', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: formData.address, ...coordinates, items: cart.map(({ id, quantity }) => ({ id, quantity })), consent: true }),
        });
        const data = await response.json().catch(() => ({}));
        setDeliveryQuote(response.ok ? data.quote : { error: data.error || 'Стоимость доставки подтвердит менеджер' });
      } catch (error) { if (error.name !== 'AbortError') setDeliveryQuote({ error: 'Стоимость доставки подтвердит менеджер' }); }
      finally { setDeliveryQuoteLoading(false); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [pdConsent, formData.address, coordinates, cart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone.trim() && !formData.email.trim()) {
      setSubmitError('Укажите телефон или email, чтобы менеджер мог связаться с вами.');
      return;
    }
    if (!pdConsent) {
      setPdConsentError('Необходимо дать согласие на обработку персональных данных');
      return;
    }
    setPdConsentError('');
    setSubmitError('');
    setIsSubmitting(true);

    const contactName = [formData.lastName, formData.firstName, formData.patronymic].filter(Boolean).join(' ');
    const order = {
      id: Date.now(),
      idempotencyKey,
      items: cart,
      total,
      currency: 'USD',
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

    const itemsSummary = cart
      .map((item) => `${item.name || item.title || 'Товар'} × ${item.quantity || 1}`)
      .join('; ');

    let savedOrder = order;
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, items: cart, itemsSummary, consent: true, deliveryLatitude: coordinates.latitude, deliveryLongitude: coordinates.longitude }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === 'PRICE_CHANGED' && Array.isArray(data.items)) {
          data.items.forEach((item) => updateCartItem(item.id, { price: item.price, stock: item.stock, title: item.title }));
          setPriceUpdated(true);
        }
        if (data.code === 'ITEM_UNAVAILABLE' && Array.isArray(data.unavailable)) {
          data.unavailable.forEach((item) => updateCartItem(item.id, { stock: item.available, isAvailable: item.available > 0 }));
        }
        throw new Error(data.error || 'Не удалось сохранить заказ');
      }
      savedOrder = data.order || order;
    } catch (error) {
      setSubmitError(error.message || 'Не удалось оформить заказ. Попробуйте ещё раз.');
      setIsSubmitting(false);
      return;
    }

    setLeadNotice(`Заказ №${savedOrder.orderNumber || String(savedOrder.id).slice(0, 8)} сохранён. Менеджер свяжется с вами.`);

    clearCart();
    setIdempotencyKey(window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    setIsSubmitting(false);
    onOrderSubmit?.(savedOrder);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 className="order-form__section-title">Контактные данные</h4>
              <button 
                type="button" 
                onClick={fillFromProfile}
                className="btn-outline"
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                title="Заполнить все поля из профиля"
              >
                📋 Заполнить из профиля
              </button>
            </div>
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
                  autoComplete="family-name"
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
                  autoComplete="given-name"
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
                  autoComplete="additional-name"
                />
              </div>
              <div className="form-field">
                <label htmlFor="phone">Телефон</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+7 900-000-00-00"
                  autoComplete="tel"
                />
              </div>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@mail.ru"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div className="order-form__section">
            <h4 className="order-form__section-title">Адрес доставки</h4>
            <div className="form-field">
              <div className="order-form__address-toolbar">
                <label htmlFor="address">Адрес доставки *</label>
                <div className="order-form__address-actions">
                  <button
                    type="button"
                    onClick={geocodeAddressField}
                    className="btn-outline order-form__address-btn"
                    title="Найти введённый адрес на карте"
                  >
                    Найти на карте
                  </button>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="btn-outline order-form__address-btn"
                    title="Определить адрес по геолокации"
                  >
                    {isLocating ? 'Определение…' : 'Моё местоположение'}
                  </button>
                </div>
              </div>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onKeyDown={handleAddressKeyDown}
                required
                placeholder="Город, улица, дом — Enter или «Найти на карте»; можно кликнуть по карте"
                autoComplete="street-address"
              />
              {mapNotice && (
                <p className="order-form__map-notice" role="status">
                  {mapNotice}
                </p>
              )}
            </div>
            <div className="order-form__map-container">
              <label className="order-form__map-label">
                Кликните по дому на карте или перетащите метку — адрес доставки заполнится автоматически
              </label>
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
                <label htmlFor="deliveryDate">Дата доставки</label>
                <input
                  type="date"
                  id="deliveryDate"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  min={minDate}
                  max={maxDate}
                />
              </div>
              <div className="form-field">
                <label htmlFor="deliveryTime">{deliveryIntervals.length ? 'Интервал доставки' : 'Время доставки'}</label>
                {deliveryIntervals.length ? (
                  <select id="deliveryTime" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} required>
                    <option value="">Выберите интервал</option>
                    {deliveryIntervals.map((interval) => <option key={interval} value={interval}>{interval}</option>)}
                  </select>
                ) : (
                  <input
                    type="time"
                    id="deliveryTime"
                    name="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={handleChange}
                  />
                )}
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
            <div className="order-summary__line"><span>Товары:</span><span>{formatUsd(deliveryQuote?.subtotal ?? total)}</span></div>
            {deliveryQuoteLoading && <p role="status">Рассчитываем доставку…</p>}
            {deliveryQuote?.shippingFee > 0 && <div className="order-summary__line"><span>Доставка:</span><span>{formatUsd(deliveryQuote.shippingFee)}</span></div>}
            {deliveryQuote?.error && <p role="status">{deliveryQuote.error}</p>}
            {deliveryQuote?.deliveryQuoteRequired && <p>Стоимость доставки подтвердит менеджер.</p>}
            <div className="order-summary__line order-summary__total"><span>Итого:</span><span className="order-total-amount">{formatUsd(deliveryQuote?.total ?? total)}</span></div>
            {priceUpdated && <p role="alert">Цена обновлена по каталогу. Проверьте итог и подтвердите заказ повторно.</p>}
            <p>Стоимость и срок доставки менеджер подтвердит отдельно.</p>
          </div>
        </div>
        <PersonalDataConsentCheckbox
          id="order-pd-consent"
          checked={pdConsent}
          onChange={(value) => {
            setPdConsent(value);
            if (value) setPdConsentError('');
          }}
          error={pdConsentError}
        />

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
              priceUpdated ? 'Подтвердить новые цены и оформить' : 'Оформить заказ'
            )}
          </button>
        </div>
        {submitError && <p className="contact-widget__error" role="alert">{submitError}</p>}
      </form>
    </div>
  );
};

export default OrderForm;
