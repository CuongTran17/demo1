const db = require('../config/database');

class AccountLock {
  static async createRequest(targetUserId, requesterId, reason, requestType) {
    const [result] = await db.execute(
      `INSERT INTO account_lock_requests (target_user_id, requester_id, reason, request_type, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [targetUserId, requesterId, reason, requestType]
    );
    return result.insertId;
  }

  static async getPendingRequests() {
    const [rows] = await db.execute(
      `SELECT alr.*, 
       tu.fullname as target_name, tu.email as target_email,
       ru.fullname as requester_name, ru.email as requester_email
       FROM account_lock_requests alr
       JOIN users tu ON alr.target_user_id = tu.user_id
       JOIN users ru ON alr.requester_id = ru.user_id
       WHERE alr.status = 'pending'
       ORDER BY alr.created_at DESC`
    );
    return rows;
  }

  static async getByRequester(requesterId) {
    const [rows] = await db.execute(
      `SELECT alr.*, tu.fullname as target_name, tu.email as target_email
       FROM account_lock_requests alr
       JOIN users tu ON alr.target_user_id = tu.user_id
       WHERE alr.requester_id = ?
       ORDER BY alr.created_at DESC`,
      [requesterId]
    );
    return rows;
  }

  static async approve(requestId, adminId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute('SELECT * FROM account_lock_requests WHERE request_id = ?', [requestId]);
      if (rows.length === 0) throw new Error('Request not found');

      const request = rows[0];

      if (request.request_type === 'lock') {
        await conn.execute(
          'UPDATE users SET is_locked = 1, locked_reason = ?, locked_by = ?, locked_at = NOW() WHERE user_id = ?',
          [request.reason, adminId, request.target_user_id]
        );
      } else {
        await conn.execute(
          'UPDATE users SET is_locked = 0, locked_reason = NULL, locked_by = NULL, locked_at = NULL WHERE user_id = ?',
          [request.target_user_id]
        );
      }

      await conn.execute(
        `UPDATE account_lock_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?`,
        [adminId, requestId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async reject(requestId, adminId) {
    await db.execute(
      `UPDATE account_lock_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?`,
      [adminId, requestId]
    );
  }

  static async getReviewed() {
    const [rows] = await db.execute(
      `SELECT alr.*, 
       tu.fullname as target_name, ru.fullname as requester_name, 
       au.fullname as reviewer_name
       FROM account_lock_requests alr
       JOIN users tu ON alr.target_user_id = tu.user_id
       JOIN users ru ON alr.requester_id = ru.user_id
       LEFT JOIN users au ON alr.reviewed_by = au.user_id
       WHERE alr.status != 'pending'
       ORDER BY alr.reviewed_at DESC`
    );
    return rows;
  }
}

module.exports = AccountLock;
