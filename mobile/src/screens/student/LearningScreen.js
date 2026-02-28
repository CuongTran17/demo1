import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { lessonsAPI } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, SHADOWS } from '../../utils/theme';
import { getYouTubeId } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LearningScreen = ({ route, navigation }) => {
  const { courseId, courseName } = route.params;
  const [lessons, setLessons] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: courseName || 'Học' });
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const [lessonsRes, progressRes] = await Promise.all([
        lessonsAPI.getByCourse(courseId),
        lessonsAPI.getProgress(courseId),
      ]);
      setLessons(lessonsRes.data);
      setCompletedIds(progressRes.data);
      if (lessonsRes.data.length > 0) {
        setSelectedLesson(lessonsRes.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedLesson) return;
    try {
      const isCompleted = completedIds.includes(selectedLesson.lesson_id);
      if (isCompleted) {
        await lessonsAPI.resetProgress(courseId, selectedLesson.lesson_id);
        setCompletedIds((prev) => prev.filter((id) => id !== selectedLesson.lesson_id));
      } else {
        await lessonsAPI.markComplete(courseId, selectedLesson.lesson_id);
        setCompletedIds((prev) => [...prev, selectedLesson.lesson_id]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextLesson = () => {
    const currentIdx = lessons.findIndex((l) => l.lesson_id === selectedLesson?.lesson_id);
    if (currentIdx < lessons.length - 1) {
      setSelectedLesson(lessons[currentIdx + 1]);
    }
  };

  if (loading) return <LoadingSpinner />;

  const videoId = selectedLesson ? getYouTubeId(selectedLesson.video_url) : null;
  const isCompleted = selectedLesson ? completedIds.includes(selectedLesson.lesson_id) : false;
  const progress = lessons.length > 0 ? Math.round((completedIds.length / lessons.length) * 100) : 0;

  // Group by section
  const sections = {};
  lessons.forEach((l) => {
    if (!sections[l.section_id]) sections[l.section_id] = [];
    sections[l.section_id].push(l);
  });

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        {videoId ? (
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` }}
            style={styles.video}
            allowsFullscreenVideo
            javaScriptEnabled
          />
        ) : (
          <View style={styles.noVideo}>
            <Ionicons name="videocam-off-outline" size={40} color={COLORS.textLight} />
            <Text style={styles.noVideoText}>Không có video</Text>
          </View>
        )}
      </View>

      {/* Lesson Info */}
      {selectedLesson && (
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>{selectedLesson.lesson_title}</Text>
          <View style={styles.lessonActions}>
            <TouchableOpacity
              style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
              onPress={handleMarkComplete}
            >
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={18}
                color={isCompleted ? '#fff' : COLORS.primary}
              />
              <Text style={[styles.completeBtnText, isCompleted && { color: '#fff' }]}>
                {isCompleted ? 'Hoàn thành' : 'Đánh dấu hoàn thành'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNextLesson}>
              <Text style={styles.nextBtnText}>Tiếp</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Tiến độ: {completedIds.length}/{lessons.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressPercent}>{progress}%</Text>
      </View>

      {/* Lesson List */}
      <ScrollView style={styles.lessonList}>
        {Object.entries(sections).map(([sectionId, sectionLessons]) => (
          <View key={sectionId}>
            <Text style={styles.sectionLabel}>Phần {sectionId}</Text>
            {sectionLessons.map((lesson, idx) => {
              const isActive = selectedLesson?.lesson_id === lesson.lesson_id;
              const isDone = completedIds.includes(lesson.lesson_id);
              return (
                <TouchableOpacity
                  key={lesson.lesson_id}
                  style={[styles.lessonItem, isActive && styles.lessonItemActive]}
                  onPress={() => setSelectedLesson(lesson)}
                >
                  <View style={[styles.lessonIcon, isDone && styles.lessonIconDone]}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={styles.lessonNum}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.lessonText, isActive && { color: COLORS.primary, fontWeight: '700' }]} numberOfLines={1}>
                    {lesson.lesson_title}
                  </Text>
                  {lesson.duration > 0 && (
                    <Text style={styles.duration}>{lesson.duration}p</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  videoContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 9 / 16, backgroundColor: '#000' },
  video: { flex: 1 },
  noVideo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noVideoText: { color: COLORS.textLight, marginTop: 8 },
  lessonHeader: { padding: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  lessonTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  lessonActions: { flexDirection: 'row', justifyContent: 'space-between' },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary,
  },
  completeBtnDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  completeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginLeft: 4 },
  nextBtn: { flexDirection: 'row', alignItems: 'center' },
  nextBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  progressSection: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary, width: 90 },
  progressBar: { flex: 1, height: 8, backgroundColor: COLORS.divider, borderRadius: 4, marginHorizontal: 8 },
  progressFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  progressPercent: { fontSize: 12, fontWeight: '700', color: COLORS.primary, width: 34 },
  lessonList: { flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  lessonItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  lessonItemActive: { backgroundColor: COLORS.primaryLight },
  lessonIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.divider,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  lessonIconDone: { backgroundColor: COLORS.success },
  lessonNum: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  lessonText: { flex: 1, fontSize: 13, color: COLORS.text },
  duration: { fontSize: 11, color: COLORS.textSecondary },
});

export default LearningScreen;
