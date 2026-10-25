import { createContext, useContext, useState, useEffect } from 'react';
import { rubToUsd } from '../utils/currency';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((item) => {
      if (String(item.id).startsWith('product-') && item.currency !== 'USD') {
        return { ...item, price: rubToUsd(item.price), currency: 'USD' };
      }
      return item;
    });
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i
        );
      }
      return [...prev, { ...item, currency: item.currency || 'USD', quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

