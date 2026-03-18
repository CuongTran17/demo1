const db = require('../config/database');

class PendingChange {
  static _sqlValue(value, fallback = null) {
    return value === undefined ? fallback : value;
  }

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
    return rows.map(r => ({ ...r, change_data: PendingChange._safeParseJSON(r.change_data) }));
  }

  static async getByTeacher(teacherId) {
    const [rows] = await db.execute(
      `SELECT * FROM pending_changes WHERE requested_by = ? ORDER BY requested_at DESC`,
      [teacherId]
    );
    return rows.map(r => ({ ...r, change_data: PendingChange._safeParseJSON(r.change_data) }));
  }

  static async getById(changeId) {
    const [rows] = await db.execute('SELECT * FROM pending_changes WHERE change_id = ?', [changeId]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return { ...r, change_data: PendingChange._safeParseJSON(r.change_data) };
  }

  static async approve(changeId, adminId, note) {
    const conn = await db.getConnection();
    let change = null;
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT * FROM pending_changes WHERE change_id = ? FOR UPDATE',
        [changeId]
      );
      if (rows.length === 0) {
        throw new Error('Không tìm thấy yêu cầu thay đổi');
      }

      change = {
        ...rows[0],
        change_data: PendingChange._safeParseJSON(rows[0].change_data),
      };

      if (change.status === 'approved') {
        await conn.commit();
        return { alreadyApproved: true };
      }

      if (change.status === 'rejected') {
        throw new Error('Yêu cầu này đã bị từ chối trước đó');
      }

      if (change.status !== 'pending') {
        throw new Error('Yêu cầu này đã được xử lý trước đó');
      }

      // Apply the change
      const data = change.change_data || {};
      const changeType = change.change_type;

      if (changeType === 'create_course') {
        if (!data.course_id || !data.course_name || !data.category) {
          throw new Error('Thiếu thông tin bắt buộc để tạo khóa học');
        }

        await conn.execute(
          `INSERT INTO courses (course_id, course_name, category, description, price, old_price, duration, level, thumbnail, is_new, discount_percentage) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            PendingChange._sqlValue(data.course_id),
            PendingChange._sqlValue(data.course_name),
            PendingChange._sqlValue(data.category),
            PendingChange._sqlValue(data.description, ''),
            Number(data.price || 0),
            PendingChange._sqlValue(data.old_price),
            PendingChange._sqlValue(data.duration),
            PendingChange._sqlValue(data.level, 'Cơ bản'),
            PendingChange._sqlValue(data.thumbnail, ''),
            Number(data.is_new || 0),
            Number(data.discount_percentage || 0),
          ]
        );
      } else if (changeType === 'update_course') {
        const allowedCourseFields = new Set([
          'course_name',
          'category',
          'description',
          'price',
          'old_price',
          'duration',
          'level',
          'thumbnail',
          'is_new',
          'discount_percentage',
          'has_pending_changes',
          'last_modified_by',
        ]);

        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'course_id' && allowedCourseFields.has(key) && value !== undefined) {
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
        if (!data.course_id || !data.lesson_title) {
          throw new Error('Thiếu thông tin bắt buộc để tạo bài học');
        }

        await conn.execute(
          `INSERT INTO lessons (course_id, section_id, lesson_title, lesson_content, video_url, duration, lesson_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            PendingChange._sqlValue(data.course_id),
            Number(data.section_id || 1),
            PendingChange._sqlValue(data.lesson_title),
            PendingChange._sqlValue(data.lesson_content, ''),
            PendingChange._sqlValue(data.video_url, ''),
            Number(data.duration || 0),
            Number(data.lesson_order || 1),
          ]
        );
      } else if (changeType === 'update_lesson') {
        const allowedLessonFields = new Set([
          'course_id',
          'section_id',
          'lesson_title',
          'lesson_content',
          'video_url',
          'duration',
          'lesson_order',
          'is_active',
        ]);

        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'lesson_id' && allowedLessonFields.has(key) && value !== undefined) {
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
      return { alreadyApproved: false };
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // Ignore rollback errors and keep the original database error.
      }

      if (err?.code === 'ER_DUP_ENTRY' && change?.change_type === 'create_course') {
        throw new Error('Khóa học đã tồn tại hoặc yêu cầu đã được duyệt trước đó');
      }

      throw err;
    } finally {
      conn.release();
    }
  }

  static async reject(changeId, adminId, note) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT status FROM pending_changes WHERE change_id = ? FOR UPDATE',
        [changeId]
      );

      if (rows.length === 0) {
        throw new Error('Không tìm thấy yêu cầu thay đổi');
      }

      const currentStatus = rows[0].status;
      if (currentStatus === 'approved') {
        throw new Error('Yêu cầu này đã được duyệt, không thể từ chối');
      }

      if (currentStatus === 'rejected') {
        await conn.commit();
        return { alreadyRejected: true };
      }

      await conn.execute(
        `UPDATE pending_changes SET status = 'rejected', reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE change_id = ?`,
        [adminId, note, changeId]
      );

      await conn.commit();
      return { alreadyRejected: false };
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // Ignore rollback errors and keep the original database error.
      }
      throw err;
    } finally {
      conn.release();
    }
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
    return rows.map(r => ({ ...r, change_data: PendingChange._safeParseJSON(r.change_data) }));
  }
  // Safely parse JSON change_data, handling control characters
  static _safeParseJSON(data) {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      // Remove control characters (0x00-0x1F) except common whitespace
      const sanitized = data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      return JSON.parse(sanitized);
    } catch (e) {
      console.error('Failed to parse change_data:', e.message);
      return {};
    }
  }
}

module.exports = PendingChange;
