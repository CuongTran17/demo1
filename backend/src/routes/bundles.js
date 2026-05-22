const express = require('express');
const CourseBundle = require('../models/CourseBundle');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const bundles = await CourseBundle.getAll();
    res.json({ bundles });
  } catch (err) {
    console.error('Get bundles error:', err);
    res.status(500).json({ error: 'Lỗi tải combo khóa học' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bundle = await CourseBundle.getById(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Combo không tồn tại' });
    res.json({ bundle });
  } catch (err) {
    console.error('Get bundle detail error:', err);
    res.status(500).json({ error: 'Lỗi tải chi tiết combo' });
  }
});

router.get('/:id/related', async (req, res) => {
  try {
    const relatedCourses = await CourseBundle.getRelatedCourses(req.params.id, req.query.limit || 6);
    res.json({ courses: relatedCourses });
  } catch (err) {
    console.error('Get bundle related courses error:', err);
    res.status(500).json({ error: 'Lỗi tải khóa học liên quan' });
  }
});

module.exports = router;
