import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, RefreshControl, Modal, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { teacherAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { formatPrice, getCategoryName } from '../../utils/helpers';

const CATEGORIES = [
  { value: 'data', label: 'Data Science' },
  { value: 'blockchain', label: 'Blockchain' },
  { value: 'accounting', label: 'Kế toán' },
  { value: 'finance', label: 'Tài chính' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'python', label: 'Python' },
];

const TeacherDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('courses');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseModal, setCourseModal] = useState(false);
  const [lessonModal, setLessonModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '', description: '', category: 'data', price: '', discount_price: '',
    thumbnail_url: '', total_hours: '', what_you_learn: '',
  });
  const [lessonForm, setLessonForm] = useState({
    course_id: '', section_name: '', title: '', content_url: '', duration_minutes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await teacherAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // Course CRUD (via pending changes)
  const openCourseModal = (course = null) => {
    if (course) {
      setEditMode(true);
      setSelectedCourse(course);
      setCourseForm({
        title: course.title, description: course.description || '',
        category: course.category, price: String(course.price),
        discount_price: course.discount_price ? String(course.discount_price) : '',
        thumbnail_url: course.thumbnail_url || '', total_hours: String(course.total_hours || ''),
        what_you_learn: course.what_you_learn || '',
      });
    } else {
      setEditMode(false);
      setSelectedCourse(null);
      setCourseForm({ title: '', description: '', category: 'data', price: '', discount_price: '', thumbnail_url: '', total_hours: '', what_you_learn: '' });
    }
    setCourseModal(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title || !courseForm.price) {
      Alert.alert('Lỗi', 'Tiêu đề và giá là bắt buộc');
      return;
    }
    try {
      const payload = {
        ...courseForm,
        price: Number(courseForm.price),
        discount_price: courseForm.discount_price ? Number(courseForm.discount_price) : null,
        total_hours: courseForm.total_hours ? Number(courseForm.total_hours) : null,
      };
      if (editMode) {
        await teacherAPI.updateCourse(selectedCourse.course_id, payload);
      } else {
        await teacherAPI.createCourse(payload);
      }
      Alert.alert('Thành công', 'Yêu cầu đã gửi, chờ Admin duyệt');
      setCourseModal(false);
      fetchData();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const handleDeleteCourse = (courseId) => {
    Alert.alert('Xóa khóa học', 'Yêu cầu xóa sẽ được gửi Admin duyệt', [
      { text: 'Hủy' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await teacherAPI.deleteCourse(courseId);
            Alert.alert('Đã gửi', 'Chờ Admin duyệt');
            fetchData();
          } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
        },
      },
    ]);
  };

  // Lesson CRUD
  const openLessonModal = (courseId) => {
    setLessonForm({ course_id: courseId, section_name: '', title: '', content_url: '', duration_minutes: '' });
    setLessonModal(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title || !lessonForm.section_name) {
      Alert.alert('Lỗi', 'Tiêu đề và tên phần là bắt buộc');
      return;
    }
    try {
      await teacherAPI.createLesson({
        ...lessonForm,
        duration_minutes: lessonForm.duration_minutes ? Number(lessonForm.duration_minutes) : null,
      });
      Alert.alert('Đã gửi', 'Chờ Admin duyệt');
      setLessonModal(false);
      fetchData();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  // Lock request
  const handleLockRequest = () => {
    Alert.alert('Yêu cầu khóa TK', 'Gửi yêu cầu khóa tài khoản?', [
      { text: 'Hủy' },
      {
        text: 'Gửi', onPress: async () => {
          try {
            await teacherAPI.requestLock('Tôi muốn khóa tài khoản');
            Alert.alert('Đã gửi', 'Chờ Admin duyệt yêu cầu');
          } catch (err) { Alert.alert('Lỗi', 'Thao tác thất bại'); }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  const { courses, pendingChanges, stats } = data;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {['courses', 'pending', 'settings'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'courses' ? 'Khóa học' : t === 'pending' ? `Chờ duyệt (${pendingChanges?.length || 0})` : 'Cài đặt'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {tab === 'courses' && (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{stats?.totalCourses || 0}</Text>
                <Text style={styles.miniStatLabel}>Khóa học</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{stats?.totalStudents || 0}</Text>
                <Text style={styles.miniStatLabel}>Học viên</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.addCourseBtn} onPress={() => openCourseModal()}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addCourseBtnText}>Thêm khóa học</Text>
            </TouchableOpacity>

            {courses?.map((course) => (
              <View key={course.course_id} style={styles.courseCard}>
                {course.thumbnail_url ? (
                  <Image source={{ uri: course.thumbnail_url }} style={styles.courseThumb} />
                ) : null}
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.courseCategory}>{getCategoryName(course.category)}</Text>
                  <Text style={styles.coursePrice}>{formatPrice(course.price)}</Text>
                </View>
                <View style={styles.courseActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openCourseModal(course)}>
                    <Ionicons name="create" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openLessonModal(course.course_id)}>
                    <Ionicons name="list-outline" size={20} color={COLORS.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteCourse(course.course_id)}>
                    <Ionicons name="trash" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'pending' && (
          <>
            {pendingChanges?.length === 0 ? (
              <Text style={styles.emptyText}>Không có yêu cầu chờ duyệt</Text>
            ) : (
              pendingChanges?.map((change) => (
                <View key={change.change_id} style={styles.changeCard}>
                  <View style={[styles.statusDot, { backgroundColor: change.status === 'approved' ? COLORS.success : change.status === 'rejected' ? COLORS.danger : '#d97706' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.changeType}>{change.change_type}</Text>
                    <Text style={styles.changeStatus}>
                      {change.status === 'pending' ? 'Chờ duyệt' : change.status === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'settings' && (
          <View style={styles.settingsSection}>
            <TouchableOpacity style={styles.settingItem} onPress={handleLockRequest}>
              <Ionicons name="lock-closed" size={20} color="#d97706" />
              <Text style={styles.settingText}>Yêu cầu khóa tài khoản</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, { borderColor: COLORS.danger }]}
              onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc?', [{ text: 'Hủy' }, { text: 'Đăng xuất', onPress: logout }])}
            >
              <Ionicons name="log-out" size={20} color={COLORS.danger} />
              <Text style={[styles.settingText, { color: COLORS.danger }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Course Modal */}
      <Modal visible={courseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editMode ? 'Sửa khóa học' : 'Thêm khóa học'}</Text>
              <TextInput style={styles.input} placeholder="Tiêu đề *" value={courseForm.title} onChangeText={(v) => setCourseForm({ ...courseForm, title: v })} />
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Mô tả" value={courseForm.description} onChangeText={(v) => setCourseForm({ ...courseForm, description: v })} multiline />
              <View style={styles.categoryPicker}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.categoryItem, courseForm.category === c.value && styles.categoryItemActive]}
                    onPress={() => setCourseForm({ ...courseForm, category: c.value })}
                  >
                    <Text style={[styles.categoryItemText, courseForm.category === c.value && { color: '#fff' }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} placeholder="Giá *" value={courseForm.price} onChangeText={(v) => setCourseForm({ ...courseForm, price: v })} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Giá giảm" value={courseForm.discount_price} onChangeText={(v) => setCourseForm({ ...courseForm, discount_price: v })} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="URL ảnh" value={courseForm.thumbnail_url} onChangeText={(v) => setCourseForm({ ...courseForm, thumbnail_url: v })} />
              <TextInput style={styles.input} placeholder="Tổng giờ học" value={courseForm.total_hours} onChangeText={(v) => setCourseForm({ ...courseForm, total_hours: v })} keyboardType="numeric" />
              <TextInput style={[styles.input, { height: 60 }]} placeholder="Bạn sẽ học được gì" value={courseForm.what_you_learn} onChangeText={(v) => setCourseForm({ ...courseForm, what_you_learn: v })} multiline />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#6b7280' }]} onPress={() => setCourseModal(false)}>
                  <Text style={styles.modalBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleSaveCourse}>
                  <Text style={styles.modalBtnText}>{editMode ? 'Cập nhật' : 'Tạo mới'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Lesson Modal */}
      <Modal visible={lessonModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm bài học</Text>
            <TextInput style={styles.input} placeholder="Tên phần *" value={lessonForm.section_name} onChangeText={(v) => setLessonForm({ ...lessonForm, section_name: v })} />
            <TextInput style={styles.input} placeholder="Tiêu đề bài học *" value={lessonForm.title} onChangeText={(v) => setLessonForm({ ...lessonForm, title: v })} />
            <TextInput style={styles.input} placeholder="URL nội dung (YouTube)" value={lessonForm.content_url} onChangeText={(v) => setLessonForm({ ...lessonForm, content_url: v })} />
            <TextInput style={styles.input} placeholder="Thời lượng (phút)" value={lessonForm.duration_minutes} onChangeText={(v) => setLessonForm({ ...lessonForm, duration_minutes: v })} keyboardType="numeric" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#6b7280' }]} onPress={() => setLessonModal(false)}>
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleSaveLesson}>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  statsRow: { flexDirection: 'row', padding: 16 },
  miniStat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, padding: 16, alignItems: 'center', marginHorizontal: 4, ...SHADOWS.small },
  miniStatValue: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  miniStatLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  addCourseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, marginHorizontal: 16, marginBottom: 12,
  },
  addCourseBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  courseCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10,
    marginHorizontal: 16, marginBottom: 10, overflow: 'hidden', ...SHADOWS.small,
  },
  courseThumb: { width: 80, height: 80 },
  courseInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  courseTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  courseCategory: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  coursePrice: { fontSize: 13, fontWeight: '700', color: COLORS.danger, marginTop: 4 },
  courseActions: { justifyContent: 'center', paddingRight: 8 },
  iconBtn: { padding: 6 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14 },
  changeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 14, marginHorizontal: 16, marginTop: 10, ...SHADOWS.small,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  changeType: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  changeStatus: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  settingsSection: { padding: 16 },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.divider,
  },
  settingText: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalScroll: { maxHeight: '90%' },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: COLORS.divider, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, fontSize: 14,
  },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  categoryItem: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#f3f4f6', marginRight: 8, marginBottom: 6,
  },
  categoryItemActive: { backgroundColor: COLORS.primary },
  categoryItemText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default TeacherDashboardScreen;
