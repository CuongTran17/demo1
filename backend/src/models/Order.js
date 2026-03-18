const db = require('../config/database');
const { SePayPgClient } = require('sepay-pg-node');
const DiscountCode = require('./DiscountCode');

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

function normalizeCurrencyValue(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function isPastIpnTimeout(createdAt, timeoutMs = 5 * 60 * 1000) {
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : 0;
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) {
    return false;
  }
  return (Date.now() - createdAtMs) > timeoutMs;
}

function allocateDiscountAcrossItems(items, subtotalAmount, discountAmount) {
  const normalizedItems = items.map((item, index) => ({
    ...item,
    price: normalizeCurrencyValue(item.price),
    index,
  }));

  const normalizedSubtotal = normalizeCurrencyValue(subtotalAmount)
    || normalizedItems.reduce((sum, item) => sum + item.price, 0);
  const normalizedDiscount = Math.max(0, normalizeCurrencyValue(discountAmount));

  if (!normalizedItems.length || normalizedSubtotal <= 0 || normalizedDiscount <= 0) {
    return normalizedItems.map(({ index, ...item }) => ({
      ...item,
      allocatedDiscount: 0,
      netRevenue: item.price,
    }));
  }

  const itemsWithDiscount = normalizedItems.map((item) => {
    const exactDiscount = (normalizedDiscount * item.price) / normalizedSubtotal;
    const allocatedDiscount = Math.floor(exactDiscount);

    return {
      ...item,
      exactDiscount,
      allocatedDiscount,
      fraction: exactDiscount - allocatedDiscount,
    };
  });

  let remainingDiscount = Math.max(
    0,
    normalizedDiscount - itemsWithDiscount.reduce((sum, item) => sum + item.allocatedDiscount, 0)
  );

  const byFractionDesc = [...itemsWithDiscount].sort((left, right) => {
    if (right.fraction !== left.fraction) return right.fraction - left.fraction;
    if (right.price !== left.price) return right.price - left.price;
    return left.index - right.index;
  });

  for (let pointer = 0; pointer < byFractionDesc.length && remainingDiscount > 0; pointer += 1) {
    byFractionDesc[pointer].allocatedDiscount += 1;
    remainingDiscount -= 1;

    if (pointer === byFractionDesc.length - 1 && remainingDiscount > 0) {
      pointer = -1;
    }
  }

  return itemsWithDiscount
    .sort((left, right) => left.index - right.index)
    .map(({ index, exactDiscount, fraction, ...item }) => ({
      ...item,
      netRevenue: Math.max(0, item.price - item.allocatedDiscount),
    }));
}

