const express = require('express');
const Wishlist = require('../models/Wishlist');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const courses = await Wishlist.getByUser(req.user.userId);
    res.json({ courses, count: courses.length });
  } catch (err) {
    console.error('Wishlist get error:', err);
    res.status(500).json({ error: 'Loi tai danh sach yeu thich' });
  }
});

router.get('/ids', async (req, res) => {
  try {
    const courseIds = await Wishlist.getIdsByUser(req.user.userId);
    res.json({ courseIds, count: courseIds.length });
  } catch {
    res.status(500).json({ error: 'Loi tai danh sach yeu thich' });
  }
});

router.post('/:courseId', async (req, res) => {
  try {
    const course = await Course.getById(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Khoa hoc khong ton tai' });

    await Wishlist.add(req.user.userId, req.params.courseId);
    const count = await Wishlist.count(req.user.userId);
    res.json({ message: 'Da them vao yeu thich', courseId: req.params.courseId, count });
  } catch (err) {
    console.error('Wishlist add error:', err);
    res.status(500).json({ error: 'Loi them vao yeu thich' });
  }
});

router.delete('/:courseId', async (req, res) => {
  try {
    await Wishlist.remove(req.user.userId, req.params.courseId);
    const count = await Wishlist.count(req.user.userId);
    res.json({ message: 'Da xoa khoi yeu thich', courseId: req.params.courseId, count });
  } catch {
    res.status(500).json({ error: 'Loi xoa khoi yeu thich' });
  }
});

module.exports = router;
