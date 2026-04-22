const db = require('../config/database');

class Certificate {
  // Issue certificate — idempotent (INSERT IGNORE)
  static async issue(userId, courseId) {
    const [result] = await db.execute(
      'INSERT IGNORE INTO certificates (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );
    return result.insertId || null;
  }

  static async getByUserAndCourse(userId, courseId) {
    const [rows] = await db.execute(
      'SELECT * FROM certificates WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return rows[0] || null;
  }

  // Student: list all own certificates with course info
  static async getByUser(userId) {
    const [rows] = await db.execute(
      `SELECT cert.cert_id, cert.issued_at,
              c.course_id, c.course_name, c.category, c.thumbnail
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.course_id
       WHERE cert.user_id = ?
       ORDER BY cert.issued_at DESC`,
      [userId]
    );
    return rows;
  }

  // Admin: all certs for a course with student info
  static async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT cert.cert_id, cert.issued_at,
              u.user_id, u.fullname, u.email
       FROM certificates cert
       JOIN users u ON cert.user_id = u.user_id
       WHERE cert.course_id = ?
       ORDER BY cert.issued_at DESC`,
      [courseId]
    );
    return rows;
  }

  // Admin: summary — each course with its certificate count
  static async getCourseSummary() {
    const [rows] = await db.execute(
      `SELECT c.course_id, c.course_name, c.category,
              COUNT(cert.cert_id) AS cert_count
       FROM courses c
       LEFT JOIN certificates cert ON cert.course_id = c.course_id
       GROUP BY c.course_id, c.course_name, c.category
       HAVING cert_count > 0
       ORDER BY cert_count DESC`
    );
    return rows;
  }
}

module.exports = Certificate;
