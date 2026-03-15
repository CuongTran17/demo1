const db = require('../config/database');
const { SePayPgClient } = require('sepay-pg-node');

function normalizeSepayEnv(rawEnv, merchantId, secretKey) {
  const env = String(rawEnv || '').trim().toLowerCase();

  if (env === 'sandbox' || env === 'test') {
    return 'sandbox';
  }

  if (env === 'production' || env === 'prod' || env === 'live') {
    return 'production';
  }

  const looksLikeLiveCredentials =
    String(merchantId || '').toUpperCase().includes('LIVE') ||
    String(secretKey || '').startsWith('spsk_live_');

  return looksLikeLiveCredentials ? 'production' : 'sandbox';
}

function mapSepayOrderStatusToLocalStatus(sepayStatus) {
  const status = String(sepayStatus || '').trim().toUpperCase();

  const successStatuses = new Set(['CAPTURED', 'COMPLETED', 'SUCCESS', 'SUCCEEDED', 'PAID']);
  const failedStatuses = new Set(['CANCEL', 'CANCELLED', 'CANCELED', 'EXPIRED', 'FAILED', 'DECLINED', 'VOIDED']);

  if (successStatuses.has(status)) return 'completed';
  if (failedStatuses.has(status)) return 'cancelled';
  return null;
}

class Order {
  static async getById(orderId) {
    const [rows] = await db.execute('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    return rows[0] || null;
  }

  static async create(userId, courses, paymentMethod, note = null) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const totalAmount = courses.reduce((sum, c) => sum + c.price, 0);
      const status = 'pending_payment';

      const [orderResult] = await conn.execute(
        'INSERT INTO orders (user_id, total_amount, payment_method, order_note, status) VALUES (?, ?, ?, ?, ?)',
        [userId, totalAmount, paymentMethod, note, status]
      );
      const orderId = orderResult.insertId;

      for (const course of courses) {
        await conn.execute(
          'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)',
          [orderId, course.course_id, course.price]
        );
      }

      // Clear cart
      await conn.execute('DELETE FROM cart WHERE user_id = ?', [userId]);

      await conn.commit();
      return orderId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getUserOrders(userId) {
    const [orders] = await db.execute(
      `SELECT o.*, 
       (SELECT JSON_ARRAYAGG(JSON_OBJECT(
         'course_id', oi.course_id, 'price', oi.price, 
         'course_name', c.course_name, 'thumbnail', c.thumbnail, 'category', c.category
       )) FROM order_items oi JOIN courses c ON oi.course_id = c.course_id WHERE oi.order_id = o.order_id) as items
       FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
      [userId]
    );
    return orders.map(o => {
      let items = o.items;
      if (typeof items === 'string') items = JSON.parse(items || '[]');
      if (!items) items = [];
      return { ...o, items };
    });
  }

  static async getPendingPaymentOrders() {
    const [orders] = await db.execute(
      `SELECT o.*, u.fullname, u.email,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT(
         'course_id', oi.course_id, 'price', oi.price, 'course_name', c.course_name
       )) FROM order_items oi JOIN courses c ON oi.course_id = c.course_id WHERE oi.order_id = o.order_id) as items
       FROM orders o JOIN users u ON o.user_id = u.user_id 
       WHERE o.status = 'pending_payment' ORDER BY o.created_at DESC`
    );
    return orders.map(o => {
      let items = o.items;
      if (typeof items === 'string') items = JSON.parse(items || '[]');
      if (!items) items = [];
      return { ...o, items };
    });
  }

  static async updateStatus(orderId, status) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);

      // If approved, grant course access
      if (status === 'completed') {
        const [items] = await conn.execute(
          'SELECT oi.course_id, o.user_id FROM order_items oi JOIN orders o ON oi.order_id = o.order_id WHERE oi.order_id = ?',
          [orderId]
        );
        for (const item of items) {
          await conn.execute(
            'INSERT IGNORE INTO user_courses (user_id, course_id) VALUES (?, ?)',
            [item.user_id, item.course_id]
          );
          await conn.execute(
            'INSERT IGNORE INTO course_progress (user_id, course_id, progress_percentage, total_hours, status) VALUES (?, ?, 0, 0, ?)',
            [item.user_id, item.course_id, 'in_progress']
          );
          // Increment students count
          await conn.execute(
            'UPDATE courses SET students_count = students_count + 1 WHERE course_id = ?',
            [item.course_id]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async logPaymentApproval(orderId, adminId, action, note) {
    let effectiveAdminId = adminId;

    if (effectiveAdminId == null) {
      const [admins] = await db.execute(
        "SELECT user_id FROM users WHERE email = 'admin@ptit.edu.vn' LIMIT 1"
      );
      effectiveAdminId = admins[0]?.user_id || null;
    }

    if (effectiveAdminId == null) {
      console.warn(`Skip payment history log for order #${orderId}: admin_id is unavailable`);
      return;
    }

