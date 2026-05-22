const db = require('../config/database');
const Course = require('./Course');
const CourseBundle = require('./CourseBundle');
const Cart = require('./Cart');

const DEFAULT_SETTINGS = {
  is_enabled: 1,
  bundle_discount_min: 5,
  bundle_discount_max: 10,
  course_discount_percent: 5,
  max_suggestions: 3,
};

function clampPercent(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(90, Math.round(num)));
}

function normalizeSettings(payload = {}) {
  const min = clampPercent(payload.bundleDiscountMin ?? payload.bundle_discount_min, DEFAULT_SETTINGS.bundle_discount_min);
  const max = clampPercent(payload.bundleDiscountMax ?? payload.bundle_discount_max, DEFAULT_SETTINGS.bundle_discount_max);
  const sortedMin = Math.min(min, max);
  const sortedMax = Math.max(min, max);
  const maxSuggestions = Number(payload.maxSuggestions ?? payload.max_suggestions);

  return {
    is_enabled: payload.isEnabled === undefined && payload.is_enabled === undefined
      ? DEFAULT_SETTINGS.is_enabled
      : (payload.isEnabled ?? payload.is_enabled ? 1 : 0),
    bundle_discount_min: sortedMin,
    bundle_discount_max: sortedMax,
    course_discount_percent: clampPercent(
      payload.courseDiscountPercent ?? payload.course_discount_percent,
      DEFAULT_SETTINGS.course_discount_percent
    ),
    max_suggestions: Number.isInteger(maxSuggestions)
      ? Math.max(1, Math.min(12, maxSuggestions))
      : DEFAULT_SETTINGS.max_suggestions,
  };
}

function itemKey(type, id) {
  return `${type}:${String(id)}`;
}

class CartUpsell {
  static async getSettings() {
    try {
      const [rows] = await db.execute('SELECT * FROM cart_upsell_settings WHERE setting_id = 1 LIMIT 1');
      return rows[0] || DEFAULT_SETTINGS;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') return DEFAULT_SETTINGS;
      throw err;
    }
  }

  static async saveSettings(payload) {
    const settings = normalizeSettings(payload);
    await db.execute(
      `INSERT INTO cart_upsell_settings
        (setting_id, is_enabled, bundle_discount_min, bundle_discount_max, course_discount_percent, max_suggestions)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        is_enabled = VALUES(is_enabled),
        bundle_discount_min = VALUES(bundle_discount_min),
        bundle_discount_max = VALUES(bundle_discount_max),
        course_discount_percent = VALUES(course_discount_percent),
        max_suggestions = VALUES(max_suggestions),
        updated_at = CURRENT_TIMESTAMP`,
      [
        settings.is_enabled,
        settings.bundle_discount_min,
        settings.bundle_discount_max,
        settings.course_discount_percent,
        settings.max_suggestions,
      ]
    );
    return this.getSettings();
  }

  static pickBundleDiscount(bundleId, settings) {
    const min = Number(settings.bundle_discount_min || 5);
    const max = Number(settings.bundle_discount_max || min);
    if (max <= min) return min;
    const span = max - min + 1;
    return min + (Number(bundleId || 0) % span);
  }

  static discountPrice(price, discountPercent) {
    const original = Math.round(Number(price || 0));
    const percent = clampPercent(discountPercent, 1);
    return Math.max(0, Math.round(original * (1 - percent / 100)));
  }

