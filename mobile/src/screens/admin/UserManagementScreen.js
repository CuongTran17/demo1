import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput,
  RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';

const UserManagementScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ email: '', password: '', fullname: '', phone: '' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchUsers(); }, [fetchUsers]));

  const handleLock = async (userId) => {
    Alert.alert('Khóa tài khoản', 'Xác nhận khóa?', [
      { text: 'Hủy' },
      {
        text: 'Khóa', style: 'destructive', onPress: async () => {
          try {
            await adminAPI.lockUser(userId);
            fetchUsers();
          } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
        },
      },
    ]);
  };

  const handleUnlock = async (userId) => {
    try {
      await adminAPI.unlockUser(userId);
      fetchUsers();
    } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert('Xóa tài khoản', 'Tài khoản sẽ bị vô hiệu hóa!', [
      { text: 'Hủy' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await adminAPI.deleteUser(userId);
            fetchUsers();
          } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
        },
      },
    ]);
  };

  const handleCreateTeacher = async () => {
    if (!newTeacher.email || !newTeacher.password || !newTeacher.fullname) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    try {
      await adminAPI.createTeacher(newTeacher);
      Alert.alert('Thành công', 'Đã tạo tài khoản giảng viên');
      setShowTeacherModal(false);
      setNewTeacher({ email: '', password: '', fullname: '', phone: '' });
      fetchUsers();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Tạo thất bại');
    }
  };

  const getRoleBadge = (email) => {
    if (email === 'admin@ptit.edu.vn') return { label: 'Admin', color: '#dc2626' };
    if (/^teacher\d*@ptit\.edu\.vn$/.test(email)) return { label: 'Giảng viên', color: '#2563eb' };
    return { label: 'Sinh viên', color: '#16a34a' };
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowTeacherModal(true)}>
        <Ionicons name="person-add" size={18} color="#fff" />
        <Text style={styles.addBtnText}>Tạo giảng viên</Text>
      </TouchableOpacity>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} />}
      >
        {users.map((user) => {
          const role = getRoleBadge(user.email);
          return (
            <View key={user.user_id} style={styles.card}>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{user.fullname}</Text>
                  <View style={[styles.badge, { backgroundColor: role.color + '20' }]}>
                    <Text style={[styles.badgeText, { color: role.color }]}>{role.label}</Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userPhone}>{user.phone || 'N/A'}</Text>
                {user.is_locked && (
                  <View style={[styles.badge, { backgroundColor: '#fef2f2', marginTop: 4 }]}>
                    <Ionicons name="lock-closed" size={10} color="#dc2626" />
                    <Text style={[styles.badgeText, { color: '#dc2626', marginLeft: 4 }]}>Đã khóa</Text>
                  </View>
                )}
              </View>
              {user.email !== 'admin@ptit.edu.vn' && (
                <View style={styles.actions}>
                  {user.is_locked ? (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleUnlock(user.user_id)}>
                      <Ionicons name="lock-open" size={18} color={COLORS.success} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleLock(user.user_id)}>
                      <Ionicons name="lock-closed" size={18} color="#d97706" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteUser(user.user_id)}>
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Create Teacher Modal */}
      <Modal visible={showTeacherModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo tài khoản giảng viên</Text>
            <TextInput style={styles.input} placeholder="Email" value={newTeacher.email} onChangeText={(v) => setNewTeacher({ ...newTeacher, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Mật khẩu" value={newTeacher.password} onChangeText={(v) => setNewTeacher({ ...newTeacher, password: v })} secureTextEntry />
            <TextInput style={styles.input} placeholder="Họ tên" value={newTeacher.fullname} onChangeText={(v) => setNewTeacher({ ...newTeacher, fullname: v })} />
            <TextInput style={styles.input} placeholder="Số điện thoại" value={newTeacher.phone} onChangeText={(v) => setNewTeacher({ ...newTeacher, phone: v })} keyboardType="phone-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.textSecondary }]} onPress={() => setShowTeacherModal(false)}>
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleCreateTeacher}>
                <Text style={styles.modalBtnText}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 12, marginBottom: 10, ...SHADOWS.small,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  userEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  userPhone: { fontSize: 12, color: COLORS.textSecondary },
  actions: { justifyContent: 'center' },
  iconBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: COLORS.divider, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, fontSize: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default UserManagementScreen;
