const db = require('../config/database');

class EmailOtp {
  static tableReady = false;

  static PURPOSE = {
    REGISTER: 'register',
    RESET_PASSWORD: 'reset_password',
  };

  static async ensureTable() {
    if (EmailOtp.tableReady) return;

    await db.execute(
      `CREATE TABLE IF NOT EXISTS email_otps (
        otp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        purpose ENUM('register', 'reset_password') NOT NULL,
        otp_hash CHAR(64) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email_purpose_created (email, purpose, created_at),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    EmailOtp.tableReady = true;
  }

  static async getLatest(email, purpose) {
    await EmailOtp.ensureTable();
    const [rows] = await db.execute(
      `SELECT otp_id, email, purpose, otp_hash, attempts, max_attempts, expires_at, consumed_at, created_at
       FROM email_otps
       WHERE email = ? AND purpose = ?
       ORDER BY otp_id DESC
       LIMIT 1`,
      [email, purpose]
    );
    return rows[0] || null;
  }

  static async getLatestActive(email, purpose) {
    await EmailOtp.ensureTable();
    const [rows] = await db.execute(
      `SELECT otp_id, email, purpose, otp_hash, attempts, max_attempts, expires_at, consumed_at, created_at
       FROM email_otps
       WHERE email = ? AND purpose = ? AND consumed_at IS NULL
       ORDER BY otp_id DESC
       LIMIT 1`,
      [email, purpose]
    );
    return rows[0] || null;
  }

  static async getCooldownRemainingSeconds(email, purpose, cooldownSeconds) {
    await EmailOtp.ensureTable();
    const [rows] = await db.execute(
      `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_seconds
       FROM email_otps
       WHERE email = ? AND purpose = ?
       ORDER BY otp_id DESC
       LIMIT 1`,
      [email, purpose]
    );

    if (rows.length === 0) return 0;

    const elapsed = Number(rows[0].elapsed_seconds || 0);
    const remaining = cooldownSeconds - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  static async create({ email, purpose, otpHash, expiresInMinutes, maxAttempts }) {
    await EmailOtp.ensureTable();
    const [result] = await db.execute(
      `INSERT INTO email_otps (email, purpose, otp_hash, expires_at, max_attempts)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)`,
      [email, purpose, otpHash, expiresInMinutes, maxAttempts]
    );
    return result.insertId;
  }

  static async deleteById(otpId) {
    await EmailOtp.ensureTable();
    await db.execute('DELETE FROM email_otps WHERE otp_id = ?', [otpId]);
  }

  static async markConsumed(otpId) {
    await EmailOtp.ensureTable();
    await db.execute(
      'UPDATE email_otps SET consumed_at = NOW(), updated_at = NOW() WHERE otp_id = ?',
      [otpId]
    );
  }

  static async increaseAttempts(otpId) {
    await EmailOtp.ensureTable();
    await db.execute(
      'UPDATE email_otps SET attempts = attempts + 1, updated_at = NOW() WHERE otp_id = ?',
      [otpId]
    );
  }
}

module.exports = EmailOtp;
