const db = require('../config/database');

class FlashSale {
  static initialized = false;

  static async ensureTable() {
    if (this.initialized) return;

    await db.execute(`
      CREATE TABLE IF NOT EXISTS flash_sales (
        flash_sale_id INT AUTO_INCREMENT PRIMARY KEY,
        target_type ENUM('all', 'category') NOT NULL DEFAULT 'all',
        target_value VARCHAR(64) NULL,
        discount_percentage INT NOT NULL,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CHECK (discount_percentage > 0 AND discount_percentage <= 90)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    this.initialized = true;
  }

  static normalizeRow(row) {
    if (!row) return null;

    return {
      ...row,
      start_at: row.start_at ? new Date(row.start_at).toISOString() : null,
      end_at: row.end_at ? new Date(row.end_at).toISOString() : null,
      is_active: Boolean(row.is_active),
    };
  }

  static async getLatestConfig() {
    await this.ensureTable();
    const [rows] = await db.execute(
      `SELECT * FROM flash_sales ORDER BY flash_sale_id DESC LIMIT 1`
    );
    return this.normalizeRow(rows[0] || null);
  }

  static async getActivePublicSale() {
    await this.ensureTable();

    const [rows] = await db.execute(
      `SELECT *
       FROM flash_sales
       WHERE is_active = 1
         AND end_at >= NOW()
       ORDER BY flash_sale_id DESC
       LIMIT 1`
    );

    return this.normalizeRow(rows[0] || null);
  }

  static async saveConfig({ targetType, targetValue, discountPercentage, startAt, endAt, createdBy }) {
    await this.ensureTable();

    await db.execute(`UPDATE flash_sales SET is_active = 0 WHERE is_active = 1`);

    await db.execute(
      `INSERT INTO flash_sales (
        target_type,
        target_value,
        discount_percentage,
        start_at,
        end_at,
        is_active,
        created_by
      ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [
        targetType,
        targetType === 'category' ? targetValue : null,
        discountPercentage,
        startAt,
        endAt,
        createdBy || null,
      ]
    );

    return this.getLatestConfig();
  }

  static async deactivateAll() {
    await this.ensureTable();
    await db.execute(`UPDATE flash_sales SET is_active = 0 WHERE is_active = 1`);
    return { message: 'Flash sale đã được tắt' };
  }
}

module.exports = FlashSale;
