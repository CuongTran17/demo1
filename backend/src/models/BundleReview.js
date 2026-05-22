const db = require('../config/database');

class BundleReview {
  static async create(userId, bundleId, rating, title, content) {
    const [result] = await db.execute(
      'INSERT INTO bundle_reviews (user_id, bundle_id, rating, title, content) VALUES (?, ?, ?, ?, ?)',
      [userId, bundleId, rating, title || null, content || null]
    );
    return result.insertId;
  }

  static async update(reviewId, userId, rating, title, content) {
    const [result] = await db.execute(
      'UPDATE bundle_reviews SET rating = ?, title = ?, content = ?, updated_at = NOW() WHERE review_id = ? AND user_id = ?',
      [rating, title || null, content || null, reviewId, userId]
    );
    return result.affectedRows > 0;
  }

  static async deleteById(reviewId, userId, isAdmin = false) {
    const sql = isAdmin
      ? 'DELETE FROM bundle_reviews WHERE review_id = ?'
      : 'DELETE FROM bundle_reviews WHERE review_id = ? AND user_id = ?';
    const params = isAdmin ? [reviewId] : [reviewId, userId];
    const [result] = await db.execute(sql, params);
    return result.affectedRows > 0;
  }

  static async getByBundle(bundleId, page = 1, limit = 10) {
    const safeLimit = Math.max(1, parseInt(limit) || 10);
    const safeOffset = Math.max(0, (parseInt(page) - 1) * safeLimit);
    const [rows] = await db.execute(
      `SELECT br.review_id, br.user_id, br.bundle_id, br.rating, br.title, br.content,
              br.created_at, br.updated_at, u.fullname
       FROM bundle_reviews br
       JOIN users u ON br.user_id = u.user_id
       WHERE br.bundle_id = ?
       ORDER BY br.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [bundleId]
    );
    return rows;
  }

  static async getUserReview(userId, bundleId) {
    const [rows] = await db.execute(
      'SELECT * FROM bundle_reviews WHERE user_id = ? AND bundle_id = ?',
      [userId, bundleId]
    );
    return rows[0] || null;
  }

  static async getSummary(bundleId) {
    const [rows] = await db.execute(
      `SELECT
         COUNT(*)              AS total,
         ROUND(AVG(rating), 1) AS average,
         SUM(rating = 5)       AS five_star,
         SUM(rating = 4)       AS four_star,
         SUM(rating = 3)       AS three_star,
         SUM(rating = 2)       AS two_star,
         SUM(rating = 1)       AS one_star
       FROM bundle_reviews WHERE bundle_id = ?`,
      [bundleId]
    );
    return rows[0];
  }

  static async getById(reviewId) {
    const [rows] = await db.execute('SELECT * FROM bundle_reviews WHERE review_id = ?', [reviewId]);
    return rows[0] || null;
  }
}

module.exports = BundleReview;
