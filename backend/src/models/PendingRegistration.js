const bcrypt = require('bcryptjs');
const db = require('../config/database');

class PendingRegistration {
  static tableReady = false;

  static async ensureTable() {
    if (PendingRegistration.tableReady) return;

    await db.execute(
      `CREATE TABLE IF NOT EXISTS pending_registrations (
        pending_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pending_registrations_email (email),
        INDEX idx_pending_registrations_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    PendingRegistration.tableReady = true;
  }

  static async upsert({ email, phone, fullname, password }) {
    await PendingRegistration.ensureTable();

    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute(
      `INSERT INTO pending_registrations (email, phone, fullname, password_hash)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone),
         fullname = VALUES(fullname),
         password_hash = VALUES(password_hash),
         updated_at = CURRENT_TIMESTAMP`,
      [email, phone, fullname, passwordHash]
    );
  }

  static async getByEmail(email) {
    await PendingRegistration.ensureTable();

    const [rows] = await db.execute(
      `SELECT pending_id, email, phone, fullname, password_hash, created_at, updated_at
       FROM pending_registrations
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    return rows[0] || null;
  }

  static async deleteByEmail(email) {
    await PendingRegistration.ensureTable();
    await db.execute('DELETE FROM pending_registrations WHERE email = ?', [email]);
  }
}

module.exports = PendingRegistration;