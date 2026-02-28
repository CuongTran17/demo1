const db = require('../config/database');

class PendingChange {
  static async create(teacherId, changeType, targetId, changeData) {
    const [result] = await db.execute(
      `INSERT INTO pending_changes (table_name, target_id, change_type, change_data, requested_by, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [changeType.includes('lesson') ? 'lessons' : 'courses', targetId, changeType, JSON.stringify(changeData), teacherId]
    );
    return result.insertId;
  }

  static async getAll() {
    const [rows] = await db.execute(
      `SELECT pc.*, u.fullname as teacher_name, u.email as teacher_email
       FROM pending_changes pc 
       JOIN users u ON pc.requested_by = u.user_id 
       WHERE pc.status = 'pending'
       ORDER BY pc.requested_at DESC`
    );
    return rows.map(r => ({ ...r, change_data: typeof r.change_data === 'string' ? JSON.parse(r.change_data || '{}') : (r.change_data || {}) }));
  }

  static async getByTeacher(teacherId) {
    const [rows] = await db.execute(
      `SELECT * FROM pending_changes WHERE requested_by = ? ORDER BY requested_at DESC`,
      [teacherId]
    );
    return rows.map(r => ({ ...r, change_data: typeof r.change_data === 'string' ? JSON.parse(r.change_data || '{}') : (r.change_data || {}) }));
  }

  static async getById(changeId) {
    const [rows] = await db.execute('SELECT * FROM pending_changes WHERE change_id = ?', [changeId]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return { ...r, change_data: typeof r.change_data === 'string' ? JSON.parse(r.change_data || '{}') : (r.change_data || {}) };
  }

  static async approve(changeId, adminId, note) {
    const change = await PendingChange.getById(changeId);
    if (!change) throw new Error('Change not found');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Apply the change
      const data = change.change_data;
      const changeType = change.change_type;

      if (changeType === 'create_course') {
        await conn.execute(
          `INSERT INTO courses (course_id, course_name, category, description, price, old_price, duration, level, thumbnail, is_new, discount_percentage) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.course_id, data.course_name, data.category, data.description, data.price,
           data.old_price, data.duration, data.level, data.thumbnail, data.is_new || 0, data.discount_percentage || 0]
        );
      } else if (changeType === 'update_course') {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'course_id' && value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
        if (fields.length > 0) {
          values.push(change.target_id);
          await conn.execute(`UPDATE courses SET ${fields.join(', ')} WHERE course_id = ?`, values);
        }
      } else if (changeType === 'delete_course') {
        await conn.execute('DELETE FROM courses WHERE course_id = ?', [change.target_id]);
      } else if (changeType === 'create_lesson') {
        await conn.execute(
          `INSERT INTO lessons (course_id, section_id, lesson_title, lesson_content, video_url, duration, lesson_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [data.course_id, data.section_id, data.lesson_title, data.lesson_content, data.video_url, data.duration, data.lesson_order]
        );
      } else if (changeType === 'update_lesson') {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'lesson_id' && value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
        if (fields.length > 0) {
          values.push(change.target_id);
          await conn.execute(`UPDATE lessons SET ${fields.join(', ')} WHERE lesson_id = ?`, values);
        }
      } else if (changeType === 'delete_lesson') {
        await conn.execute('UPDATE lessons SET is_active = 0 WHERE lesson_id = ?', [change.target_id]);
      }

      // Update change status
      await conn.execute(
        `UPDATE pending_changes SET status = 'approved', reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE change_id = ?`,
        [adminId, note, changeId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async reject(changeId, adminId, note) {
    await db.execute(
      `UPDATE pending_changes SET status = 'rejected', reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE change_id = ?`,
      [adminId, note, changeId]
    );
  }

  static async countPending() {
    const [rows] = await db.execute("SELECT COUNT(*) as count FROM pending_changes WHERE status = 'pending'");
    return rows[0].count;
  }

  static async getReviewed() {
    const [rows] = await db.execute(
      `SELECT pc.*, u.fullname as teacher_name, r.fullname as reviewer_name
       FROM pending_changes pc 
       JOIN users u ON pc.requested_by = u.user_id 
       LEFT JOIN users r ON pc.reviewed_by = r.user_id
       WHERE pc.status != 'pending'
       ORDER BY pc.reviewed_at DESC`
    );
    return rows.map(r => ({ ...r, change_data: typeof r.change_data === 'string' ? JSON.parse(r.change_data || '{}') : (r.change_data || {}) }));
  }
}

module.exports = PendingChange;
