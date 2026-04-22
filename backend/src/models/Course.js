const db = require('../config/database');

class Course {
  static async getAll() {
    const [rows] = await db.execute(
      `SELECT c.*,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
         COUNT(r.review_id) AS review_count
       FROM courses c
       LEFT JOIN reviews r ON r.course_id = c.course_id
       GROUP BY c.course_id
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  static async getByCategory(category) {
    const [rows] = await db.execute(
      `SELECT c.*,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
         COUNT(r.review_id) AS review_count
       FROM courses c
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE c.category = ?
       GROUP BY c.course_id
       ORDER BY c.created_at DESC`,
      [category]
    );
    return rows;
  }

  static async getById(courseId) {
    const [rows] = await db.execute(
      `SELECT c.*,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
         COUNT(r.review_id) AS review_count
       FROM courses c
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE c.course_id = ?
       GROUP BY c.course_id`,
      [courseId]
    );
    return rows[0] || null;
  }

  static async getUserCourses(userId) {
    const [rows] = await db.execute(
      `SELECT c.*, cp.progress_percentage, cp.total_hours, cp.status as progress_status,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
         COUNT(r.review_id) AS review_count
       FROM user_courses uc
       JOIN courses c ON uc.course_id = c.course_id
       LEFT JOIN course_progress cp ON cp.user_id = uc.user_id AND cp.course_id = uc.course_id
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE uc.user_id = ?
       GROUP BY c.course_id, cp.progress_percentage, cp.total_hours, cp.status
       ORDER BY uc.purchased_at DESC`,
      [userId]
    );
    return rows;
  }

  static async hasUserPurchased(userId, courseId) {
    const [rows] = await db.execute(
      'SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return rows.length > 0;
  }

  static async search({ keyword, category, priceRange, sortBy }) {
    let sql = `SELECT c.*,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
         COUNT(r.review_id) AS review_count
       FROM courses c
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE 1=1`;
    const params = [];

    if (keyword) {
      sql += ' AND (c.course_name LIKE ? OR c.description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category && category !== 'all') {
      sql += ' AND c.category = ?';
      params.push(category);
    }
    if (priceRange) {
      switch (priceRange) {
        case 'free': sql += ' AND c.price = 0'; break;
        case 'under500': sql += ' AND c.price < 500000'; break;
        case '500to1000': sql += ' AND c.price >= 500000 AND c.price <= 1000000'; break;
        case 'over1000': sql += ' AND c.price > 1000000'; break;
      }
    }

    sql += ' GROUP BY c.course_id';

    switch (sortBy) {
      case 'price_asc': sql += ' ORDER BY c.price ASC'; break;
      case 'price_desc': sql += ' ORDER BY c.price DESC'; break;
      case 'name': sql += ' ORDER BY c.course_name ASC'; break;
      case 'popular': sql += ' ORDER BY c.students_count DESC'; break;
      default: sql += ' ORDER BY c.created_at DESC';
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  static async create(courseData) {
    const {
      course_id, course_name, category, description, price, old_price,
      duration, level, thumbnail, is_new, discount_percentage
    } = courseData;
    await db.execute(
      `INSERT INTO courses (course_id, course_name, category, description, price, old_price,
       duration, level, thumbnail, is_new, discount_percentage) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, course_name, category, description, price, old_price || null,
       duration, level || 'Cơ bản', thumbnail, is_new || 0, discount_percentage || 0]
    );
  }

  static async update(courseId, courseData) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(courseData)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(courseId);
    await db.execute(`UPDATE courses SET ${fields.join(', ')} WHERE course_id = ?`, values);
  }

  static async delete(courseId) {
    await db.execute('DELETE FROM courses WHERE course_id = ?', [courseId]);
  }

  // Teacher-course assignment
  static async assignTeacher(teacherId, courseId) {
    await db.execute(
      'INSERT IGNORE INTO teacher_courses (teacher_id, course_id) VALUES (?, ?)',
      [teacherId, courseId]
    );
  }

  static async removeTeacher(teacherId, courseId) {
    await db.execute(
      'DELETE FROM teacher_courses WHERE teacher_id = ? AND course_id = ?',
      [teacherId, courseId]
    );
  }

  static async getTeacherCourses(teacherId) {
    const [rows] = await db.execute(
      `SELECT c.* FROM teacher_courses tc 
       JOIN courses c ON tc.course_id = c.course_id 
       WHERE tc.teacher_id = ?`,
      [teacherId]
    );
    return rows;
  }

  static async getCategories() {
    return ['python', 'finance', 'data', 'blockchain', 'accounting', 'marketing'];
  }
}

module.exports = Course;
