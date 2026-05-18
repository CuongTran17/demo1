const db = require('../config/database');

function normalizeMoney(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

class CourseBundle {
  static allocateBundlePrice(items, bundlePrice) {
    const normalizedItems = items.map((item, index) => ({
      ...item,
      index,
      price: normalizeMoney(item.price),
    }));
    const target = normalizeMoney(bundlePrice);

    if (!normalizedItems.length) return [];
    if (target <= 0) {
      return normalizedItems.map(({ index, ...item }) => ({ ...item, bundle_item_price: 0 }));
    }

    const sourceTotal = normalizedItems.reduce((sum, item) => sum + item.price, 0);
    const pricedItems = normalizedItems.map((item) => {
      const exact = sourceTotal > 0
        ? (target * item.price) / sourceTotal
        : target / normalizedItems.length;
      const base = Math.floor(exact);
      return { ...item, exact, bundle_item_price: base, fraction: exact - base };
    });

    let remaining = target - pricedItems.reduce((sum, item) => sum + item.bundle_item_price, 0);
    const byFraction = [...pricedItems].sort((left, right) => {
      if (right.fraction !== left.fraction) return right.fraction - left.fraction;
      return left.index - right.index;
    });

    for (let i = 0; i < byFraction.length && remaining > 0; i += 1) {
      byFraction[i].bundle_item_price += 1;
      remaining -= 1;
      if (i === byFraction.length - 1 && remaining > 0) i = -1;
    }

    return pricedItems
      .sort((left, right) => left.index - right.index)
      .map(({ index, exact, fraction, ...item }) => item);
  }

  static async getAll({ includeInactive = false } = {}) {
    const [bundles] = await db.execute(
      `SELECT *
       FROM course_bundles
       ${includeInactive ? '' : 'WHERE is_active = 1'}
       ORDER BY created_at DESC`
    );
    return this.attachItems(bundles);
  }

  static async getById(bundleId, { includeInactive = false } = {}) {
    const [rows] = await db.execute(
      `SELECT *
       FROM course_bundles
       WHERE bundle_id = ? ${includeInactive ? '' : 'AND is_active = 1'}
       LIMIT 1`,
      [bundleId]
    );
    const bundles = await this.attachItems(rows);
    return bundles[0] || null;
  }

  static async attachItems(bundles) {
    if (!bundles.length) return [];
    const ids = bundles.map((bundle) => bundle.bundle_id);
    const placeholders = ids.map(() => '?').join(', ');
    const [items] = await db.execute(
      `SELECT cbi.bundle_id, cbi.sort_order, c.*
       FROM course_bundle_items cbi
       JOIN courses c ON c.course_id = cbi.course_id
       WHERE cbi.bundle_id IN (${placeholders})
       ORDER BY cbi.sort_order ASC, c.course_name ASC`,
      ids
    );
    const byBundle = new Map();
    for (const item of items) {
      if (!byBundle.has(item.bundle_id)) byBundle.set(item.bundle_id, []);
      byBundle.get(item.bundle_id).push(item);
    }
    return bundles.map((bundle) => ({
      ...bundle,
      items: byBundle.get(bundle.bundle_id) || [],
    }));
  }

  static async create(data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const originalPrice = normalizeMoney(data.originalPrice);
      const [result] = await conn.execute(
        `INSERT INTO course_bundles
          (bundle_name, description, thumbnail, bundle_price, original_price, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          String(data.bundleName || '').trim(),
          data.description || null,
          data.thumbnail || null,
          normalizeMoney(data.bundlePrice),
          originalPrice,
          data.isActive === false ? 0 : 1,
        ]
      );
      const bundleId = result.insertId;
      await this.replaceItemsWithinTransaction(conn, bundleId, data.courseIds || []);
      await conn.commit();
      return bundleId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async update(bundleId, data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE course_bundles
         SET bundle_name = ?, description = ?, thumbnail = ?, bundle_price = ?, original_price = ?, is_active = ?
         WHERE bundle_id = ?`,
        [
          String(data.bundleName || '').trim(),
          data.description || null,
          data.thumbnail || null,
          normalizeMoney(data.bundlePrice),
          normalizeMoney(data.originalPrice),
          data.isActive === false ? 0 : 1,
          bundleId,
        ]
      );
      await this.replaceItemsWithinTransaction(conn, bundleId, data.courseIds || []);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async replaceItemsWithinTransaction(conn, bundleId, courseIds) {
    await conn.execute('DELETE FROM course_bundle_items WHERE bundle_id = ?', [bundleId]);
    const uniqueIds = [...new Set(courseIds.map((id) => String(id || '').trim()).filter(Boolean))];
    for (let index = 0; index < uniqueIds.length; index += 1) {
      await conn.execute(
        'INSERT INTO course_bundle_items (bundle_id, course_id, sort_order) VALUES (?, ?, ?)',
        [bundleId, uniqueIds[index], index]
      );
    }
  }

  static async delete(bundleId) {
    const [result] = await db.execute('DELETE FROM course_bundles WHERE bundle_id = ?', [bundleId]);
    return result.affectedRows > 0;
  }

  static async addToCart(userId, bundleId) {
    const bundle = await this.getById(bundleId);
    if (!bundle) {
      const err = new Error('Combo khong ton tai hoac dang bi an');
      err.status = 404;
      throw err;
    }
    if (!bundle.items.length) {
      const err = new Error('Combo chua co khoa hoc');
      err.status = 400;
      throw err;
    }
    await db.execute(
      'INSERT IGNORE INTO cart_bundles (user_id, bundle_id) VALUES (?, ?)',
      [userId, bundleId]
    );
    return bundle;
  }

  static async getCartBundles(userId) {
    const [bundles] = await db.execute(
      `SELECT cb.*, cart_bundles.cart_bundle_id, cart_bundles.added_at
       FROM cart_bundles
       JOIN course_bundles cb ON cb.bundle_id = cart_bundles.bundle_id
       WHERE cart_bundles.user_id = ? AND cb.is_active = 1
       ORDER BY cart_bundles.added_at DESC`,
      [userId]
    );
    return this.attachItems(bundles);
  }

  static async removeFromCart(userId, bundleId) {
    await db.execute(
      'DELETE FROM cart_bundles WHERE user_id = ? AND bundle_id = ?',
      [userId, bundleId]
    );
  }

  static async clearCart(userId, conn = db) {
    await conn.execute('DELETE FROM cart_bundles WHERE user_id = ?', [userId]);
  }
}

module.exports = CourseBundle;
