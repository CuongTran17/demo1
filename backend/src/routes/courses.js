const express = require('express');
const Course = require('../models/Course');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses - List all or by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const courses = category
      ? await Course.getByCategory(category)
      : await Course.getAll();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/courses/search
router.get('/search', async (req, res) => {
  try {
    const { q: keyword, category, price: priceRange, sort: sortBy } = req.query;
    const courses = await Course.search({ keyword, category, priceRange, sortBy });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/courses/categories
router.get('/categories', async (req, res) => {
  const categories = await Course.getCategories();
  res.json(categories);
});

// GET /api/courses/my-courses (purchased courses)
router.get('/my-courses', auth, async (req, res) => {
  try {
    const courses = await Course.getUserCourses(req.user.userId);
    res.json(courses);
  } catch (err) {
    console.error('[my-courses] error:', err.message, err.sqlMessage || '');
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/courses/purchased-ids
router.get('/purchased-ids', auth, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const ids = await Order.getPurchasedCourseIds(req.user.userId);
    res.json(ids);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/courses/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.getById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Khóa học không tồn tại' });

    let hasPurchased = false;
    if (req.user) {
      hasPurchased = await Course.hasUserPurchased(req.user.userId, req.params.id);
    }

    res.json({ ...course, hasPurchased });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
