const db = require('../config/database');

class ContactMessage {
  static async ensureTable() {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(180) NOT NULL,
        subject VARCHAR(80),
        message TEXT NOT NULL,
        is_resolved TINYINT(1) NOT NULL DEFAULT 0,
        resolved_by INT NULL,
        resolved_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_contact_messages_resolved_created (is_resolved, created_at),
        CONSTRAINT fk_contact_messages_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  static validatePayload(data = {}) {
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const subject = String(data.subject || '').trim();
    const message = String(data.message || '').trim();

    if (!name) {
      const err = new Error('Vui lòng nhập họ tên');
      err.status = 400;
      throw err;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('Email không hợp lệ');
      err.status = 400;
      throw err;
    }
    if (!message) {
      const err = new Error('Vui lòng nhập nội dung tin nhắn');
      err.status = 400;
      throw err;
    }

    return {
      name: name.slice(0, 120),
      email: email.slice(0, 180),
      subject: subject.slice(0, 80) || null,
      message,
    };
  }

  static async create(data) {
    await ContactMessage.ensureTable();
    const payload = ContactMessage.validatePayload(data);
    const [result] = await db.execute(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [payload.name, payload.email, payload.subject, payload.message]
    );
    return result.insertId;
  }

  static async getAll() {
    await ContactMessage.ensureTable();
    const [rows] = await db.execute(
      `SELECT cm.*, u.fullname AS resolved_by_name
       FROM contact_messages cm
       LEFT JOIN users u ON u.user_id = cm.resolved_by
       ORDER BY cm.created_at DESC, cm.message_id DESC`
    );
    return rows;
  }

  static async setResolved(id, isResolved, userId) {
    await ContactMessage.ensureTable();
    const resolved = isResolved ? 1 : 0;
    const [result] = await db.execute(
      `UPDATE contact_messages
       SET is_resolved = ?, resolved_by = ?, resolved_at = ?
       WHERE message_id = ?`,
      [resolved, resolved ? userId : null, resolved ? new Date() : null, id]
    );
    return result.affectedRows > 0;
  }

  static async deleteById(id) {
    await ContactMessage.ensureTable();
    const [result] = await db.execute('DELETE FROM contact_messages WHERE message_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = ContactMessage;
