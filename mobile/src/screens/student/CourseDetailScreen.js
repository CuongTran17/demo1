import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { coursesAPI, lessonsAPI } from '../../api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { formatPrice, getCategoryName } from '../../utils/helpers';

const CourseDetailScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const { isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const [courseRes, lessonsRes] = await Promise.all([
        coursesAPI.getById(courseId),
        lessonsAPI.getByCourse(courseId),
      ]);
      setCourse(courseRes.data);
      setLessons(lessonsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      navigation.navigate('Login');
      return;
    }
    try {
      await addToCart(courseId);
      Alert.alert('Thành công', 'Đã thêm vào giỏ hàng');
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Không thể thêm vào giỏ hàng');
    }
  };

  const handleStartLearning = () => {
    navigation.navigate('Learning', { courseId, courseName: course.course_name });
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Không tìm thấy khóa học</Text>;

  // Group lessons by section
  const sections = {};
  lessons.forEach((l) => {
    if (!sections[l.section_id]) sections[l.section_id] = [];
    sections[l.section_id].push(l);
  });

  return (
    <View style={styles.container}>
      <ScrollView>
        <Image
          source={{ uri: course.thumbnail || 'https://via.placeholder.com/400x200' }}
          style={styles.image}
        />

        <View style={styles.content}>
          <Text style={styles.category}>{getCategoryName(course.category)}</Text>
          <Text style={styles.title}>{course.course_name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{course.duration || 'N/A'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{course.students_count} học viên</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="bar-chart-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{course.level}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Mô tả khóa học</Text>
          <Text style={styles.description}>{course.description || 'Chưa có mô tả.'}</Text>

          {/* Lessons */}
          <Text style={styles.sectionTitle}>
            Nội dung khóa học ({lessons.length} bài học)
          </Text>

          {Object.entries(sections).map(([sectionId, sectionLessons]) => (
            <View key={sectionId} style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Phần {sectionId}</Text>
              {sectionLessons.map((lesson, idx) => (
                <View key={lesson.lesson_id} style={styles.lessonItem}>
                  <View style={styles.lessonNumber}>
                    <Text style={styles.lessonNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.lesson_title}</Text>
                    {lesson.duration > 0 && (
                      <Text style={styles.lessonDuration}>{lesson.duration} phút</Text>
                    )}
                  </View>
                  <Ionicons name="play-circle-outline" size={24} color={COLORS.primary} />
                </View>
              ))}
            </View>
          ))}

          {lessons.length === 0 && (
            <Text style={styles.noLessons}>Chưa có bài học nào</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(course.price)}</Text>
          {course.old_price > 0 && (
            <Text style={styles.oldPrice}>{formatPrice(course.old_price)}</Text>
          )}
        </View>

        {course.hasPurchased ? (
          <TouchableOpacity style={[styles.actionButton, styles.learnButton]} onPress={handleStartLearning}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Vào học</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={handleAddToCart}>
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Thêm vào giỏ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  image: { width: '100%', height: 200, backgroundColor: COLORS.divider },
  content: { padding: 16 },
  category: { fontSize: 12, color: COLORS.primary, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 6, marginBottom: 12 },
  metaRow: { flexDirection: 'row', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  metaText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 10 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 12, ...SHADOWS.small,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  lessonItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  lessonNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  lessonNumberText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  lessonDuration: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  noLessons: { textAlign: 'center', color: COLORS.textLight, marginTop: 20, fontSize: 14 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  priceContainer: {},
  price: { fontSize: 22, fontWeight: '700', color: COLORS.danger },
  oldPrice: { fontSize: 14, color: COLORS.textLight, textDecorationLine: 'line-through' },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
  },
  learnButton: { backgroundColor: COLORS.secondary },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 8 },
});

export default CourseDetailScreen;
