import { useState, useEffect, useRef } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatRussianPhone } from '../utils/phone';

const OrderForm = ({ onOrderSubmit, onCancel }) => {
  const { cart, total, clearCart } = useCart();
  
  // Функция для получения данных пользователя
  const getUserData = () => {
    const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    // Получаем адрес из последнего заказа, если есть
    const lastOrder = savedUser.orders && savedUser.orders.length > 0 
      ? savedUser.orders[savedUser.orders.length - 1] 
      : null;
    
    return {
      lastName: savedUser.lastName || '',
      firstName: savedUser.firstName || '',
      patronymic: savedUser.patronymic || '',
      phone: savedUser.phone || '',
      email: savedUser.email || '',
      address: savedUser.address || (lastOrder?.address || ''),
    };
  };
  
  const [formData, setFormData] = useState(() => {
    const userData = getUserData();
    return {
      ...userData,
      deliveryDate: '',
      deliveryTime: '',
      comments: '',
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef(null);
  const ymapsRef = useRef(null);
  const placemarkRef = useRef(null);

  // Автоматическое обновление данных при изменении пользователя
  useEffect(() => {
    const syncUserData = () => {
      const userData = getUserData();
      // Обновляем только если поля пустые или если пользователь изменился
      setFormData(prev => ({
        ...prev,
        lastName: prev.lastName || userData.lastName,
        firstName: prev.firstName || userData.firstName,
        patronymic: prev.patronymic || userData.patronymic,
        phone: prev.phone || userData.phone,
        email: prev.email || userData.email,
        address: prev.address || userData.address,
      }));
    };

    syncUserData();
    window.addEventListener('storage', syncUserData);
    window.addEventListener('userUpdated', syncUserData);
    
    return () => {
      window.removeEventListener('storage', syncUserData);
      window.removeEventListener('userUpdated', syncUserData);
    };
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
          }
        }
      }).catch(err => {
        console.error('Ошибка геокодирования адреса:', err);
      });
    }
  };

  // Подключаем Яндекс.Карты
  useEffect(() => {
    if (window.ymaps && window.ymaps.ready) {
      window.ymaps.ready(() => {
        ymapsRef.current = window.ymaps;
        initMap();
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
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

    const updateAddressFromCoords = async (coords) => {
      try {
        const res = await ymaps.geocode(coords, { results: 1 });
        const address = res.geoObjects?.get(0)?.getAddressLine() || `Координаты: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
        setFormData(prev => ({ ...prev, address }));
        myPlacemark.geometry.setCoordinates(coords);
      } catch (err) {
        console.error('Ошибка геокодирования:', err);
      }
    };

    // Если адрес был с координатами, пытаемся получить полный адрес
    if (currentAddress && currentAddress.startsWith('Координаты:')) {
      const coordsMatch = currentAddress.match(/Координаты:\s*([\d.]+),\s*([\d.]+)/);
      if (coordsMatch) {
        const coords = [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])];
        updateAddressFromCoords(coords);
      }
    }

    myMap.events.add('click', (e) => {
      const coords = e.get('coords');
      updateAddressFromCoords(coords);
    });

    myPlacemark.events.add('dragend', () => {
      const coords = myPlacemark.geometry.getCoordinates();
      updateAddressFromCoords(coords);
    });

    mapRef.current.instance = myMap;
  };

  // Функция для определения местоположения
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

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
            // Геокодируем координаты в адрес
            const res = await ymaps.geocode(coords, { results: 1 });
            const geoObject = res.geoObjects.get(0);
            
            if (geoObject) {
              const address = geoObject.getAddressLine();
              setFormData(prev => ({ ...prev, address }));
              
              // Обновляем карту
              map.setCenter(coords, 15);
              if (placemark) {
                placemark.geometry.setCoordinates(coords);
              }
            } else {
              // Если адрес не найден, используем координаты
              setFormData(prev => ({ 
                ...prev, 
                address: `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
              }));
              map.setCenter(coords, 15);
              if (placemark) {
                placemark.geometry.setCoordinates(coords);
              }
            }
          } catch (err) {
            console.error('Ошибка геокодирования:', err);
            // В случае ошибки все равно показываем координаты на карте
            setFormData(prev => ({ 
              ...prev, 
              address: `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
            }));
            map.setCenter(coords, 15);
            if (placemark) {
              placemark.geometry.setCoordinates(coords);
            }
            alert('Не удалось определить адрес по координатам, но местоположение отмечено на карте');
          }
        } else {
          // Если карта еще не загружена, сохраняем координаты и адрес
          // Адрес будет определен позже, когда карта загрузится
          setFormData(prev => ({ 
            ...prev, 
            address: `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
          }));
          
          // Пытаемся получить адрес через геокодирование, если Яндекс.Карты еще не загружены
          if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(async () => {
              try {
                const ymaps = window.ymaps;
                const res = await ymaps.geocode(coords, { results: 1 });
                const geoObject = res.geoObjects.get(0);
                if (geoObject) {
                  const address = geoObject.getAddressLine();
                  setFormData(prev => ({ ...prev, address }));
                }
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
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Геокодирование по нажатию Enter
  const handleAddressKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // предотвращает отправку формы
      const address = formData.address.trim();
      if (!address || !ymapsRef.current || !mapRef.current?.instance) return;

      try {
        const ymaps = ymapsRef.current;
        const res = await ymaps.geocode(address, { results: 1 });
        const geoObject = res.geoObjects.get(0);
        if (geoObject) {
          const coords = geoObject.geometry.getCoordinates();
          const canonicalAddress = geoObject.getAddressLine();

          const map = mapRef.current.instance;
          const placemark = placemarkRef.current;

          map.setCenter(coords, 15);
          placemark.geometry.setCoordinates(coords);
          setFormData(prev => ({ ...prev, address: canonicalAddress }));
        } else {
          alert('Адрес не найден. Попробуйте уточнить.');
        }
      } catch (err) {
        console.error('Ошибка поиска адреса:', err);
        alert('Не удалось найти адрес. Проверьте написание.');
      }
    }
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
                <label htmlFor="phone">Телефон *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+7 900-000-00-00"
                  autoComplete="tel"
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
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div className="order-form__section">
            <h4 className="order-form__section-title">Адрес доставки</h4>
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="address">Адрес *</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="btn-outline"
                  style={{ 
                    fontSize: '0.875rem', 
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  title="Определить адрес по текущему местоположению"
                >
                  {isLocating ? (
                    <>
                      <span className="btn-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                      Определение...
                    </>
                  ) : (
                    <>
                      📍 Определить местоположение
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onKeyDown={handleAddressKeyDown}
                required
                placeholder="Введите адрес и нажмите Enter или используйте кнопку определения местоположения"
                autoComplete="street-address"
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
