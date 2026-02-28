import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../../context/CartContext';
import { ordersAPI } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { formatPrice } from '../../utils/helpers';

const CartScreen = ({ navigation }) => {
  const { items, count, total, fetchCart, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCart().finally(() => setLoading(false));
    }, [fetchCart])
  );

  const handleRemove = async (courseId) => {
    Alert.alert('Xác nhận', 'Xóa khóa học khỏi giỏ hàng?', [
      { text: 'Hủy' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try { await removeFromCart(courseId); } catch (err) { console.error(err); }
        },
      },
    ]);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    Alert.alert(
      'Xác nhận đặt hàng',
      `Tổng thanh toán: ${formatPrice(total)}\nPhương thức: Chuyển khoản ngân hàng`,
      [
        { text: 'Hủy' },
        {
          text: 'Đặt hàng', onPress: async () => {
            setOrdering(true);
            try {
              const res = await ordersAPI.create('bank_transfer');
              Alert.alert('Thành công', 'Đặt hàng thành công! Vui lòng chuyển khoản để hoàn tất.');
              await fetchCart();
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.error || 'Đặt hàng thất bại');
            } finally {
              setOrdering(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <Text style={styles.emptyText}>Hãy thêm khóa học vào giỏ hàng</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.browseButtonText}>Khám phá khóa học</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.course_id}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <Image
              source={{ uri: item.thumbnail || 'https://via.placeholder.com/80' }}
              style={styles.thumbnail}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.course_name}</Text>
              <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.course_id)} style={styles.removeBtn}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      {/* Bottom summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{count} khóa học</Text>
          <Text style={styles.summaryTotal}>{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, ordering && { opacity: 0.6 }]}
          onPress={handleCheckout}
          disabled={ordering}
        >
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.checkoutText}>
            {ordering ? 'Đang xử lý...' : 'Thanh toán'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  browseButton: {
    marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  browseButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 12,
    ...SHADOWS.small,
  },
  thumbnail: { width: 70, height: 50, borderRadius: 6, backgroundColor: COLORS.divider },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemPrice: { fontSize: 15, fontWeight: '700', color: COLORS.danger, marginTop: 4 },
  removeBtn: { padding: 8 },
  summary: {
    backgroundColor: COLORS.surface, padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOWS.medium,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryTotal: { fontSize: 20, fontWeight: '700', color: COLORS.danger },
  checkoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 10, height: 50,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },
});

export default CartScreen;
