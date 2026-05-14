import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI, coursesAPI } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const GUEST_CART_KEY = 'guest_cart';

function readGuestCartIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean))] : [];
  } catch {
    return [];
  }
}

function writeGuestCartIds(courseIds) {
  const normalized = [...new Set(courseIds.map((id) => String(id || '').trim()).filter(Boolean))];
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(normalized));
  return normalized;
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchGuestCart = useCallback(async () => {
    const courseIds = readGuestCartIds();
    setCartCount(courseIds.length);

    if (courseIds.length === 0) {
      setCartItems([]);
      return [];
    }

    const results = await Promise.all(
      courseIds.map((courseId) => coursesAPI.getById(courseId).then((res) => res.data.course || res.data).catch(() => null))
    );
    const items = results.filter(Boolean);
    const validIds = items.map((item) => item.course_id);

    if (validIds.length !== courseIds.length) {
      writeGuestCartIds(validIds);
      setCartCount(validIds.length);
    }

    setCartItems(items);
    return items;
  }, []);

  const fetchCart = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      try {
        setLoading(true);
        await fetchGuestCart();
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      setLoading(true);
      const res = await cartAPI.get();
      setCartItems(res.data.items || res.data || []);
      const countRes = await cartAPI.getCount();
      setCartCount(countRes.data.count || 0);
    } catch {
      setCartItems([]);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  }, [authLoading, fetchGuestCart, user]);

  const mergeGuestCart = useCallback(async () => {
    const courseIds = readGuestCartIds();
    if (courseIds.length === 0) {
      return [];
    }

    setLoading(true);
    try {
      const res = await cartAPI.merge(courseIds);
      localStorage.removeItem(GUEST_CART_KEY);
      const items = res.data.items || [];
      setCartItems(items);
      setCartCount(res.data.count ?? items.length);
      return items;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncCart = async () => {
      if (user && readGuestCartIds().length > 0) {
        try {
          await mergeGuestCart();
          return;
        } catch {
          if (!cancelled) {
            await fetchCart();
          }
          return;
        }
      }

      if (!cancelled) {
        await fetchCart();
      }
    };

    syncCart();
    return () => {
      cancelled = true;
    };
  }, [fetchCart, mergeGuestCart, user]);

  const addToCart = async (courseId) => {
    if (!user) {
      const normalizedCourseId = String(courseId || '').trim();
      if (!normalizedCourseId) return;
      const ids = readGuestCartIds();
      if (!ids.includes(normalizedCourseId)) {
        writeGuestCartIds([...ids, normalizedCourseId]);
      }
      await fetchGuestCart();
      return;
    }

    await cartAPI.add(courseId);
    await fetchCart();
  };

  const removeFromCart = async (courseId) => {
    if (!user) {
      const normalizedCourseId = String(courseId || '').trim();
      writeGuestCartIds(readGuestCartIds().filter((id) => id !== normalizedCourseId));
      await fetchGuestCart();
      return;
    }

    await cartAPI.remove(courseId);
    await fetchCart();
  };

  const clearCart = async () => {
    if (!user) {
      localStorage.removeItem(GUEST_CART_KEY);
      setCartItems([]);
      setCartCount(0);
      return;
    }

    await cartAPI.clear();
    setCartItems([]);
    setCartCount(0);
  };

  return (
    <CartContext.Provider value={{ cartItems, cartCount, loading, addToCart, removeFromCart, clearCart, fetchCart, mergeGuestCart }}>
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
