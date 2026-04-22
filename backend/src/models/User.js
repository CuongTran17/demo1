const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  // ============ Authentication ============

  static async register({ email, phone, password, fullname }) {
    const passwordHash = await bcrypt.hash(password, 10);
    return User.registerWithHash({ email, phone, passwordHash, fullname });
  }

  static async registerWithHash({ email, phone, passwordHash, fullname }) {
    const [result] = await db.execute(
      'INSERT INTO users (email, phone, password_hash, fullname) VALUES (?, ?, ?, ?)',
      [email, phone, passwordHash, fullname]
    );
    return result.insertId;
  }

  static async login(emailOrPhone, password) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [emailOrPhone, emailOrPhone]
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    let isMatch = false;

    // Support both bcrypt hashes ($2a$/$2b$) and SHA-256 hex hashes (from legacy Java app)
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy SHA-256 hash comparison
      const sha256 = crypto.createHash('sha256').update(password).digest('hex');
      isMatch = sha256 === user.password_hash;
      // Upgrade to bcrypt on successful login
      if (isMatch) {
        const bcryptHash = await bcrypt.hash(password, 10);
        await db.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [bcryptHash, user.user_id]);
      }
    }
    if (!isMatch) return null;

    return user;
  }

  // ============ Role Detection ============

  static getRole(email) {
    if (email === 'admin@ptit.edu.vn') return 'admin';
    if (/^teacher\d*@ptit\.edu\.vn$/.test(email)) return 'teacher';
    return 'student';
  }

  // ============ Queries ============

  static async getById(userId) {
    const [rows] = await db.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
    return rows[0] || null;
  }

  static async getByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  static async emailExists(email) {
    const [rows] = await db.execute('SELECT 1 FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  }

  static async phoneExists(phone) {
    const [rows] = await db.execute('SELECT 1 FROM users WHERE phone = ?', [phone]);
    return rows.length > 0;
  }

  static async getAll() {
    const [rows] = await db.execute(
      'SELECT user_id, email, phone, fullname, role, created_at, updated_at, is_locked, locked_reason, locked_by, locked_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  static async getTeachers() {
    const [rows] = await db.execute(
      `SELECT user_id, email, phone, fullname, role, created_at FROM users
       WHERE role = 'teacher' OR (role IS NULL AND email REGEXP '^teacher[0-9]*@ptit\\.edu\\.vn$')
       ORDER BY created_at DESC`
    );
    return rows;
  }

  static async updateRole(userId, role) {
    await db.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE user_id = ?',
      [role, userId]
    );
  }

  // ============ Profile Updates ============

  static async updateProfile(userId, { fullname, email, phone }) {
    await db.execute(
      'UPDATE users SET fullname = ?, email = ?, phone = ?, updated_at = NOW() WHERE user_id = ?',
      [fullname, email, phone, userId]
    );
  }

  static async updatePassword(userId, currentPassword, newPassword) {
    const user = await User.getById(userId);
    if (!user) throw new Error('User not found');

    let isMatch = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    } else {
      const sha256 = crypto.createHash('sha256').update(currentPassword).digest('hex');
      isMatch = sha256 === user.password_hash;
    }
    if (!isMatch) throw new Error('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?',
      [newHash, userId]
    );
  }

  static async resetPasswordByEmail(email, newPassword) {
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?',
      [newHash, email]
    );
  }

  // ============ Account Lock ============

  static async lockAccount(userId, reason, lockedBy) {
    await db.execute(
      'UPDATE users SET is_locked = 1, locked_reason = ?, locked_by = ?, locked_at = NOW() WHERE user_id = ?',
      [reason, lockedBy, userId]
    );
  }

  static async unlockAccount(userId) {
    await db.execute(
      'UPDATE users SET is_locked = 0, locked_reason = NULL, locked_by = NULL, locked_at = NULL WHERE user_id = ?',
      [userId]
    );
  }

  // ============ Admin CRUD ============

  static async deleteUser(userId) {
    await db.execute('DELETE FROM users WHERE user_id = ?', [userId]);
  }
}

module.exports = User;
