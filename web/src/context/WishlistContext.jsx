import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { wishlistAPI } from '../api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [courseIds, setCourseIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWishlistIds = useCallback(async () => {
    if (!user) {
      setCourseIds([]);
      return;
    }

    setLoading(true);
    try {
      const res = await wishlistAPI.getIds();
      setCourseIds(res.data?.courseIds || []);
    } catch {
      setCourseIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWishlistIds();
  }, [loadWishlistIds]);

  const toggleWishlist = useCallback(async (courseId) => {
    if (!user) {
      const err = new Error('LOGIN_REQUIRED');
      err.code = 'LOGIN_REQUIRED';
      throw err;
    }

    const normalized = String(courseId || '').trim();
    if (!normalized) return false;

    const exists = courseIds.includes(normalized);
    if (exists) {
      await wishlistAPI.remove(normalized);
      setCourseIds((prev) => prev.filter((id) => id !== normalized));
      return false;
    }

    await wishlistAPI.add(normalized);
    setCourseIds((prev) => (prev.includes(normalized) ? prev : [normalized, ...prev]));
    return true;
  }, [courseIds, user]);

  const value = useMemo(() => ({
    courseIds,
    count: courseIds.length,
    loading,
    isWishlisted: (courseId) => courseIds.includes(String(courseId || '').trim()),
    toggleWishlist,
    reloadWishlist: loadWishlistIds,
  }), [courseIds, loadWishlistIds, loading, toggleWishlist]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
