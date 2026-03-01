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

  // ============ Video Tracking ============

  /* ── helpers for merging watched segments ── */
  static _mergeSegments(existing, incoming) {
    const all = [...existing, ...incoming].sort((a, b) => a[0] - b[0]);
    if (all.length === 0) return [];
    const merged = [all[0]];
    for (let i = 1; i < all.length; i++) {
      const last = merged[merged.length - 1];
      if (all[i][0] <= last[1] + 1) {
        last[1] = Math.max(last[1], all[i][1]);
      } else {
        merged.push(all[i]);
      }
    }
    return merged;
  }

  static _coveredSeconds(segments) {
    let total = 0;
    for (const [s, e] of segments) total += (e - s);
    return total;
  }

  static async updateVideoProgress(userId, courseId, lessonId, newSegments, duration, lastPosition) {
    const cid = String(courseId);
    const lid = String(lessonId);

    // Fetch existing segments
    const [rows] = await db.execute(
      `SELECT watched_segments FROM lesson_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?`,
      [userId, cid, lid]
    );
    let existing = [];
    if (rows.length && rows[0].watched_segments) {
      try { existing = JSON.parse(rows[0].watched_segments); } catch {}
    }

    // Merge
    const merged = Lesson._mergeSegments(existing, newSegments || []);
    const covered = Lesson._coveredSeconds(merged);
    const pct = duration > 0 ? Math.min(100, Math.round((covered / duration) * 100)) : 0;
    const segJson = JSON.stringify(merged);

    // Upsert
    await db.execute(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed, video_watched_percent, last_position, watched_segments)
       VALUES (?, ?, ?, 0, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         video_watched_percent = ?,
         last_position = ?,
         watched_segments = ?`,
      [userId, cid, lid, pct, lastPosition, segJson, pct, lastPosition, segJson]
    );

    // Auto-complete if truly watched >= 100%
    let autoCompleted = false;
    if (pct >= 100) {
      const [upd] = await db.execute(
        `UPDATE lesson_progress SET completed = 1, completed_at = NOW()
         WHERE user_id = ? AND course_id = ? AND lesson_id = ? AND completed = 0`,
        [userId, cid, lid]
      );
      if (upd.affectedRows > 0) {
        autoCompleted = true;
        await Lesson.updateCourseProgress(userId, cid);
      }
    }
    return { pct, autoCompleted, segments: merged };
  }

  static async getVideoProgress(userId, courseId) {
    const [rows] = await db.execute(
      `SELECT lesson_id, video_watched_percent, last_position, completed, completed_at, watched_segments
       FROM lesson_progress
       WHERE user_id = ? AND course_id = ?`,
      [userId, String(courseId)]
    );
    return rows;
  }

  static async getVideoProgressByLesson(userId, courseId, lessonId) {
    const [rows] = await db.execute(
      `SELECT video_watched_percent, last_position, completed, watched_segments
       FROM lesson_progress
       WHERE user_id = ? AND course_id = ? AND lesson_id = ?`,
      [userId, String(courseId), String(lessonId)]
    );
    return rows[0] || { video_watched_percent: 0, last_position: 0, completed: false, watched_segments: null };
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
