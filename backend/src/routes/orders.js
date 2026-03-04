const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/orders - User's orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.getUserOrders(req.user.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/orders - Create order from cart
router.post('/', async (req, res) => {
  try {
    const { paymentMethod = 'bank_transfer', note } = req.body;

    // Get cart items
    const cartItems = await Cart.getUserCart(req.user.userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống' });
    }

    const orderId = await Order.create(req.user.userId, cartItems, paymentMethod, note);

    res.status(201).json({
      message: 'Đặt hàng thành công',
      orderId,
      totalAmount: cartItems.reduce((sum, c) => sum + c.price, 0),
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/orders/purchased-courses
router.get('/purchased-courses', async (req, res) => {
  try {
    const ids = await Order.getPurchasedCourseIds(req.user.userId);
    res.json(ids);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/orders/instant-checkout
// Creates order from cart AND immediately marks it as completed (auto-confirm)
// Used for bank transfer / demo mode - no admin manual approval needed
router.post('/instant-checkout', async (req, res) => {
  try {
    const { note } = req.body;

    const cartItems = await Cart.getUserCart(req.user.userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống' });
    }

    // Create order and immediately complete it (grants course access)
    const orderId = await Order.create(req.user.userId, cartItems, 'bank_transfer', note || 'Thanh toán chuyển khoản');
    await Order.updateStatus(orderId, 'completed');
    await Order.logPaymentApproval(orderId, null, 'auto_bank_transfer', 'Tự động xác nhận - chuyển khoản ngân hàng');

    res.status(201).json({
      message: 'Thanh toán thành công! Khóa học đã được kích hoạt.',
      orderId,
      totalAmount: cartItems.reduce((sum, c) => sum + c.price, 0),
    });
  } catch (err) {
    console.error('Instant checkout error:', err);
    res.status(500).json({ error: 'Lỗi tạo đơn hàng' });
  }
});

module.exports = router;
