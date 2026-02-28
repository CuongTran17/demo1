import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coursesAPI } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { getCategoryName } from '../../utils/helpers';

const MyCoursesScreen = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchCourses();
    }, [])
  );

  const fetchCourses = async () => {
    try {
      const res = await coursesAPI.getMyCourses();
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (courses.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="library-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>Chưa có khóa học</Text>
        <Text style={styles.emptyText}>Mua khóa học để bắt đầu học</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.course_id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Learning', { courseId: item.course_id, courseName: item.course_name })}
        >
          <Image
            source={{ uri: item.thumbnail || 'https://via.placeholder.com/80' }}
            style={styles.thumbnail}
          />
          <View style={styles.info}>
            <Text style={styles.category}>{getCategoryName(item.category)}</Text>
            <Text style={styles.title} numberOfLines={2}>{item.course_name}</Text>

            {/* Progress bar */}
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.progress_percentage || 0}%` }]} />
              </View>
              <Text style={styles.progressText}>{item.progress_percentage || 0}%</Text>
            </View>

            {item.progress_status === 'completed' && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.completedText}>Hoàn thành</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 12,
    ...SHADOWS.small,
  },
  thumbnail: { width: 80, height: 60, borderRadius: 8, backgroundColor: COLORS.divider },
  info: { flex: 1, marginLeft: 12 },
  category: { fontSize: 10, color: COLORS.primary, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginVertical: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressBar: {
    flex: 1, height: 6, backgroundColor: COLORS.divider, borderRadius: 3, marginRight: 8,
  },
  progressFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', width: 30 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  completedText: { fontSize: 11, color: COLORS.success, fontWeight: '600', marginLeft: 4 },
});

export default MyCoursesScreen;
