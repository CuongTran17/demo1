const db = require('../config/database');

class Wishlist {
  static async getByUser(userId) {
    const [rows] = await db.execute(
      `SELECT c.*,
              w.wishlist_id,
              w.created_at AS wished_at,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
              COUNT(r.review_id) AS review_count
       FROM wishlist w
       JOIN courses c ON c.course_id = w.course_id
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE w.user_id = ?
       GROUP BY c.course_id, w.wishlist_id, w.created_at
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getIdsByUser(userId) {
    const [rows] = await db.execute(
      'SELECT course_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows.map((row) => row.course_id);
  }

  static async add(userId, courseId) {
    await db.execute(
      'INSERT IGNORE INTO wishlist (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );
  }

  static async remove(userId, courseId) {
    const [result] = await db.execute(
      'DELETE FROM wishlist WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return result.affectedRows > 0;
  }

  static async count(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS count FROM wishlist WHERE user_id = ?',
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }
}

module.exports = Wishlist;
