const db = require('../config/database');

class Order {
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
    await db.execute(
      'INSERT INTO payment_approval_history (order_id, admin_id, action, note) VALUES (?, ?, ?, ?)',
      [orderId, adminId, action, note]
    );
  }

  static async getPaymentHistory() {
    const [rows] = await db.execute(
      `SELECT pah.*, u.fullname as admin_name 
       FROM payment_approval_history pah 
       LEFT JOIN users u ON pah.admin_id = u.user_id 
       ORDER BY pah.action_time DESC`
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
}

module.exports = Order;
