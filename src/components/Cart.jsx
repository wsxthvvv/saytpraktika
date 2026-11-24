import React, { lazy, Suspense, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { formatUsd } from '../utils/currency';

const OrderForm = lazy(() => import('./OrderForm'));

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const navigate = useNavigate();
  const hasUnavailableItems = cart.some((item) => !item.isAvailable || Number(item.stock) < Number(item.quantity || 1));

  const openOrderForm = async () => {
    setCheckingAccount(true);
    setCheckoutMessage('');
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось проверить вход в аккаунт');
      if (!data.authenticated) {
        setCheckoutMessage('Для оформления заказа войдите в аккаунт. Корзина сохранится.');
        return;
      }
      if (data.user?.role !== 'customer') {
        setCheckoutMessage(
          data.user?.role === 'admin'
            ? 'Оформление заказа доступно покупателю. Выйдите из админ-аккаунта и войдите как клиент или зарегистрируйтесь.'
            : 'Оформлять заказы могут только аккаунты покупателей.',
        );
        return;
      }
      setShowOrderForm(true);
    } catch (error) {
      setCheckoutMessage(error.message || 'Не удалось проверить вход в аккаунт. Попробуйте ещё раз.');
    } finally {
      setCheckingAccount(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="cart-page cart-success" role="status">
        <h1 className="section-title">Заказ оформлен</h1>
        <p>Номер заказа: <strong>#{placedOrder.orderNumber || String(placedOrder.id).slice(0, 8)}</strong></p>
        <p>Заказ сохранён. Стоимость и срок доставки подтвердит менеджер.</p>
        <Link to="/profile" className="btn">Открыть личный кабинет</Link>
        <Link to="/products" className="btn-outline">Вернуться в каталог</Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty__icon">🛒</div>
          <h2 className="section-title">Корзина пуста</h2>
          <p className="cart-empty__text">
            Добавьте оборудование или компьютер в разделе «Товары». Услуги оформляются на странице «Услуги».
          </p>
          <Link to="/products?category=miner" className="btn">
            Майнеры в товарах
          </Link>
          <Link to="/products" className="btn-outline" style={{ marginTop: '0.75rem' }}>
            Товары
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
              {hasUnavailableItems && (!item.isAvailable || Number(item.stock) < Number(item.quantity || 1)) && <p className="contact-widget__error" role="alert">Товара нет в нужном количестве. Удалите позицию или проверьте остаток.</p>}
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
                  disabled={!item.isAvailable || Number(item.stock) < Number(item.quantity || 1)}
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
                  disabled={!item.isAvailable || Number(item.stock) < Number(item.quantity || 1) || Number(item.quantity || 1) >= Number(item.stock)}
                  aria-label="Увеличить количество"
                >
                  +
                </button>
              </div>
              <div className="cart-item-card__price">
                {formatUsd(item.price * (item.quantity || 1))}
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
          <span className="cart-total-amount">{formatUsd(total)}</span>
        </div>
        <button
          className="btn btn--large cart-checkout"
          onClick={openOrderForm}
          disabled={hasUnavailableItems || checkingAccount}
        >
          {checkingAccount ? 'Проверяем аккаунт…' : 'Оформить заказ'}
        </button>
        {checkoutMessage && (
          <p className="contact-widget__error" role="status">
            {checkoutMessage.includes('войдите в аккаунт') ? <>{checkoutMessage} <Link to="/profile">Войти</Link></> : checkoutMessage}
          </p>
        )}
        <Link to="/products" className="btn-outline">
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
                  setPlacedOrder(_order);
                  if (updatedUser) navigate('/profile');
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