    await db.execute(
      'INSERT INTO payment_approval_history (order_id, admin_id, action, note) VALUES (?, ?, ?, ?)',
      [orderId, effectiveAdminId, action, note]
    );
  }

  static async getPaymentHistory() {
    const [rows] = await db.execute(
      `SELECT o.order_id, o.total_amount, o.payment_method, o.status, o.created_at,
       u.fullname, u.email,
       pah.action, pah.note as approval_note, pah.action_time,
       a.fullname as admin_name
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN payment_approval_history pah ON pah.order_id = o.order_id
       LEFT JOIN users a ON pah.admin_id = a.user_id
       WHERE o.status IN ('completed', 'rejected', 'cancelled')
       ORDER BY o.created_at DESC`
    );
    return rows;
  }

  static async getPurchasedCourseIds(userId) {
    const [rows] = await db.execute(
      'SELECT course_id FROM user_courses WHERE user_id = ?',
      [userId]
    );
    return rows.map(r => r.course_id);
  }

  // Revenue statistics
  static async getTotalRevenue() {
    const [rows] = await db.execute(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'"
    );
    return rows[0].total;
  }

  static async getUserRevenueDetails() {
    const [rows] = await db.execute(
      `SELECT u.user_id, u.fullname, u.email, 
       COUNT(DISTINCT o.order_id) as order_count,
       COALESCE(SUM(o.total_amount), 0) as total_spent,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('course_id', c.course_id, 'course_name', c.course_name, 'price', oi2.price))
        FROM user_courses uc2 
        JOIN courses c ON uc2.course_id = c.course_id
        LEFT JOIN order_items oi2 ON oi2.course_id = c.course_id
        WHERE uc2.user_id = u.user_id) as purchased_courses
       FROM users u
       JOIN orders o ON u.user_id = o.user_id AND o.status = 'completed'
       GROUP BY u.user_id
       ORDER BY total_spent DESC`
    );
    return rows.map(r => {
      let purchased_courses = r.purchased_courses;
      if (typeof purchased_courses === 'string') purchased_courses = JSON.parse(purchased_courses || '[]');
      if (!purchased_courses) purchased_courses = [];
      return { ...r, purchased_courses };
    });
  }

  static _createSepayClientFromEnv() {
    const merchantId = process.env.SEPAY_MERCHANT_ID;
    const secretKey = process.env.SEPAY_SECRET_KEY;

    if (!merchantId || !secretKey) {
      return null;
    }

    const env = normalizeSepayEnv(process.env.SEPAY_ENV, merchantId, secretKey);
    return new SePayPgClient({
      env,
      merchant_id: merchantId,
      secret_key: secretKey,
    });
  }

  static async reconcilePendingSepayOrders(userId = null) {
    const sepayClient = this._createSepayClientFromEnv();
    if (!sepayClient) {
      return { checked: 0, updated: 0 };
    }

    let pendingRows;
    if (userId != null) {
      const [rows] = await db.execute(
        `SELECT order_id, created_at
         FROM orders
         WHERE status = 'pending_payment' AND payment_method = 'sepay' AND user_id = ?`,
        [userId]
      );
      pendingRows = rows;
    } else {
      const [rows] = await db.execute(
        `SELECT order_id, created_at
         FROM orders
         WHERE status = 'pending_payment' AND payment_method = 'sepay'`
      );
      pendingRows = rows;
    }

    let updated = 0;

    for (const row of pendingRows) {
      const orderId = row.order_id;
      const invoiceNumber = `DH${orderId}`;

      try {
        const response = await sepayClient.order.retrieve(invoiceNumber);
        const sepayStatus = response?.data?.data?.order_status;
        const localStatus = mapSepayOrderStatusToLocalStatus(sepayStatus);

        if (!localStatus) {
          continue;
        }

        await this.updateStatus(orderId, localStatus);
        await this.logPaymentApproval(
          orderId,
          null,
          localStatus === 'completed' ? 'sepay_sync_ok' : 'sepay_sync_fail',
          `SePay order_status=${String(sepayStatus || '').toUpperCase() || 'UNKNOWN'}`
        );
        updated += 1;
      } catch (err) {
        const statusCode = err.response?.status;
        const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : 0;
        const isStale = Number.isFinite(createdAtMs) && createdAtMs > 0
          ? (Date.now() - createdAtMs) > (5 * 60 * 1000)
          : false;

        // Some cancelled/abandoned orders may return 404 from SePay API.
        // If the order is stale, mark it cancelled to prevent indefinite pending state.
        if (statusCode === 404 && isStale) {
          try {
            await this.updateStatus(orderId, 'cancelled');
            await this.logPaymentApproval(
              orderId,
              null,
              'sepay_sync_nf',
              'SePay detail not found (404), auto-cancelled after timeout'
            );
            updated += 1;
            continue;
          } catch (innerErr) {
            console.warn(`SePay 404 auto-cancel failed for order #${orderId}:`, innerErr.message);
          }
        }

        console.warn(`SePay reconcile failed for order #${orderId}:`, err.response?.data || err.message);
      }
    }

    return { checked: pendingRows.length, updated };
  }
}

module.exports = Order;
