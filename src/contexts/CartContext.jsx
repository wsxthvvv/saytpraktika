import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isCartEligibleItem } from '../utils/cartItem';
import { readStoredUser } from '../utils/sessionUser';

const itemId = (id) => String(id);

const CartContext = createContext(null);
const GUEST_CART_KEY = '01service_guest_cart_v2';
const LEGACY_CART_KEY = 'cart';
const parseStoredCart = (key) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved.filter((item) => isCartEligibleItem(item)
      && item.currency === 'USD' && Number.isFinite(Number(item.price)) && Number(item.price) > 0) : [];
  } catch { return []; }
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => parseStoredCart(GUEST_CART_KEY));
  const [user, setUser] = useState(readStoredUser);
  const syncTimer = useRef(null);
  const initializedForUser = useRef(null);
  const hasSeenSession = useRef(false);
  const syncingUserId = useRef(null);
  const latestUser = useRef(user);

  const fetchAccountCart = useCallback(async () => {
    const response = await fetch('/api/cart', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось загрузить корзину');
    return data.items || [];
  }, []);

  const pushAccountCart = useCallback(async (items) => {
    const response = await fetch('/api/cart', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(({ id, quantity }) => ({ id, quantity })) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось сохранить корзину');
    return data;
  }, []);

  useEffect(() => {
    const onUserUpdated = async (event) => {
      const nextUser = event.detail === undefined ? readStoredUser() : event.detail;
      latestUser.current = nextUser || null;
      setUser(nextUser || null);
      const initialSessionCheck = !hasSeenSession.current;
      hasSeenSession.current = true;
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      if (!nextUser || nextUser.role !== 'customer') {
        initializedForUser.current = null;
        if (nextUser) { try { localStorage.removeItem(LEGACY_CART_KEY); } catch { /* ignore */ } }
        if (initialSessionCheck && !nextUser) {
          const guest = parseStoredCart(GUEST_CART_KEY);
          const legacy = parseStoredCart(LEGACY_CART_KEY);
          const merged = new Map(guest.map((item) => [String(item.id), item]));
          legacy.forEach((item) => {
            const existing = merged.get(String(item.id));
            merged.set(String(item.id), existing
              ? { ...existing, quantity: Math.min(Number(existing.stock || 100), Number(existing.quantity || 1) + Number(item.quantity || 1)) }
              : item);
          });
          setCart([...merged.values()]);
          try { localStorage.removeItem(LEGACY_CART_KEY); } catch { /* ignore */ }
        } else setCart(parseStoredCart(GUEST_CART_KEY));
        return;
      }
      const userId = String(nextUser.id);
      if (syncingUserId.current === userId) return;
      syncingUserId.current = userId;
      const local = parseStoredCart(GUEST_CART_KEY);
      setCart([]);
      try {
        let response;
        if (initializedForUser.current !== userId) {
          const savedItems = await fetchAccountCart();
          const merged = new Map(savedItems.map((item) => [String(item.id), item]));
          local.forEach((item) => {
            const key = String(item.id);
            const existing = merged.get(key);
            merged.set(key, existing
              ? { ...existing, quantity: Math.min(Number(existing.stock || 100), Number(existing.quantity || 1) + Number(item.quantity || 1)) }
              : item);
          });
          if (String(latestUser.current?.id || '') !== userId) return;
          response = await pushAccountCart([...merged.values()]);
          initializedForUser.current = userId;
        } else response = { items: await fetchAccountCart() };
        if (String(latestUser.current?.id || '') !== userId) return;
        const accountItems = response.items || [];
        setCart(accountItems);
        localStorage.removeItem(GUEST_CART_KEY);
        localStorage.removeItem(LEGACY_CART_KEY);
      } catch {
        if (String(latestUser.current?.id || '') === userId) setCart(local);
      } finally {
        if (syncingUserId.current === userId) syncingUserId.current = null;
      }
    };
    window.addEventListener('userUpdated', onUserUpdated);
    if (user) onUserUpdated({ detail: user });
    return () => window.removeEventListener('userUpdated', onUserUpdated);
  }, [fetchAccountCart, pushAccountCart, user]);

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart)); } catch { /* storage can be unavailable in private mode */ }
    }
  }, [cart, user]);

  useEffect(() => {
    if (!user || user.role !== 'customer' || initializedForUser.current !== String(user.id)) return undefined;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    const userId = String(user.id);
    syncTimer.current = window.setTimeout(() => {
      pushAccountCart(cart).then((data) => {
        if (String(latestUser.current?.id || '') !== userId) return;
        const currentKey = JSON.stringify(cart.map((item) => [String(item.id), item.quantity, item.price, item.stock, item.title]));
        const savedKey = JSON.stringify((data.items || []).map((item) => [String(item.id), item.quantity, item.price, item.stock, item.title]));
        if (currentKey !== savedKey) setCart(data.items || []);
      }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(syncTimer.current);
  }, [cart, pushAccountCart, user]);

  const addToCart = (item) => {
    if (!isCartEligibleItem(item) || item.currency !== 'USD' || !item.isAvailable) return false;
    const nextId = itemId(item.id);
    setCart((prev) => {
      const existing = prev.find((i) => itemId(i.id) === nextId);
      if (existing) {
        return prev.map((i) => (itemId(i.id) === nextId
          ? {
            ...i,
            ...item,
            id: nextId,
            quantity: Math.min(Number(item.stock || 100), (i.quantity || 1) + 1),
          }
          : i));
      }
      return [...prev, { ...item, id: nextId, currency: 'USD', quantity: 1 }];
    });
    return true;
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => itemId(item.id) !== itemId(id)));
  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) { removeFromCart(id); return; }
    const targetId = itemId(id);
    setCart((prev) => prev.map((item) => (itemId(item.id) === targetId
      ? { ...item, quantity: Math.min(Number(item.stock || 100), Math.max(1, Number(quantity) || 1)) }
      : item)));
  };
  const updateCartItem = (id, patch) => setCart((prev) => prev.map((item) => (itemId(item.id) === itemId(id) ? { ...item, ...patch } : item)));
  const clearCart = () => setCart([]);
  const total = cart.reduce((sum, item) => sum + Number(item.price) * (item.quantity || 1), 0);
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, updateCartItem, clearCart, total, itemCount }}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
