const db = require('../config/database');

class FlashSale {
  static initialized = false;

  static _toStatusError(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    return err;
  }

  static _normalizeCourseIds(courseIds) {
    if (!Array.isArray(courseIds)) return [];

    const unique = new Set();
    for (const courseId of courseIds) {
      const normalized = String(courseId || '').trim();
      if (normalized) {
        unique.add(normalized);
      }
    }

    return Array.from(unique);
  }

  static async ensureTable() {
    if (this.initialized) return;

    await db.execute(`
      CREATE TABLE IF NOT EXISTS flash_sales (
        flash_sale_id INT AUTO_INCREMENT PRIMARY KEY,
        target_type ENUM('all', 'category', 'courses') NOT NULL DEFAULT 'all',
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

    // Keep backward compatibility for old DBs that were created with ENUM('all', 'category').
    await db.execute(`
      ALTER TABLE flash_sales
      MODIFY COLUMN target_type ENUM('all', 'category', 'courses') NOT NULL DEFAULT 'all'
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS flash_sale_courses (
        flash_sale_id INT NOT NULL,
        course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (flash_sale_id, course_id),
        CONSTRAINT fk_flash_sale_courses_sale
          FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(flash_sale_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_flash_sale_courses_course
          FOREIGN KEY (course_id) REFERENCES courses(course_id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    this.initialized = true;
  }

  static async _hydrateRowsWithCourseIds(rows) {
    if (!rows.length) return [];

    const saleIds = rows.map((row) => row.flash_sale_id).filter(Boolean);
    if (!saleIds.length) {
      return rows.map((row) => this.normalizeRow(row));
    }

    const placeholders = saleIds.map(() => '?').join(', ');
    const [mappingRows] = await db.execute(
      `SELECT flash_sale_id, course_id
       FROM flash_sale_courses
       WHERE flash_sale_id IN (${placeholders})
       ORDER BY flash_sale_id DESC, course_id ASC`,
      saleIds
    );

    const courseMap = new Map();
    for (const mapping of mappingRows) {
      if (!courseMap.has(mapping.flash_sale_id)) {
        courseMap.set(mapping.flash_sale_id, []);
      }
      courseMap.get(mapping.flash_sale_id).push(mapping.course_id);
    }

    return rows.map((row) => this.normalizeRow({
      ...row,
      course_ids: courseMap.get(row.flash_sale_id) || [],
    }));
  }

  static normalizeRow(row) {
    if (!row) return null;

    return {
      ...row,
      start_at: row.start_at ? new Date(row.start_at).toISOString() : null,
      end_at: row.end_at ? new Date(row.end_at).toISOString() : null,
      is_active: Boolean(row.is_active),
      course_ids: this._normalizeCourseIds(row.course_ids),
    };
  }

  static async getById(flashSaleId) {
    await this.ensureTable();

    const [rows] = await db.execute(
      `SELECT * FROM flash_sales WHERE flash_sale_id = ? LIMIT 1`,
      [flashSaleId]
    );

    if (!rows.length) return null;

    const hydrated = await this._hydrateRowsWithCourseIds(rows);
    return hydrated[0] || null;
  }

  static async getLatestConfig() {
    await this.ensureTable();
    const [rows] = await db.execute(
      `SELECT * FROM flash_sales ORDER BY flash_sale_id DESC LIMIT 1`
    );

    if (!rows.length) return null;

    const hydrated = await this._hydrateRowsWithCourseIds(rows);
    return hydrated[0] || null;
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

    if (!rows.length) return null;

    const hydrated = await this._hydrateRowsWithCourseIds(rows);
    return hydrated[0] || null;
  }

  static async _assertCoursesExist(conn, courseIds) {
    if (!courseIds.length) return;

    const placeholders = courseIds.map(() => '?').join(', ');
    const [rows] = await conn.execute(
      `SELECT course_id FROM courses WHERE course_id IN (${placeholders})`,
      courseIds
    );

    const found = new Set(rows.map((row) => String(row.course_id)));
    const missing = courseIds.filter((courseId) => !found.has(courseId));
    if (missing.length > 0) {
      throw this._toStatusError(`Không tìm thấy khóa học: ${missing.join(', ')}`, 400);
    }
  }

  static async _replaceSaleCourses(conn, flashSaleId, courseIds) {
    await conn.execute(
      `DELETE FROM flash_sale_courses WHERE flash_sale_id = ?`,
      [flashSaleId]
    );

    if (!courseIds.length) return;

    const placeholders = courseIds.map(() => '(?, ?)').join(', ');
    const values = [];
    for (const courseId of courseIds) {
      values.push(flashSaleId, courseId);
    }

    await conn.execute(
      `INSERT INTO flash_sale_courses (flash_sale_id, course_id) VALUES ${placeholders}`,
      values
    );
  }

  static async saveConfig({
    flashSaleId,
    targetType,
    targetValue,
    courseIds,
    discountPercentage,
    startAt,
    endAt,
    createdBy,
  }) {
    await this.ensureTable();

    const normalizedCourseIds = this._normalizeCourseIds(courseIds);
    const normalizedTargetValue = targetType === 'category'
      ? String(targetValue || '').trim()
      : null;

    const parsedFlashSaleId = flashSaleId != null && flashSaleId !== ''
      ? Number(flashSaleId)
      : null;

    const conn = await db.getConnection();
    let resolvedFlashSaleId = parsedFlashSaleId;
    try {
      await conn.beginTransaction();

      if (targetType === 'courses') {
        if (!normalizedCourseIds.length) {
          throw this._toStatusError('Vui lòng chọn ít nhất 1 khóa học cho flash sale', 400);
        }
        await this._assertCoursesExist(conn, normalizedCourseIds);
      }

      if (resolvedFlashSaleId != null) {
        if (!Number.isInteger(resolvedFlashSaleId) || resolvedFlashSaleId <= 0) {
          throw this._toStatusError('ID flash sale không hợp lệ', 400);
        }

        const [existingRows] = await conn.execute(
          `SELECT flash_sale_id FROM flash_sales WHERE flash_sale_id = ? LIMIT 1 FOR UPDATE`,
          [resolvedFlashSaleId]
        );

        if (!existingRows.length) {
          throw this._toStatusError('Không tìm thấy flash sale để chỉnh sửa', 404);
        }

        await conn.execute(
          `UPDATE flash_sales
           SET is_active = 0
           WHERE is_active = 1 AND flash_sale_id <> ?`,
          [resolvedFlashSaleId]
        );

        await conn.execute(
          `UPDATE flash_sales
           SET target_type = ?,
               target_value = ?,
               discount_percentage = ?,
               start_at = ?,
               end_at = ?,
               is_active = 1,
               created_by = ?
           WHERE flash_sale_id = ?`,
          [
            targetType,
            normalizedTargetValue,
            discountPercentage,
            startAt,
            endAt,
            createdBy || null,
            resolvedFlashSaleId,
          ]
        );
      } else {
        await conn.execute(`UPDATE flash_sales SET is_active = 0 WHERE is_active = 1`);

        const [insertResult] = await conn.execute(
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
            normalizedTargetValue,
            discountPercentage,
            startAt,
            endAt,
            createdBy || null,
          ]
        );

        resolvedFlashSaleId = insertResult.insertId;
      }

      await this._replaceSaleCourses(
        conn,
        resolvedFlashSaleId,
        targetType === 'courses' ? normalizedCourseIds : []
      );

      await conn.commit();
      return this.getById(resolvedFlashSaleId);
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // Ignore rollback error and throw the original one.
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  static async deactivateAll() {
    await this.ensureTable();
    await db.execute(`UPDATE flash_sales SET is_active = 0 WHERE is_active = 1`);
    return { message: 'Flash sale đã được tắt' };
  }

  static async deleteConfig(flashSaleId) {
    await this.ensureTable();

    const parsedId = Number(flashSaleId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw this._toStatusError('ID flash sale không hợp lệ', 400);
    }

    const [rows] = await db.execute(
      `SELECT flash_sale_id, is_active FROM flash_sales WHERE flash_sale_id = ? LIMIT 1`,
      [parsedId]
    );

    if (!rows.length) {
      throw this._toStatusError('Không tìm thấy flash sale', 404);
    }

    if (Number(rows[0].is_active) === 1) {
      throw this._toStatusError('Phải tắt flash sale trước khi xóa', 409);
    }

    await db.execute(`DELETE FROM flash_sales WHERE flash_sale_id = ?`, [parsedId]);
    return { message: 'Đã xóa flash sale' };
  }
}

module.exports = FlashSale;
