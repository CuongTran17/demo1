const db = require('../config/database');

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function toTinyIntBoolean(value, fallback = 1) {
  if (value === undefined) return fallback;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['0', 'false', 'off', 'no'].includes(normalized)) return 0;
    if (['1', 'true', 'on', 'yes'].includes(normalized)) return 1;
  }

  return value ? 1 : 0;
}

function toAmount(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

class DiscountCode {
  static normalizeCode(rawCode) {
    return String(rawCode || '').trim().toUpperCase();
  }

  static _normalizeDateInput(value, fieldName) {
    if (value == null || value === '') {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw badRequest(`${fieldName} khong hop le`);
    }

    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  static _normalizeNullableAmount(value, fieldName) {
    if (value == null || value === '') {
      return null;
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      throw badRequest(`${fieldName} phai la so duong`);
    }

    return Math.round(num);
  }

  static _normalizeNullableInt(value, fieldName) {
    if (value == null || value === '') {
      return null;
    }

    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      throw badRequest(`${fieldName} phai la so nguyen duong`);
    }

    return num;
  }

  static async create(payload, adminId) {
    const code = this.normalizeCode(payload.code);
    if (!code) {
      throw badRequest('Ma giam gia khong duoc de trong');
    }

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      throw badRequest('Ma giam gia chi gom chu hoa, so, _, - va dai 3-30 ky tu');
    }

    const discountType = String(payload.discountType || 'percentage').trim().toLowerCase();
    if (!['percentage', 'fixed'].includes(discountType)) {
      throw badRequest('Loai giam gia khong hop le');
    }

    const discountValue = Number(payload.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw badRequest('Gia tri giam gia phai lon hon 0');
    }

    if (discountType === 'percentage' && discountValue > 100) {
      throw badRequest('Phan tram giam gia khong duoc vuot qua 100');
    }

    const minOrderAmountRaw = Number(payload.minOrderAmount || 0);
    if (!Number.isFinite(minOrderAmountRaw) || minOrderAmountRaw < 0) {
      throw badRequest('Don toi thieu khong hop le');
    }
    const minOrderAmount = Math.round(minOrderAmountRaw);

    const maxDiscountAmount = this._normalizeNullableAmount(payload.maxDiscountAmount, 'Giam toi da');
    const usageLimit = this._normalizeNullableInt(payload.usageLimit, 'So luot su dung');

    const startsAt = this._normalizeDateInput(payload.startsAt, 'Thoi gian bat dau');
    const expiresAt = this._normalizeDateInput(payload.expiresAt, 'Thoi gian ket thuc');

    if (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt)) {
      throw badRequest('Thoi gian ket thuc phai sau thoi gian bat dau');
    }

    const isActive = payload.isActive === undefined ? 1 : (payload.isActive ? 1 : 0);

    try {
      const [result] = await db.execute(
        `INSERT INTO discount_codes
          (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, starts_at, expires_at, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          discountType,
          discountValue,
          minOrderAmount,
          maxDiscountAmount,
          usageLimit,
          startsAt,
          expiresAt,
          isActive,
          adminId || null,
        ]
      );

      const [rows] = await db.execute(
        `SELECT dc.*, u.fullname AS created_by_name
         FROM discount_codes dc
         LEFT JOIN users u ON u.user_id = dc.created_by
         WHERE dc.discount_id = ?
         LIMIT 1`,
        [result.insertId]
      );

      return rows[0] || null;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw badRequest('Ma giam gia da ton tai');
      }
      throw err;
    }
  }

  static async getAll() {
    try {
      const [rows] = await db.execute(
        `SELECT dc.*, u.fullname AS created_by_name
         FROM discount_codes dc
         LEFT JOIN users u ON u.user_id = dc.created_by
         ORDER BY dc.created_at DESC`
      );
      return rows;
    } catch (err) {
      // Table chưa được tạo (chưa chạy migration) → trả về mảng rỗng thay vì crash
      if (err.code === 'ER_NO_SUCH_TABLE') return [];
      throw err;
    }
  }

  static async _getById(discountId, conn = db, lockForUpdate = false) {
    const sql = `SELECT * FROM discount_codes WHERE discount_id = ? LIMIT 1${lockForUpdate ? ' FOR UPDATE' : ''}`;
    const [rows] = await conn.execute(sql, [discountId]);
    return rows[0] || null;
  }

  static async _getDetailById(discountId) {
    const [rows] = await db.execute(
      `SELECT dc.*, u.fullname AS created_by_name
       FROM discount_codes dc
       LEFT JOIN users u ON u.user_id = dc.created_by
       WHERE dc.discount_id = ?
       LIMIT 1`,
      [discountId]
    );

    return rows[0] || null;
  }

  static async update(discountId, payload) {
    const id = Number(discountId);
    if (!Number.isInteger(id) || id <= 0) {
      throw badRequest('ID ma giam gia khong hop le');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const current = await this._getById(id, conn, true);
      if (!current) {
        throw notFound('Ma giam gia khong ton tai');
      }

      const code = payload.code !== undefined
        ? this.normalizeCode(payload.code)
        : this.normalizeCode(current.code);

      if (!code) {
        throw badRequest('Ma giam gia khong duoc de trong');
      }

      if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
        throw badRequest('Ma giam gia chi gom chu hoa, so, _, - va dai 3-30 ky tu');
      }

      const discountType = payload.discountType !== undefined
        ? String(payload.discountType || '').trim().toLowerCase()
        : String(current.discount_type || 'percentage').trim().toLowerCase();
      if (!['percentage', 'fixed'].includes(discountType)) {
        throw badRequest('Loai giam gia khong hop le');
      }

      const discountValue = payload.discountValue !== undefined
        ? Number(payload.discountValue)
        : Number(current.discount_value);
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        throw badRequest('Gia tri giam gia phai lon hon 0');
      }
      if (discountType === 'percentage' && discountValue > 100) {
        throw badRequest('Phan tram giam gia khong duoc vuot qua 100');
      }

      const minOrderAmountRaw = payload.minOrderAmount !== undefined
        ? Number(payload.minOrderAmount || 0)
        : Number(current.min_order_amount || 0);
      if (!Number.isFinite(minOrderAmountRaw) || minOrderAmountRaw < 0) {
        throw badRequest('Don toi thieu khong hop le');
      }
      const minOrderAmount = Math.round(minOrderAmountRaw);

      const maxDiscountAmount = payload.maxDiscountAmount !== undefined
        ? this._normalizeNullableAmount(payload.maxDiscountAmount, 'Giam toi da')
        : this._normalizeNullableAmount(current.max_discount_amount, 'Giam toi da');

      const usageLimit = payload.usageLimit !== undefined
        ? this._normalizeNullableInt(payload.usageLimit, 'So luot su dung')
        : this._normalizeNullableInt(current.usage_limit, 'So luot su dung');

      const startsAt = payload.startsAt !== undefined
        ? this._normalizeDateInput(payload.startsAt, 'Thoi gian bat dau')
        : this._normalizeDateInput(current.starts_at, 'Thoi gian bat dau');

      const expiresAt = payload.expiresAt !== undefined
        ? this._normalizeDateInput(payload.expiresAt, 'Thoi gian ket thuc')
        : this._normalizeDateInput(current.expires_at, 'Thoi gian ket thuc');

      if (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt)) {
        throw badRequest('Thoi gian ket thuc phai sau thoi gian bat dau');
      }

      const usedCount = Number(current.used_count || 0);
      if (usageLimit != null && usageLimit < usedCount) {
        throw badRequest('So luot su dung khong duoc nho hon so luot da dung');
      }

      if (code !== current.code) {
        const [refRows] = await conn.execute(
          'SELECT COUNT(*) AS count FROM orders WHERE discount_code = ?',
          [current.code]
        );
        if (Number(refRows[0]?.count || 0) > 0) {
          throw badRequest('Khong the thay doi ma giam gia da duoc su dung trong don hang');
        }
      }

      const isActive = payload.isActive === undefined
        ? toTinyIntBoolean(current.is_active, 1)
        : toTinyIntBoolean(payload.isActive, 1);

      await conn.execute(
        `UPDATE discount_codes
         SET code = ?,
             discount_type = ?,
             discount_value = ?,
             min_order_amount = ?,
             max_discount_amount = ?,
             usage_limit = ?,
             starts_at = ?,
             expires_at = ?,
             is_active = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE discount_id = ?`,
        [
          code,
          discountType,
          discountValue,
          minOrderAmount,
          maxDiscountAmount,
          usageLimit,
          startsAt,
          expiresAt,
          isActive,
          id,
        ]
      );

      await conn.commit();
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // Ignore rollback error and throw the original one.
      }

      if (err.code === 'ER_DUP_ENTRY') {
        throw badRequest('Ma giam gia da ton tai');
      }

      throw err;
    } finally {
      conn.release();
    }

    return this._getDetailById(id);
  }

  static async deleteById(discountId) {
    const id = Number(discountId);
    if (!Number.isInteger(id) || id <= 0) {
      throw badRequest('ID ma giam gia khong hop le');
    }

    const current = await this._getById(id);
    if (!current) {
      throw notFound('Ma giam gia khong ton tai');
    }

    await db.execute('DELETE FROM discount_codes WHERE discount_id = ?', [id]);
    return { message: 'Xoa ma giam gia thanh cong' };
  }

  static async _getByCode(code, conn = db, lockForUpdate = false) {
    const sql = `SELECT * FROM discount_codes WHERE code = ? LIMIT 1${lockForUpdate ? ' FOR UPDATE' : ''}`;
    const [rows] = await conn.execute(sql, [code]);
    return rows[0] || null;
  }

  static calculateDiscount(codeRow, subtotalAmount) {
    const subtotal = toAmount(subtotalAmount);
    if (subtotal <= 0) {
      return { isValid: false, message: 'Don hang khong hop le' };
    }

    if (!codeRow) {
      return { isValid: false, message: 'Ma giam gia khong ton tai' };
    }

    if (!codeRow.is_active) {
      return { isValid: false, message: 'Ma giam gia da bi vo hieu hoa' };
    }

    const now = Date.now();
    if (codeRow.starts_at) {
      const startsAt = new Date(codeRow.starts_at).getTime();
      if (Number.isFinite(startsAt) && now < startsAt) {
        return { isValid: false, message: 'Ma giam gia chua den thoi gian su dung' };
      }
    }

    if (codeRow.expires_at) {
      const expiresAt = new Date(codeRow.expires_at).getTime();
      if (Number.isFinite(expiresAt) && now > expiresAt) {
        return { isValid: false, message: 'Ma giam gia da het han' };
      }
    }

    const usageLimit = codeRow.usage_limit == null ? null : Number(codeRow.usage_limit);
    const usedCount = Number(codeRow.used_count || 0);

    if (usageLimit != null && usedCount >= usageLimit) {
      return { isValid: false, message: 'Ma giam gia da het luot su dung' };
    }

    const minOrderAmount = toAmount(codeRow.min_order_amount);
    if (subtotal < minOrderAmount) {
      return {
        isValid: false,
        message: `Don hang toi thieu ${minOrderAmount.toLocaleString('vi-VN')} VND de dung ma nay`,
      };
    }

    const discountType = String(codeRow.discount_type || '').toLowerCase();
    const discountValue = Number(codeRow.discount_value || 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = Math.round((subtotal * discountValue) / 100);
    } else if (discountType === 'fixed') {
      discountAmount = Math.round(discountValue);
    } else {
      return { isValid: false, message: 'Loai ma giam gia khong hop le' };
    }

    const maxDiscountAmount = codeRow.max_discount_amount == null
      ? null
      : toAmount(codeRow.max_discount_amount);

    if (maxDiscountAmount != null) {
      discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }

    discountAmount = Math.min(discountAmount, subtotal);

    if (discountAmount <= 0) {
      return { isValid: false, message: 'Ma giam gia khong ap dung cho don hang nay' };
    }

    const finalAmount = subtotal - discountAmount;

    return {
      isValid: true,
      code: codeRow.code,
      discountType,
      discountValue,
      subtotalAmount: subtotal,
      discountAmount,
      finalAmount,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      usedCount,
      expiresAt: codeRow.expires_at,
    };
  }

  static async validateForCheckout(rawCode, subtotalAmount) {
    const code = this.normalizeCode(rawCode);
    if (!code) {
      throw badRequest('Vui long nhap ma giam gia');
    }

    const row = await this._getByCode(code);
    const result = this.calculateDiscount(row, subtotalAmount);

    if (!result.isValid) {
      throw badRequest(result.message);
    }

    return result;
  }

  static async applyCodeWithinTransaction(conn, rawCode, subtotalAmount) {
    const code = this.normalizeCode(rawCode);
    if (!code) {
      throw badRequest('Vui long nhap ma giam gia');
    }

    const row = await this._getByCode(code, conn, true);
    const result = this.calculateDiscount(row, subtotalAmount);

    if (!result.isValid) {
      throw badRequest(result.message);
    }

    await conn.execute(
      'UPDATE discount_codes SET used_count = used_count + 1 WHERE discount_id = ?',
      [row.discount_id]
    );

    return result;
  }
}

module.exports = DiscountCode;
