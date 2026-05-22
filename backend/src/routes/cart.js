const express = require('express');
const Cart = require('../models/Cart');
const Course = require('../models/Course');
const FlashSale = require('../models/FlashSale');
const Notification = require('../models/Notification');
const CourseBundle = require('../models/CourseBundle');
const CartUpsell = require('../models/CartUpsell');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

async function buildCartPayload(userId) {
  await Notification.checkAbandonedCart(userId);
  const rawItems = await Cart.getUserCart(userId);
  const bundles = await CourseBundle.getCartBundles(userId);
  const flashSale = await FlashSale.getActivePublicSale();
  const flashSaleItems = FlashSale.applyToItems(rawItems, flashSale);
  const discounted = await CartUpsell.applyDiscounts(userId, flashSaleItems, bundles);
  const items = discounted.courses;
  const pricedBundles = discounted.bundles;
  const total = Math.round(
    items.reduce((sum, item) => sum + Number(item.price || 0), 0) +
    pricedBundles.reduce((sum, bundle) => sum + Number(bundle.bundle_price || 0), 0)
  );

  return {
    items,
    bundles: pricedBundles,
    count: items.length + pricedBundles.length,
    total,
    flashSale: flashSale || null,
  };
}

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    res.json(await buildCartPayload(req.user.userId));
  } catch (err) {
    console.error('Cart get error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/cart/upsell-suggestions
router.get('/upsell-suggestions', async (req, res) => {
  try {
    const suggestions = await CartUpsell.getSuggestions(req.user.userId);
    res.json(suggestions);
  } catch (err) {
    console.error('Cart upsell suggestions error:', err);
    res.status(500).json({ error: 'Lỗi tải gợi ý mua kèm' });
  }
});

// POST /api/cart/upsell/add
router.post('/upsell/add', async (req, res) => {
  try {
    const { itemType, itemId } = req.body || {};
    const suggestion = await CartUpsell.addSuggestionToCart(req.user.userId, itemType, itemId);
    res.json({
      message: 'Đã thêm ưu đãi mua kèm vào giỏ hàng',
      suggestion,
      cart: await buildCartPayload(req.user.userId),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Lỗi thêm gợi ý mua kèm' });
  }
});

// POST /api/cart/add
router.post('/add', async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });

    const hasPurchased = await Course.hasUserPurchased(req.user.userId, courseId);
    if (hasPurchased) {
      return res.status(400).json({ error: 'Bạn đã mua khóa học này rồi' });
    }

    await Cart.addToCart(req.user.userId, courseId);
    await CartUpsell.clearItem(req.user.userId, 'course', courseId);
    const count = await Cart.getCartCount(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    res.json({ message: 'Đã thêm vào giỏ hàng', count: count + bundles.length });
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
    if (!bundleId) return res.status(400).json({ error: 'Thiếu bundleId' });
    const bundle = await CourseBundle.addToCart(req.user.userId, bundleId);
    await CartUpsell.clearItem(req.user.userId, 'bundle', bundleId);
    res.json({ message: 'Đã thêm combo vào giỏ hàng', bundle });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Lỗi thêm combo vào giỏ hàng' });
  }
});

// DELETE /api/cart/bundles/:bundleId
router.delete('/bundles/:bundleId', async (req, res) => {
  try {
    await CourseBundle.removeFromCart(req.user.userId, req.params.bundleId);
    await CartUpsell.clearItem(req.user.userId, 'bundle', req.params.bundleId);
    const count = await Cart.getCartCount(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    res.json({ message: 'Đã xóa combo khỏi giỏ hàng', count: count + bundles.length });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa combo khỏi giỏ hàng' });
  }
});

// POST /api/cart/merge
router.post('/merge', async (req, res) => {
  try {
    const rawCourseIds = Array.isArray(req.body?.courseIds) ? req.body.courseIds : [];
    const courseIds = [...new Set(rawCourseIds.map((id) => String(id || '').trim()).filter(Boolean))];

    for (const courseId of courseIds) {
      const course = await Course.getById(courseId);
      if (!course) continue;
      const hasPurchased = await Course.hasUserPurchased(req.user.userId, courseId);
      if (hasPurchased) continue;
      await Cart.addToCartIgnore(req.user.userId, courseId);
    }

    return res.json(await buildCartPayload(req.user.userId));
  } catch (err) {
    console.error('Cart merge error:', err);
    return res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/cart/:courseId
router.delete('/:courseId', async (req, res) => {
  try {
    await Cart.removeFromCart(req.user.userId, req.params.courseId);
    await CartUpsell.clearItem(req.user.userId, 'course', req.params.courseId);
    const count = await Cart.getCartCount(req.user.userId);
    const bundles = await CourseBundle.getCartBundles(req.user.userId);
    res.json({ message: 'Đã xóa khỏi giỏ hàng', count: count + bundles.length });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/cart
router.delete('/', async (req, res) => {
  try {
    await Cart.clearCart(req.user.userId);
    await CourseBundle.clearCart(req.user.userId);
    await CartUpsell.clearUser(req.user.userId);
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
