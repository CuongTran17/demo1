import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { COLORS, SHADOWS } from '../../utils/theme';

const AccountScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullname, setFullname] = useState(user?.fullname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = async () => {
    try {
      const res = await authAPI.updateProfile({ fullname, email, phone });
      updateUser(res.data.user);
      setEditing(false);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Cập nhật thất bại');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu');
      return;
    }
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Thành công', 'Đổi mật khẩu thành công');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Đổi mật khẩu thất bại');
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{user?.fullname}</Text>
        <Text style={styles.role}>
          {user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'teacher' ? 'Giảng viên' : 'Học viên'}
        </Text>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Ionicons name={editing ? 'close' : 'pencil'} size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
          {editing ? (
            <TextInput style={styles.editInput} value={fullname} onChangeText={setFullname} />
          ) : (
            <Text style={styles.infoText}>{user?.fullname}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
          {editing ? (
            <TextInput style={styles.editInput} value={email} onChangeText={setEmail} keyboardType="email-address" />
          ) : (
            <Text style={styles.infoText}>{user?.email}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
          {editing ? (
            <TextInput style={styles.editInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          ) : (
            <Text style={styles.infoText}>{user?.phone}</Text>
          )}
        </View>

        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setChangingPassword(!changingPassword)}
        >
          <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
          <Ionicons name={changingPassword ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {changingPassword && (
          <View>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mật khẩu hiện tại"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="Mật khẩu mới"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
              <Text style={styles.saveButtonText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyCourses')}>
          <Ionicons name="library-outline" size={20} color={COLORS.primary} />
          <Text style={styles.menuText}>Khóa học của tôi</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Orders')}>
          <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
          <Text style={styles.menuText}>Lịch sử đơn hàng</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 24, marginBottom: 16, ...SHADOWS.medium,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  role: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  section: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16, ...SHADOWS.small,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  infoText: { fontSize: 14, color: COLORS.text, marginLeft: 12 },
  editInput: {
    flex: 1, fontSize: 14, color: COLORS.text, marginLeft: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingVertical: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary, borderRadius: 8, height: 40,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  passwordInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, height: 44, fontSize: 14, marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  menuText: { flex: 1, fontSize: 15, color: COLORS.text, marginLeft: 12 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.danger,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.danger, marginLeft: 8 },
});

export default AccountScreen;
