const express = require('express');
const Cart = require('../models/Cart');
const Course = require('../models/Course');
const FlashSale = require('../models/FlashSale');
const Notification = require('../models/Notification');
const CourseBundle = require('../models/CourseBundle');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All cart routes require authentication
router.use(auth);

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    await Notification.checkAbandonedCart(req.user.userId);
    const rawItems = await Cart.getUserCart(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    const count = await Cart.getCartCount(req.user.userId);

    const flashSale = await FlashSale.getActivePublicSale();
    const items = FlashSale.applyToItems(rawItems, flashSale);

    const bundleTotal = bundles.reduce((sum, bundle) => sum + Number(bundle.bundle_price || 0), 0);
    const total = items.reduce((sum, item) => sum + item.price, 0) + bundleTotal;
    res.json({ items, bundles, count: count + bundles.length, total, flashSale: flashSale || null });
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

// POST /api/cart/bundles/add
router.post('/bundles/add', async (req, res) => {
  try {
    const { bundleId } = req.body;
    if (!bundleId) return res.status(400).json({ error: 'Thieu bundleId' });
    const bundle = await CourseBundle.addToCart(req.user.userId, bundleId);
    res.json({ message: 'Da them combo vao gio hang', bundle });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Loi them combo vao gio hang' });
  }
});

// DELETE /api/cart/bundles/:bundleId
router.delete('/bundles/:bundleId', async (req, res) => {
  try {
    await CourseBundle.removeFromCart(req.user.userId, req.params.bundleId);
    const count = await Cart.getCartCount(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    res.json({ message: 'Da xoa combo khoi gio hang', count: count + bundles.length });
  } catch (err) {
    res.status(500).json({ error: 'Loi xoa combo khoi gio hang' });
  }
});

// POST /api/cart/merge
router.post('/merge', async (req, res) => {
  try {
    const rawCourseIds = Array.isArray(req.body?.courseIds) ? req.body.courseIds : [];
    const courseIds = [...new Set(rawCourseIds.map((id) => String(id || '').trim()).filter(Boolean))];

    if (courseIds.length === 0) {
      const rawItems = await Cart.getUserCart(req.user.userId);
      const bundles = await CourseBundle.getCartBundles(req.user.userId);
      const flashSale = await FlashSale.getActivePublicSale();
      const items = FlashSale.applyToItems(rawItems, flashSale);
      const bundleTotal = bundles.reduce((sum, bundle) => sum + Number(bundle.bundle_price || 0), 0);
      return res.json({ items, bundles, count: items.length + bundles.length, total: items.reduce((sum, item) => sum + item.price, 0) + bundleTotal, flashSale: flashSale || null });
    }

    for (const courseId of courseIds) {
      const course = await Course.getById(courseId);
      if (!course) continue;

      const hasPurchased = await Course.hasUserPurchased(req.user.userId, courseId);
      if (hasPurchased) continue;

      await Cart.addToCartIgnore(req.user.userId, courseId);
    }

    const rawItems = await Cart.getUserCart(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    const flashSale = await FlashSale.getActivePublicSale();
    const items = FlashSale.applyToItems(rawItems, flashSale);
    const bundleTotal = bundles.reduce((sum, bundle) => sum + Number(bundle.bundle_price || 0), 0);
    const total = items.reduce((sum, item) => sum + item.price, 0) + bundleTotal;

    return res.json({ items, bundles, count: items.length + bundles.length, total, flashSale: flashSale || null });
  } catch (err) {
    console.error('Cart merge error:', err);
    return res.status(500).json({ error: 'Lá»—i server' });
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
    await CourseBundle.clearCart(req.user.userId);
    res.json({ message: 'Đã xóa toàn bộ giỏ hàng' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/cart/count
router.get('/count', async (req, res) => {
  try {
    const count = await Cart.getCartCount(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    res.json({ count: count + bundles.length });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
