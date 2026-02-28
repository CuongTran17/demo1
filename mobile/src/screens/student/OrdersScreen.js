import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ordersAPI } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { formatPrice, formatDate, getOrderStatusText, getOrderStatusColor } from '../../utils/helpers';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    try {
      const res = await ordersAPI.getAll();
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (orders.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => String(item.order_id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>Đơn #{item.order_id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getOrderStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getOrderStatusColor(item.status) }]}>
                {getOrderStatusText(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {item.items?.map((course, idx) => (
              <View key={idx} style={styles.courseRow}>
                <Ionicons name="book-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.courseName} numberOfLines={1}>{course.course_name}</Text>
                <Text style={styles.coursePrice}>{formatPrice(course.price)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            <Text style={styles.total}>Tổng: {formatPrice(item.total_amount)}</Text>
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  orderId: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 12 },
  courseRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  courseName: { flex: 1, fontSize: 13, color: COLORS.text, marginLeft: 8 },
  coursePrice: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12, borderTopWidth: 1, borderTopColor: COLORS.divider,
    backgroundColor: COLORS.background,
  },
  date: { fontSize: 12, color: COLORS.textSecondary },
  total: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
});

export default OrdersScreen;
