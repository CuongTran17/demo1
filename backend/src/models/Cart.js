const db = require('../config/database');

class Cart {
  static async getUserCart(userId) {
    const [rows] = await db.execute(
      `SELECT c.*, cart.cart_id, cart.added_at 
       FROM cart 
       JOIN courses c ON cart.course_id = c.course_id 
       WHERE cart.user_id = ? 
       ORDER BY cart.added_at DESC`,
      [userId]
    );
    return rows;
  }

  static async addToCart(userId, courseId) {
    // Check if already in cart
    const inCart = await Cart.isInCart(userId, courseId);
    if (inCart) throw new Error('Course already in cart');

    await db.execute(
      'INSERT INTO cart (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );
  }

  static async removeFromCart(userId, courseId) {
    await db.execute(
      'DELETE FROM cart WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
  }

  static async clearCart(userId) {
    await db.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
  }

  static async isInCart(userId, courseId) {
    const [rows] = await db.execute(
      'SELECT 1 FROM cart WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return rows.length > 0;
  }

  static async getCartCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM cart WHERE user_id = ?',
      [userId]
    );
    return rows[0].count;
  }
}

module.exports = Cart;
