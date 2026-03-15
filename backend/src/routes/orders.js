const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/orders - User's orders
router.get('/', async (req, res) => {
  try {
    await Order.reconcilePendingSepayOrders(req.user.userId);
    const orders = await Order.getUserOrders(req.user.userId);
    res.json(orders);
  } catch (err) {
    console.error('Get user orders error:', err);
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

// POST /api/orders/:id/cancel - Cancel an order
router.post('/:id/cancel', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do hủy đơn hàng' });
    }

    const order = await Order.getById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
    }

    // Only the owner can cancel
    if (order.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn hàng này' });
    }

    // Only pending or pending_payment orders can be cancelled
    if (!['pending', 'pending_payment'].includes(order.status)) {
      return res.status(400).json({ error: 'Đơn hàng không thể hủy (trạng thái: ' + order.status + ')' });
    }

    await Order.updateStatus(orderId, 'cancelled');
    // Log cancellation with reason
    await Order.logPaymentApproval(orderId, req.user.userId, 'cancelled', reason.trim());

    res.json({ message: 'Đơn hàng đã được hủy thành công' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Lỗi hủy đơn hàng' });
  }
});

// POST /api/orders/instant-checkout
// Creates order from cart with pending_payment status
// Admin must verify payment before approving
router.post('/instant-checkout', async (req, res) => {
  try {
    const { note } = req.body;

    const cartItems = await Cart.getUserCart(req.user.userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống' });
    }

    // Create order with pending_payment status — admin will verify bank transfer and approve
    const orderId = await Order.create(req.user.userId, cartItems, 'bank_transfer', note || 'Thanh toán chuyển khoản ngân hàng');

    res.status(201).json({
      message: 'Đặt hàng thành công! Vui lòng chuyển khoản và chờ Admin xác nhận.',
      orderId,
      totalAmount: cartItems.reduce((sum, c) => sum + c.price, 0),
    });
  } catch (err) {
    console.error('Instant checkout error:', err);
    res.status(500).json({ error: 'Lỗi tạo đơn hàng' });
  }
});

module.exports = router;
