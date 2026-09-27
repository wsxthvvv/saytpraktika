import React, { lazy, Suspense, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';

const OrderForm = lazy(() => import('./OrderForm'));

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty__icon">🛒</div>
          <h2 className="section-title">Корзина пуста</h2>
          <p className="cart-empty__text">Добавьте услуги из каталога, чтобы продолжить</p>
          <Link to="/services" className="btn">
            Перейти к услугам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h2 className="section-title">Корзина</h2>
        <button onClick={clearCart} className="btn-text">
          Очистить корзину
        </button>
      </div>
      <div className="cart-items">
        {cart.map((item) => (
          <div key={item.id} className="cart-item-card">
            <div className="cart-item-card__info">
              <h3 className="cart-item-card__title">{item.title}</h3>
              <p className="cart-item-card__description">{item.description}</p>
              {item.deliverables && (
                <ul className="cart-item-card__deliverables">
                  {item.deliverables.slice(0, 2).map((del, idx) => (
                    <li key={idx}>{del}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="cart-item-card__controls">
              <div className="quantity-control">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newQuantity = Math.max(1, (item.quantity || 1) - 1);
                    updateQuantity(item.id, newQuantity);
                  }}
                  className="quantity-btn"
                  aria-label="Уменьшить количество"
                >
                  −
                </button>
                <span className="quantity-value">{item.quantity || 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(item.id, (item.quantity || 1) + 1);
                  }}
                  className="quantity-btn"
                  aria-label="Увеличить количество"
                >
                  +
                </button>
              </div>
              <div className="cart-item-card__price">
                {/* ✅ ИСПРАВЛЕНО: цена без дробной части */}
                ${Math.round(item.price * (item.quantity || 1)).toLocaleString('en-US')}
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="btn-remove"
                aria-label="Удалить из корзины"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <div className="cart-summary__line">
          <span>Товаров:</span>
          <span>{cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} шт.</span>
        </div>
        <div className="cart-summary__line cart-summary__total">
          <span>Итого:</span>
          {/* ✅ ИСПРАВЛЕНО: итоговая сумма без дробной части */}
          <span className="cart-total-amount">${Math.round(total).toLocaleString('en-US')}</span>
        </div>
        <button
          className="btn btn--large cart-checkout"
          onClick={() => setShowOrderForm(true)}
        >
          Оформить заказ
        </button>
        <Link to="/services" className="btn-outline">
          Продолжить покупки
        </Link>
      </div>
      {showOrderForm && (
        <div className="order-form-overlay" onClick={() => setShowOrderForm(false)}>
          <div className="order-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <Suspense fallback={<p className="order-form__loading">Загружаем форму заказа…</p>}>
              <OrderForm
                onOrderSubmit={(_order, updatedUser) => {
                  setShowOrderForm(false);
                  if (updatedUser) {
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                  }
                  navigate('/profile');
                }}
                onCancel={() => setShowOrderForm(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;