  static async getSuggestions(userId) {
    const settings = await this.getSettings();
    if (!settings.is_enabled) return { settings, bundles: [], courses: [] };

    const [cartItems, cartBundles, purchasedIds] = await Promise.all([
      Cart.getUserCart(userId),
      CourseBundle.getCartBundles(userId),
      Course.getUserCourses(userId).catch(() => []),
    ]);

    const cartCourseIds = new Set(cartItems.map((item) => String(item.course_id)));
    const purchasedCourseIds = new Set(purchasedIds.map((item) => String(item.course_id)));
    const cartBundleIds = new Set(cartBundles.map((bundle) => Number(bundle.bundle_id)));
    const categorySet = new Set(cartItems.map((item) => item.category).filter(Boolean));
    for (const bundle of cartBundles) {
      for (const item of bundle.items || []) {
        if (item.category) categorySet.add(item.category);
        cartCourseIds.add(String(item.course_id));
      }
    }

    const max = Number(settings.max_suggestions || 3);
    const bundles = [];
    if (cartBundles.length > 0) {
      const allBundles = await CourseBundle.getAll();
      for (const bundle of allBundles) {
        if (cartBundleIds.has(Number(bundle.bundle_id))) continue;
        const discountPercent = this.pickBundleDiscount(bundle.bundle_id, settings);
        bundles.push({
          ...bundle,
          suggestion_type: 'bundle',
          upsell_discount_percent: discountPercent,
          upsell_price: this.discountPrice(bundle.bundle_price, discountPercent),
        });
        if (bundles.length >= max) break;
      }
    }

    const courses = [];
    if (categorySet.size > 0) {
      const allCourses = await Course.getAll();
      for (const course of allCourses) {
        if (!categorySet.has(course.category)) continue;
        if (cartCourseIds.has(String(course.course_id))) continue;
        if (purchasedCourseIds.has(String(course.course_id))) continue;
        const discountPercent = Number(settings.course_discount_percent || 5);
        courses.push({
          ...course,
          suggestion_type: 'course',
          upsell_discount_percent: discountPercent,
          upsell_price: this.discountPrice(course.price, discountPercent),
        });
        if (courses.length >= max) break;
      }
    }

    return { settings, bundles, courses };
  }

  static async markApplied(userId, itemType, itemId, discountPercent) {
    const type = String(itemType || '').trim();
    if (!['course', 'bundle'].includes(type)) {
      const err = new Error('Loai goi y khong hop le');
      err.status = 400;
      throw err;
    }

    await db.execute(
      `INSERT INTO cart_upsell_discounts (user_id, item_type, item_id, discount_percent)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         discount_percent = VALUES(discount_percent),
         created_at = CURRENT_TIMESTAMP`,
      [userId, type, String(itemId), clampPercent(discountPercent, 5)]
    );
  }

  static async addSuggestionToCart(userId, itemType, itemId) {
    const suggestions = await this.getSuggestions(userId);
    const type = String(itemType || '').trim();
    const list = type === 'bundle' ? suggestions.bundles : suggestions.courses;
    const suggestion = list.find((item) =>
      String(type === 'bundle' ? item.bundle_id : item.course_id) === String(itemId)
    );

    if (!suggestion) {
      const err = new Error('Goi y khong con kha dung');
      err.status = 404;
      throw err;
    }

    if (type === 'bundle') {
      await CourseBundle.addToCart(userId, suggestion.bundle_id);
      await this.markApplied(userId, 'bundle', suggestion.bundle_id, suggestion.upsell_discount_percent);
    } else {
      await Cart.addToCartIgnore(userId, suggestion.course_id);
      await this.markApplied(userId, 'course', suggestion.course_id, suggestion.upsell_discount_percent);
    }

    return suggestion;
  }

  static async getAppliedMap(userId) {
    try {
      const [rows] = await db.execute(
        'SELECT item_type, item_id, discount_percent FROM cart_upsell_discounts WHERE user_id = ?',
        [userId]
      );
      return new Map(rows.map((row) => [itemKey(row.item_type, row.item_id), Number(row.discount_percent || 0)]));
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') return new Map();
      throw err;
    }
  }

  static async applyDiscounts(userId, courses, bundles) {
    const applied = await this.getAppliedMap(userId);
    const discountedCourses = courses.map((course) => {
      const percent = applied.get(itemKey('course', course.course_id));
      if (!percent) return course;
      const originalPrice = Number(course.price || 0);
      return {
        ...course,
        original_price: originalPrice,
        price: this.discountPrice(originalPrice, percent),
        upsell_discount_percent: percent,
      };
    });

    const discountedBundles = bundles.map((bundle) => {
      const percent = applied.get(itemKey('bundle', bundle.bundle_id));
      if (!percent) return bundle;
      const originalPrice = Number(bundle.bundle_price || 0);
      return {
        ...bundle,
        upsell_original_price: originalPrice,
        bundle_price: this.discountPrice(originalPrice, percent),
        upsell_discount_percent: percent,
      };
    });

    return { courses: discountedCourses, bundles: discountedBundles };
  }

  static async clearItem(userId, itemType, itemId) {
    await db.execute(
      'DELETE FROM cart_upsell_discounts WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, String(itemId)]
    );
  }

  static async clearUser(userId, conn = db) {
    await conn.execute('DELETE FROM cart_upsell_discounts WHERE user_id = ?', [userId]);
  }
}

module.exports = CartUpsell;
