import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { coursesAPI } from '../../api';
import CourseCard from '../../components/CourseCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS } from '../../utils/theme';

const SearchScreen = ({ route, navigation }) => {
  const initialQuery = route.params?.query || '';
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) search();
  }, []);

  const search = async () => {
    setLoading(true);
    try {
      const res = await coursesAPI.search({
        q: query, category: category !== 'all' ? category : undefined,
        price: priceRange || undefined, sort: sortBy,
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Tìm kiếm khóa học..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={search}>
          <Text style={styles.searchBtn}>Tìm</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.resultCount}>
        {results.length > 0 ? `Tìm thấy ${results.length} khóa học` : ''}
      </Text>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.course_id}
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              onPress={() => navigation.navigate('CourseDetail', { courseId: item.course_id })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Không tìm thấy khóa học nào</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, margin: 16,
    paddingHorizontal: 14, borderRadius: 10, height: 44,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.text },
  searchBtn: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  resultCount: { paddingHorizontal: 16, fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  list: { padding: 16, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textLight, marginTop: 12 },
});

export default SearchScreen;
