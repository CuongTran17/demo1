const db = require('../config/database');
const Quiz = require('./Quiz');

class PendingChange {
  static _sqlValue(value, fallback = null) {
    return value === undefined ? fallback : value;
  }

  static _safeString(value) {
    if (value == null) return '';
    return String(value);
  }

  static async create(teacherId, changeType, targetId, changeData) {
    let tableName = 'courses';
    if (changeType.includes('lesson')) tableName = 'lessons';
    else if (changeType.includes('quiz')) tableName = 'quizzes';

    const [result] = await db.execute(
      `INSERT INTO pending_changes (table_name, target_id, change_type, change_data, requested_by, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [tableName, targetId, changeType, JSON.stringify(changeData), teacherId]
    );

    const courseId = await PendingChange._resolveCourseId(changeType, targetId, changeData);
    if (courseId) {
      await PendingChange._setCoursePendingFlag(courseId, true);
    }

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

  static async getByIdAndTeacher(changeId, teacherId) {
    const [rows] = await db.execute(
      'SELECT * FROM pending_changes WHERE change_id = ? AND requested_by = ?',
      [changeId, teacherId]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return { ...row, change_data: PendingChange._safeParseJSON(row.change_data) };
  }

  static async resubmitByTeacher(changeId, teacherId, changeData) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT * FROM pending_changes WHERE change_id = ? AND requested_by = ? FOR UPDATE',
        [changeId, teacherId]
      );

      if (!rows.length) {
        throw new Error('Không tìm thấy yêu cầu thay đổi');
      }

      const current = {
        ...rows[0],
        change_data: PendingChange._safeParseJSON(rows[0].change_data),
      };

      if (!['create_course', 'create_lesson', 'update_course', 'update_lesson', 'create_quiz'].includes(current.change_type)) {
        throw new Error('Loại yêu cầu này chưa hỗ trợ sửa lại');
      }

      if (!['pending', 'rejected'].includes(current.status)) {
        throw new Error('Yêu cầu này không thể sửa lại');
      }

      const nextTargetId = await PendingChange._resolveResubmitTargetId(
        conn,
        current,
        changeData
      );

      await conn.execute(
        `UPDATE pending_changes
         SET target_id = ?,
             change_data = ?,
             status = 'pending',
             reviewed_by = NULL,
             review_note = NULL,
             reviewed_at = NULL,
             requested_at = NOW()
         WHERE change_id = ?`,
        [nextTargetId, JSON.stringify(changeData || {}), changeId]
      );

      const nextCourseId = await PendingChange._resolveCourseId(
        current.change_type,
        nextTargetId,
        changeData,
        conn
      );
      if (nextCourseId) {
        await PendingChange._setCoursePendingFlagWithConn(conn, nextCourseId, true);
      }

      await conn.commit();
      return { updated: true };
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

  static async deleteByTeacher(changeId, teacherId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT * FROM pending_changes WHERE change_id = ? AND requested_by = ? FOR UPDATE',
        [changeId, teacherId]
      );

      if (!rows.length) {
        throw new Error('Không tìm thấy yêu cầu thay đổi');
      }

      const current = {
        ...rows[0],
        change_data: PendingChange._safeParseJSON(rows[0].change_data),
      };

      if (!['pending', 'rejected'].includes(current.status)) {
        throw new Error('Chỉ được thu hồi yêu cầu đang chờ hoặc bị từ chối');
      }

      await conn.execute('DELETE FROM pending_changes WHERE change_id = ? AND requested_by = ?', [changeId, teacherId]);
      await PendingChange._syncCoursePendingFlagForChange(conn, current);

      await conn.commit();
      return { deleted: true };
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

      // Apply the change. Newer records store { before, after }; older records are flat.
      const rawData = change.change_data || {};
      const data = rawData.after ?? rawData;
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
      } else if (changeType === 'create_quiz') {
        if (!data.course_id || !data.quiz_title) {
          throw new Error('Thiếu thông tin bắt buộc để tạo bài kiểm tra');
        }
        await Quiz.createWithConn(conn, data);
      } else if (changeType === 'delete_quiz') {
        await conn.execute('UPDATE quizzes SET is_active = 0 WHERE quiz_id = ?', [change.target_id]);
      }

      // Update change status
      await conn.execute(
        `UPDATE pending_changes SET status = 'approved', reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE change_id = ?`,
        [adminId, note ?? null, changeId]
      );

      await PendingChange._syncCoursePendingFlagForChange(conn, change);

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
        [adminId, note ?? null, changeId]
      );

      const [changeRows] = await conn.execute(
        'SELECT * FROM pending_changes WHERE change_id = ?',
        [changeId]
      );
      if (changeRows.length > 0) {
        const change = {
          ...changeRows[0],
          change_data: PendingChange._safeParseJSON(changeRows[0].change_data),
        };
        await PendingChange._syncCoursePendingFlagForChange(conn, change);
      }

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

  static async hasPendingForCourse(courseId, excludeChangeId = null) {
    if (!courseId) return false;
    const params = [courseId, courseId];
    let sql =
      `SELECT 1
       FROM pending_changes pc
       LEFT JOIN lessons l ON pc.change_type = 'delete_lesson' AND l.lesson_id = CAST(pc.target_id AS UNSIGNED)
       LEFT JOIN quizzes q ON pc.change_type = 'delete_quiz' AND q.quiz_id = CAST(pc.target_id AS UNSIGNED)
       WHERE pc.status = 'pending'
         AND (
           (pc.change_type IN ('update_course', 'delete_course') AND pc.target_id = ?)
           OR (
             pc.change_type IN ('create_lesson', 'update_lesson', 'create_quiz')
             AND COALESCE(
               JSON_UNQUOTE(JSON_EXTRACT(pc.change_data, '$.after.course_id')),
               JSON_UNQUOTE(JSON_EXTRACT(pc.change_data, '$.course_id'))
             ) = ?
           )
           OR (pc.change_type = 'delete_lesson' AND l.course_id = ?)
           OR (pc.change_type = 'delete_quiz' AND q.course_id = ?)
         )`;

    params.push(courseId, courseId);

    if (excludeChangeId) {
      sql += ' AND pc.change_id <> ?';
      params.push(excludeChangeId);
    }

    sql += ' LIMIT 1';

    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  }

  static async _setCoursePendingFlag(courseId, hasPending) {
    await db.execute(
      'UPDATE courses SET has_pending_changes = ? WHERE course_id = ?',
      [hasPending ? 1 : 0, courseId]
    );
  }

  static async _setCoursePendingFlagWithConn(conn, courseId, hasPending) {
    await conn.execute(
      'UPDATE courses SET has_pending_changes = ? WHERE course_id = ?',
      [hasPending ? 1 : 0, courseId]
    );
  }

  static async _resolveCourseId(changeType, targetId, changeData, conn = null) {
    const executor = conn || db;
    const rawData = changeData || {};
    const data = rawData.after ?? rawData;

    if (changeType === 'update_course' || changeType === 'delete_course') {
      return PendingChange._safeString(targetId);
    }

    if (changeType === 'create_lesson' || changeType === 'update_lesson' || changeType === 'create_quiz') {
      return PendingChange._safeString(data.course_id);
    }

    if (changeType === 'delete_lesson') {
      const [lessonRows] = await executor.execute(
        'SELECT course_id FROM lessons WHERE lesson_id = ? LIMIT 1',
        [targetId]
      );
      return PendingChange._safeString(lessonRows[0]?.course_id);
    }

    if (changeType === 'delete_quiz') {
      const [quizRows] = await executor.execute(
        'SELECT course_id FROM quizzes WHERE quiz_id = ? LIMIT 1',
        [targetId]
      );
      return PendingChange._safeString(quizRows[0]?.course_id);
    }

    return '';
  }

  static async _resolveResubmitTargetId(conn, current, changeData) {
    const changeType = current?.change_type;
    const payload = changeData || {};
    const payloadData = payload.after ?? payload;

    if (changeType === 'create_course') {
      return PendingChange._safeString(payloadData.course_id || current.target_id);
    }

    if (changeType === 'update_course') {
      return PendingChange._safeString(current.target_id || payloadData.course_id);
    }

    if (changeType === 'create_lesson') {
      return PendingChange._safeString(payloadData.course_id || current.target_id);
    }

    if (changeType === 'update_lesson') {
      return PendingChange._safeString(current.target_id);
    }

    if (changeType === 'create_quiz') {
      return PendingChange._safeString(payloadData.course_id || current.target_id);
    }

    const resolvedCourseId = await PendingChange._resolveCourseId(
      changeType,
      current.target_id,
      current.change_data,
      conn
    );

    return PendingChange._safeString(resolvedCourseId || current.target_id);
  }

  static async _syncCoursePendingFlagForChange(conn, change) {
    const courseId = await PendingChange._resolveCourseId(change.change_type, change.target_id, change.change_data, conn);
    if (!courseId) return;

    const [rows] = await conn.execute(
      `SELECT 1
       FROM pending_changes pc
       LEFT JOIN lessons l ON pc.change_type = 'delete_lesson' AND l.lesson_id = CAST(pc.target_id AS UNSIGNED)
       LEFT JOIN quizzes q ON pc.change_type = 'delete_quiz' AND q.quiz_id = CAST(pc.target_id AS UNSIGNED)
       WHERE pc.status = 'pending'
         AND (
           (pc.change_type IN ('update_course', 'delete_course') AND pc.target_id = ?)
           OR (
             pc.change_type IN ('create_lesson', 'update_lesson', 'create_quiz')
             AND COALESCE(
               JSON_UNQUOTE(JSON_EXTRACT(pc.change_data, '$.after.course_id')),
               JSON_UNQUOTE(JSON_EXTRACT(pc.change_data, '$.course_id'))
             ) = ?
           )
           OR (pc.change_type = 'delete_lesson' AND l.course_id = ?)
           OR (pc.change_type = 'delete_quiz' AND q.course_id = ?)
         )
       LIMIT 1`,
      [courseId, courseId, courseId, courseId]
    );

    await PendingChange._setCoursePendingFlagWithConn(conn, courseId, rows.length > 0);
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