class Order {
  static async getById(orderId) {
    const [rows] = await db.execute('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    return rows[0] || null;
  }

  static async create(userId, courses, paymentMethod, note = null, discountCode = null) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const subtotalAmount = Math.round(courses.reduce((sum, c) => sum + Number(c.price || 0), 0));
      let appliedDiscountCode = null;
      let discountAmount = 0;

      if (discountCode) {
        const discountResult = await DiscountCode.applyCodeWithinTransaction(conn, discountCode, subtotalAmount);
        appliedDiscountCode = discountResult.code;
        discountAmount = discountResult.discountAmount;
      }

      const totalAmount = Math.max(0, subtotalAmount - discountAmount);
      const status = 'pending_payment';

      const [orderResult] = await conn.execute(
        `INSERT INTO orders
          (user_id, subtotal_amount, discount_code, discount_amount, total_amount, payment_method, order_note, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, subtotalAmount, appliedDiscountCode, discountAmount, totalAmount, paymentMethod, note, status]
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

  static async getTeacherRevenueSummary(teacherId) {
    const [teacherCourses] = await db.execute(
      `SELECT c.course_id, c.course_name, c.thumbnail, c.category, c.price
       FROM teacher_courses tc
       JOIN courses c ON c.course_id = tc.course_id
       WHERE tc.teacher_id = ?
       ORDER BY c.created_at DESC`,
      [teacherId]
    );

    const baseCourses = teacherCourses.map((course) => ({
      course_id: course.course_id,
      course_name: course.course_name,
      thumbnail: course.thumbnail,
      category: course.category,
      price: normalizeCurrencyValue(course.price),
      grossRevenue: 0,
      revenue: 0,
      unitsSold: 0,
      completedOrders: 0,
      lastSaleAt: null,
    }));

    if (!teacherCourses.length) {
      return {
        totalRevenue: 0,
        totalGrossRevenue: 0,
        totalSales: 0,
        completedOrders: 0,
        coursesWithSales: 0,
        courses: baseCourses,
      };
    }

    const courseIds = teacherCourses.map((course) => course.course_id);
    const coursePlaceholders = courseIds.map(() => '?').join(', ');
    const [orderRows] = await db.execute(
      `SELECT DISTINCT o.order_id, o.total_amount, o.created_at
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.order_id
       WHERE o.status = 'completed'
         AND oi.course_id IN (${coursePlaceholders})`,
      courseIds
    );

    if (!orderRows.length) {
      return {
        totalRevenue: 0,
        totalGrossRevenue: 0,
        totalSales: 0,
        completedOrders: 0,
        coursesWithSales: 0,
        courses: baseCourses,
      };
    }

    const orderIds = orderRows.map((order) => order.order_id);
    const orderPlaceholders = orderIds.map(() => '?').join(', ');
    const [allOrderItems] = await db.execute(
      `SELECT order_id, order_item_id, course_id, price
       FROM order_items
       WHERE order_id IN (${orderPlaceholders})
       ORDER BY order_id ASC, order_item_id ASC`,
      orderIds
    );

    const ordersById = new Map(orderRows.map((row) => [row.order_id, { ...row, items: [] }]));
    for (const item of allOrderItems) {
      const order = ordersById.get(item.order_id);
      if (order) {
        order.items.push(item);
      }
    }

    const courseStats = new Map(
      baseCourses.map((course) => [course.course_id, { ...course, orderIds: new Set() }])
    );

    for (const orderRow of orderRows) {
      const order = ordersById.get(orderRow.order_id);
      const orderItems = order?.items || [];
      const subtotalAmount = orderItems.reduce((sum, item) => sum + normalizeCurrencyValue(item.price), 0);
      const discountAmount = Math.max(0, subtotalAmount - normalizeCurrencyValue(orderRow.total_amount));
      const allocatedItems = allocateDiscountAcrossItems(
        orderItems,
        subtotalAmount,
        discountAmount
      );

      for (const item of allocatedItems) {
        const course = courseStats.get(item.course_id);
        if (!course) continue;

        course.grossRevenue += item.price;
        course.revenue += item.netRevenue;
        course.unitsSold += 1;
        course.orderIds.add(orderRow.order_id);

        if (!course.lastSaleAt || new Date(orderRow.created_at).getTime() > new Date(course.lastSaleAt).getTime()) {
          course.lastSaleAt = orderRow.created_at;
        }
      }
    }

    const courses = Array.from(courseStats.values())
      .map(({ orderIds: courseOrderIds, ...course }) => ({
        ...course,
        completedOrders: courseOrderIds.size,
      }))
      .sort((left, right) => {
        if (right.revenue !== left.revenue) return right.revenue - left.revenue;
        if (right.unitsSold !== left.unitsSold) return right.unitsSold - left.unitsSold;
        return String(left.course_name || '').localeCompare(String(right.course_name || ''), 'vi');
      });

    return {
      totalRevenue: courses.reduce((sum, course) => sum + course.revenue, 0),
      totalGrossRevenue: courses.reduce((sum, course) => sum + course.grossRevenue, 0),
      totalSales: courses.reduce((sum, course) => sum + course.unitsSold, 0),
      completedOrders: orderRows.length,
      coursesWithSales: courses.filter((course) => course.unitsSold > 0).length,
      courses,
    };
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

  static async _cancelPendingByTimeout(orderId, action, note) {
    const [result] = await db.execute(
      "UPDATE orders SET status = 'cancelled' WHERE order_id = ? AND status = 'pending_payment'",
      [orderId]
    );

    if (!result?.affectedRows) {
      return false;
    }

    await this.logPaymentApproval(orderId, null, action, note);
    return true;
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
      const isStale = isPastIpnTimeout(row.created_at);

      try {
        const response = await sepayClient.order.retrieve(invoiceNumber);
        const sepayStatus = response?.data?.data?.order_status;
        const localStatus = mapSepayOrderStatusToLocalStatus(sepayStatus);

        if (localStatus) {
          await this.updateStatus(orderId, localStatus);
          await this.logPaymentApproval(
            orderId,
            null,
            localStatus === 'completed' ? 'sepay_sync_ok' : 'sepay_sync_fail',
            `SePay order_status=${String(sepayStatus || '').toUpperCase() || 'UNKNOWN'}`
          );
          updated += 1;
          continue;
        }

        // SePay can return unresolved statuses while IPN has not arrived yet.
        // If the order is stale, auto-cancel to avoid indefinite "Chờ IPN".
        if (isStale) {
          const cancelled = await this._cancelPendingByTimeout(
            orderId,
            'sepay_sync_timeout',
            `No IPN after 5 minutes, auto-cancelled (SePay status: ${String(sepayStatus || '').toUpperCase() || 'UNKNOWN'})`
          );

          if (cancelled) {
            updated += 1;
          }
        }
      } catch (err) {
        const statusCode = err.response?.status;

        if (isStale) {
          try {
            const cancelled = await this._cancelPendingByTimeout(
              orderId,
              statusCode === 404 ? 'sepay_sync_nf' : 'sepay_sync_timeout_error',
              statusCode === 404
                ? 'SePay detail not found (404), auto-cancelled after 5 minutes'
                : `No IPN after 5 minutes (SePay error: ${statusCode || 'N/A'}), auto-cancelled`
            );

            if (cancelled) {
              updated += 1;
              continue;
            }
          } catch (innerErr) {
            console.warn(`SePay timeout auto-cancel failed for order #${orderId}:`, innerErr.message);
          }
        }

        console.warn(`SePay reconcile failed for order #${orderId}:`, err.response?.data || err.message);
      }
    }

    return { checked: pendingRows.length, updated };
  }
}

module.exports = Order;
