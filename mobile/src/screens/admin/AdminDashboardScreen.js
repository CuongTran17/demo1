import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { formatPrice, formatDate } from '../../utils/helpers';

const AdminDashboardScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleApproveOrder = async (orderId) => {
    Alert.alert('Duyệt thanh toán', `Duyệt đơn #${orderId}?`, [
      { text: 'Hủy' },
      {
        text: 'Duyệt', onPress: async () => {
          try {
            await adminAPI.approveOrder(orderId, 'Đã duyệt');
            fetchData();
          } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
        },
      },
    ]);
  };

  const handleRejectOrder = async (orderId) => {
    Alert.alert('Từ chối thanh toán', `Từ chối đơn #${orderId}?`, [
      { text: 'Hủy' },
      {
        text: 'Từ chối', style: 'destructive', onPress: async () => {
          try {
            await adminAPI.rejectOrder(orderId, 'Từ chối');
            fetchData();
          } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
        },
      },
    ]);
  };

  const handleApproveChange = async (changeId) => {
    try {
      await adminAPI.approveChange(changeId, 'Đã duyệt');
      fetchData();
    } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
  };

  const handleRejectChange = async (changeId) => {
    try {
      await adminAPI.rejectChange(changeId, 'Từ chối');
      fetchData();
    } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
  };

  if (loading) return <LoadingSpinner />;

  const { stats, pendingOrders, pendingChanges } = data;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {[
          { icon: 'people', color: COLORS.primary, label: 'Người dùng', value: stats.totalUsers },
          { icon: 'school', color: COLORS.secondary, label: 'Giảng viên', value: stats.totalTeachers },
          { icon: 'book', color: COLORS.accent, label: 'Khóa học', value: stats.totalCourses },
          { icon: 'cash', color: COLORS.success, label: 'Doanh thu', value: formatPrice(stats.totalRevenue) },
        ].map((stat, idx) => (
          <View key={idx} style={styles.statCard}>
            <Ionicons name={stat.icon} size={28} color={stat.color} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Alert badges */}
      <View style={styles.alertRow}>
        {stats.pendingOrders > 0 && (
          <View style={[styles.alertBadge, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time" size={16} color="#d97706" />
            <Text style={[styles.alertText, { color: '#d97706' }]}>{stats.pendingOrders} đơn chờ duyệt</Text>
          </View>
        )}
        {stats.pendingChanges > 0 && (
          <View style={[styles.alertBadge, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="documents" size={16} color="#2563eb" />
            <Text style={[styles.alertText, { color: '#2563eb' }]}>{stats.pendingChanges} yêu cầu thay đổi</Text>
          </View>
        )}
      </View>

      {/* Pending Orders */}
      <Text style={styles.sectionTitle}>Đơn chờ duyệt thanh toán</Text>
      {pendingOrders.length === 0 ? (
        <Text style={styles.emptyText}>Không có đơn chờ duyệt</Text>
      ) : (
        pendingOrders.map((order) => (
          <View key={order.order_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Đơn #{order.order_id}</Text>
              <Text style={styles.cardSubtitle}>{order.fullname} - {order.email}</Text>
              <Text style={styles.cardAmount}>{formatPrice(order.total_amount)}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleApproveOrder(order.order_id)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleRejectOrder(order.order_id)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Pending Changes */}
      <Text style={styles.sectionTitle}>Yêu cầu thay đổi từ giảng viên</Text>
      {pendingChanges.length === 0 ? (
        <Text style={styles.emptyText}>Không có yêu cầu</Text>
      ) : (
        pendingChanges.map((change) => (
          <View key={change.change_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{change.change_type}</Text>
              <Text style={styles.cardSubtitle}>
                Bởi: {change.teacher_name} | {formatDate(change.created_at)}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleApproveChange(change.change_id)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleRejectChange(change.change_id)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc?', [{ text: 'Hủy' }, { text: 'Đăng xuất', onPress: logout }])}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12, ...SHADOWS.small,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  alertRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 4 },
  alertText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 12, ...SHADOWS.small },
  cardHeader: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: COLORS.danger, marginTop: 4 },
  cardActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  approveBtn: { backgroundColor: COLORS.success, borderBottomLeftRadius: 10 },
  rejectBtn: { backgroundColor: COLORS.danger, borderBottomRightRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.danger, marginTop: 16,
  },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 14, marginLeft: 6 },
});

export default AdminDashboardScreen;
