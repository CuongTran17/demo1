const db = require('../config/database');

class Lesson {
  static async getByCourseId(courseId) {
    const [rows] = await db.execute(
      'SELECT * FROM lessons WHERE course_id = ? AND is_active = 1 ORDER BY section_id, lesson_order',
      [courseId]
    );
    return rows;
  }

  static async getById(lessonId) {
    const [rows] = await db.execute('SELECT * FROM lessons WHERE lesson_id = ?', [lessonId]);
    return rows[0] || null;
  }

  static async getBySection(courseId, sectionId) {
    const [rows] = await db.execute(
      'SELECT * FROM lessons WHERE course_id = ? AND section_id = ? AND is_active = 1 ORDER BY lesson_order',
      [courseId, sectionId]
    );
    return rows;
  }

  static async create(lesson) {
    const { course_id, section_id, lesson_title, lesson_content, video_url, duration, lesson_order } = lesson;
    const [result] = await db.execute(
      `INSERT INTO lessons (course_id, section_id, lesson_title, lesson_content, video_url, duration, lesson_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [course_id, section_id, lesson_title, lesson_content || null, video_url, duration || 0, lesson_order || 1]
    );
    return result.insertId;
  }

  static async update(lessonId, lessonData) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(lessonData)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    fields.push('updated_at = NOW()');
    values.push(lessonId);
    await db.execute(`UPDATE lessons SET ${fields.join(', ')} WHERE lesson_id = ?`, values);
  }

  static async delete(lessonId) {
    // Soft delete
    await db.execute('UPDATE lessons SET is_active = 0 WHERE lesson_id = ?', [lessonId]);
  }

  static async getNextOrder(courseId, sectionId) {
    const [rows] = await db.execute(
      'SELECT COALESCE(MAX(lesson_order), 0) + 1 as next_order FROM lessons WHERE course_id = ? AND section_id = ?',
      [courseId, sectionId]
    );
    return rows[0].next_order;
  }

  // ============ Progress ============

  static async getCompletedLessons(userId, courseId) {
    const [rows] = await db.execute(
      'SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = 1',
      [userId, courseId]
    );
    return rows.map(r => r.lesson_id);
  }

  static async markComplete(userId, courseId, lessonId) {
    await db.execute(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed, completed_at) 
       VALUES (?, ?, ?, 1, NOW()) 
       ON DUPLICATE KEY UPDATE completed = 1, completed_at = NOW()`,
      [userId, courseId, lessonId]
    );
    await Lesson.updateCourseProgress(userId, courseId);
  }

  static async resetProgress(userId, courseId, lessonId) {
    await db.execute(
      `UPDATE lesson_progress SET completed = 0, completed_at = NULL 
       WHERE user_id = ? AND course_id = ? AND lesson_id = ?`,
      [userId, courseId, lessonId]
    );
    await Lesson.updateCourseProgress(userId, courseId);
  }

  static async updateCourseProgress(userId, courseId) {
    const [totalRows] = await db.execute(
      'SELECT COUNT(*) as total FROM lessons WHERE course_id = ? AND is_active = 1',
      [courseId]
    );
    const [completedRows] = await db.execute(
      'SELECT COUNT(*) as completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = 1',
      [userId, courseId]
    );
    const [hoursRows] = await db.execute(
      `SELECT COALESCE(SUM(l.duration), 0) as total_hours 
       FROM lesson_progress lp 
       JOIN lessons l ON lp.lesson_id = l.lesson_id 
       WHERE lp.user_id = ? AND lp.course_id = ? AND lp.completed = 1`,
      [userId, courseId]
    );

    const total = totalRows[0].total;
    const completed = completedRows[0].completed;
    const totalHours = hoursRows[0].total_hours;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const status = percentage === 100 ? 'completed' : 'in_progress';

    await db.execute(
      `UPDATE course_progress SET progress_percentage = ?, total_hours = ?, status = ? 
       WHERE user_id = ? AND course_id = ?`,
      [percentage, totalHours, status, userId, courseId]
    );
  }
}

module.exports = Lesson;
