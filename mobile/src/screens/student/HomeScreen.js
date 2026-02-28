import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { coursesAPI } from '../../api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import CourseCard from '../../components/CourseCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS } from '../../utils/theme';
import { getCategoryName } from '../../utils/helpers';

const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'python', label: 'Python' },
  { key: 'finance', label: 'Tài chính' },
  { key: 'data', label: 'Dữ liệu' },
  { key: 'blockchain', label: 'Blockchain' },
  { key: 'accounting', label: 'Kế toán' },
  { key: 'marketing', label: 'Marketing' },
];

const HomeScreen = ({ navigation }) => {
  const { isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [courses, setCourses] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [coursesRes, purchasedRes] = await Promise.all([
        selectedCategory === 'all'
          ? coursesAPI.getAll()
          : coursesAPI.getByCategory(selectedCategory),
        isLoggedIn ? coursesAPI.getPurchasedIds().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setCourses(coursesRes.data);
      setPurchasedIds(purchasedRes.data);
    } catch (err) {
      console.error('Fetch courses error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    navigation.navigate('Search', { query: searchQuery });
  };

  const handleAddToCart = async (courseId) => {
    if (!isLoggedIn) {
      navigation.navigate('Login');
      return;
    }
    try {
      await addToCart(courseId);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.course_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm khóa học..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat.key && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Course List */}
      <FlatList
        data={filteredCourses}
        keyExtractor={(item) => item.course_id}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            onPress={() => navigation.navigate('CourseDetail', { courseId: item.course_id })}
            onAddToCart={handleAddToCart}
            isPurchased={purchasedIds.includes(item.course_id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Không có khóa học nào</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, margin: 16, marginBottom: 0,
    paddingHorizontal: 14, borderRadius: 10, height: 44,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.text },
  categories: { paddingHorizontal: 12, paddingVertical: 12, maxHeight: 52 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, marginHorizontal: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  categoryActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  categoryTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textLight, marginTop: 12 },
});

export default HomeScreen;
