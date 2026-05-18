const db = require('../config/database');

const ABANDONED_CART_HOURS = 24;
const ABANDONED_CART_WINDOW_HOURS = 48;

function formatVnd(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')} VND`;
}

class Notification {
  static buildAbandonedCartDedupeKey(userId, items) {
    const courseIds = [...new Set(
      items.map((item) => String(item.course_id || '').trim()).filter(Boolean)
    )].sort();
    return `abandoned_cart:${userId}:${courseIds.join(',')}`;
  }

  static buildAbandonedCartMessage(items) {
    const count = items.length;
    const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    return `Ban con ${count} khoa hoc trong gio hang voi tong gia tri ${formatVnd(total)}. Quay lai gio hang de hoan tat dang ky.`;
  }

  static async getByUser(userId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    return rows;
  }

  static async getUnreadCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }

  static async markRead(userId, notificationId) {
    await db.execute(
      `UPDATE notifications
       SET is_read = 1, read_at = COALESCE(read_at, NOW())
       WHERE user_id = ? AND notification_id = ?`,
      [userId, notificationId]
    );
  }

  static async markAllRead(userId) {
    await db.execute(
      `UPDATE notifications
       SET is_read = 1, read_at = COALESCE(read_at, NOW())
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
  }

  static async createIfNotExists({ userId, type, title, message, actionUrl, dedupeKey }) {
    await db.execute(
      `INSERT IGNORE INTO notifications
        (user_id, type, title, message, action_url, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, actionUrl || null, dedupeKey || null]
    );
  }

  static async checkAbandonedCart(userId) {
    const [items] = await db.execute(
      `SELECT c.course_id, c.course_name, c.price, cart.added_at
       FROM cart
       JOIN courses c ON c.course_id = cart.course_id
       WHERE cart.user_id = ?
         AND cart.added_at <= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY cart.added_at ASC`,
      [userId, ABANDONED_CART_HOURS]
    );

    if (!items.length) return { created: false, count: 0 };

    const dedupeKey = this.buildAbandonedCartDedupeKey(userId, items);
    const [recent] = await db.execute(
      `SELECT notification_id
       FROM notifications
       WHERE user_id = ?
         AND type = 'abandoned_cart'
         AND dedupe_key = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       LIMIT 1`,
      [userId, dedupeKey, ABANDONED_CART_WINDOW_HOURS]
    );

    if (recent.length) return { created: false, count: items.length };

    await this.createIfNotExists({
      userId,
      type: 'abandoned_cart',
      title: 'Ban con khoa hoc trong gio hang',
      message: this.buildAbandonedCartMessage(items),
      actionUrl: '/cart',
      dedupeKey,
    });

    return { created: true, count: items.length };
  }
}

module.exports = Notification;
