import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullname.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullname: fullname.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      Alert.alert('Thành công', 'Đăng ký thành công!');
    } catch (err) {
      const message = err.response?.data?.error || 'Đăng ký thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (icon, placeholder, value, setValue, opts = {}) => (
    <View style={styles.inputGroup}>
      <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={setValue}
        autoCapitalize={opts.autoCapitalize || 'none'}
        keyboardType={opts.keyboardType || 'default'}
        secureTextEntry={opts.secureTextEntry}
      />
      {opts.showToggle && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="school" size={48} color={COLORS.primary} />
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Tham gia PTIT Learning ngay hôm nay</Text>
        </View>

        <View style={styles.form}>
          {renderInput('person-outline', 'Họ và tên', fullname, setFullname, { autoCapitalize: 'words' })}
          {renderInput('mail-outline', 'Email', email, setEmail, { keyboardType: 'email-address' })}
          {renderInput('call-outline', 'Số điện thoại', phone, setPhone, { keyboardType: 'phone-pad' })}
          {renderInput('lock-closed-outline', 'Mật khẩu', password, setPassword, {
            secureTextEntry: !showPassword, showToggle: true,
          })}
          {renderInput('lock-closed-outline', 'Xác nhận mật khẩu', confirmPassword, setConfirmPassword, {
            secureTextEntry: !showPassword,
          })}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginTop: 10 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },
  form: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, ...SHADOWS.medium },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    marginBottom: 14, paddingHorizontal: 12, backgroundColor: COLORS.background,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 15, color: COLORS.text },
  eyeIcon: { padding: 4 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 10, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});

export default RegisterScreen;
