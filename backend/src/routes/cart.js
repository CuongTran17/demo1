const express = require('express');
const Cart = require('../models/Cart');
const Course = require('../models/Course');
const FlashSale = require('../models/FlashSale');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All cart routes require authentication
router.use(auth);

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const rawItems = await Cart.getUserCart(req.user.userId);
    const count = await Cart.getCartCount(req.user.userId);

    const flashSale = await FlashSale.getActivePublicSale();
    const items = FlashSale.applyToItems(rawItems, flashSale);

    const total = items.reduce((sum, item) => sum + item.price, 0);
    res.json({ items, count, total, flashSale: flashSale || null });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/cart/add
router.post('/add', async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });

    // Check if already purchased
    const hasPurchased = await Course.hasUserPurchased(req.user.userId, courseId);
    if (hasPurchased) {
      return res.status(400).json({ error: 'Bạn đã mua khóa học này rồi' });
    }

    await Cart.addToCart(req.user.userId, courseId);
    const count = await Cart.getCartCount(req.user.userId);
    res.json({ message: 'Đã thêm vào giỏ hàng', count });
  } catch (err) {
    if (err.message === 'Course already in cart') {
      return res.status(400).json({ error: 'Khóa học đã có trong giỏ hàng' });
    }
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/cart/:courseId
router.delete('/:courseId', async (req, res) => {
  try {
    await Cart.removeFromCart(req.user.userId, req.params.courseId);
    const count = await Cart.getCartCount(req.user.userId);
    res.json({ message: 'Đã xóa khỏi giỏ hàng', count });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/cart (clear all)
router.delete('/', async (req, res) => {
  try {
    await Cart.clearCart(req.user.userId);
    res.json({ message: 'Đã xóa toàn bộ giỏ hàng' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/cart/count
router.get('/count', async (req, res) => {
  try {
    const count = await Cart.getCartCount(req.user.userId);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
