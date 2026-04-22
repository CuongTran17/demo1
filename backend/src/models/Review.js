const db = require('../config/database');

class Review {
  static async create(userId, courseId, rating, title, content) {
    const [result] = await db.execute(
      'INSERT INTO reviews (user_id, course_id, rating, title, content) VALUES (?, ?, ?, ?, ?)',
      [userId, courseId, rating, title || null, content || null]
    );
    return result.insertId;
  }

  static async update(reviewId, userId, rating, title, content) {
    const [result] = await db.execute(
      'UPDATE reviews SET rating = ?, title = ?, content = ?, updated_at = NOW() WHERE review_id = ? AND user_id = ?',
      [rating, title || null, content || null, reviewId, userId]
    );
    return result.affectedRows > 0;
  }

  static async deleteById(reviewId, userId, isAdmin = false) {
    let sql, params;
    if (isAdmin) {
      sql = 'DELETE FROM reviews WHERE review_id = ?';
      params = [reviewId];
    } else {
      sql = 'DELETE FROM reviews WHERE review_id = ? AND user_id = ?';
      params = [reviewId, userId];
    }
    const [result] = await db.execute(sql, params);
    return result.affectedRows > 0;
  }

  static async getByCourse(courseId, page = 1, limit = 10) {
    const safeLimit = Math.max(1, parseInt(limit) || 10);
    const safeOffset = Math.max(0, (parseInt(page) - 1) * safeLimit);
    const [rows] = await db.execute(
      `SELECT r.review_id, r.user_id, r.course_id, r.rating, r.title, r.content,
              r.created_at, r.updated_at, u.fullname,
              r.reply_content, r.reply_user_id, r.reply_created_at,
              ru.fullname AS replier_name
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN users ru ON r.reply_user_id = ru.user_id
       WHERE r.course_id = ?
       ORDER BY r.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [courseId]
    );
    return rows;
  }

  static async reply(reviewId, userId, content) {
    const [result] = await db.execute(
      `UPDATE reviews
       SET reply_content = ?, reply_user_id = ?, reply_created_at = NOW()
       WHERE review_id = ?`,
      [content || null, userId, reviewId]
    );
    return result.affectedRows > 0;
  }

  static async getUserReview(userId, courseId) {
    const [rows] = await db.execute(
      'SELECT * FROM reviews WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return rows[0] || null;
  }

  static async getSummary(courseId) {
    const [rows] = await db.execute(
      `SELECT
         COUNT(*)                   AS total,
         ROUND(AVG(rating), 1)      AS average,
         SUM(rating = 5)            AS five_star,
         SUM(rating = 4)            AS four_star,
         SUM(rating = 3)            AS three_star,
         SUM(rating = 2)            AS two_star,
         SUM(rating = 1)            AS one_star
       FROM reviews WHERE course_id = ?`,
      [courseId]
    );
    return rows[0];
  }

  static async getById(reviewId) {
    const [rows] = await db.execute('SELECT * FROM reviews WHERE review_id = ?', [reviewId]);
    return rows[0] || null;
  }
}

module.exports = Review;
