import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../utils/theme';
import { formatPrice, getCategoryName } from '../utils/helpers';

const CourseCard = ({ course, onPress, onAddToCart, isPurchased, isInCart }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: course.thumbnail || 'https://via.placeholder.com/300x200' }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {course.is_new === 1 && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>MỚI</Text>
        </View>
      )}

      {course.discount_percentage > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{course.discount_percentage}%</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.category}>{getCategoryName(course.category)}</Text>
        <Text style={styles.title} numberOfLines={2}>{course.course_name}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{course.duration || 'N/A'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{course.students_count || 0}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="bar-chart-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{course.level || 'Cơ bản'}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{formatPrice(course.price)}</Text>
            {course.old_price > 0 && (
              <Text style={styles.oldPrice}>{formatPrice(course.old_price)}</Text>
            )}
          </View>

          {isPurchased ? (
            <View style={styles.purchasedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.purchasedText}>Đã mua</Text>
            </View>
          ) : onAddToCart ? (
            <TouchableOpacity
              style={[styles.addButton, isInCart && styles.addButtonDisabled]}
              onPress={() => onAddToCart(course.course_id)}
              disabled={isInCart}
            >
              <Ionicons name={isInCart ? 'checkmark' : 'cart-outline'} size={18} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.divider,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 12,
  },
  category: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.danger,
  },
  oldPrice: {
    fontSize: 13,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchasedText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
});

export default CourseCard;
