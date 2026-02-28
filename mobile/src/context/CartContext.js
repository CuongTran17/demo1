import React, { createContext, useContext, useState, useCallback } from 'react';
import { cartAPI } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

export const CartProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      setCount(0);
      setTotal(0);
      return;
    }
    try {
      const response = await cartAPI.get();
      setItems(response.data.items);
      setCount(response.data.count);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Fetch cart error:', err);
    }
  }, [isLoggedIn]);

  const addToCart = async (courseId) => {
    const response = await cartAPI.add(courseId);
    setCount(response.data.count);
    await fetchCart();
    return response.data;
  };

  const removeFromCart = async (courseId) => {
    const response = await cartAPI.remove(courseId);
    setCount(response.data.count);
    await fetchCart();
    return response.data;
  };

  const clearCart = async () => {
    await cartAPI.clear();
    setItems([]);
    setCount(0);
    setTotal(0);
  };

  const value = {
    items,
    count,
    total,
    fetchCart,
    addToCart,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
