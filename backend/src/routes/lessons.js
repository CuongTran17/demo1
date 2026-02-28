const express = require('express');
const Lesson = require('../models/Lesson');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/lessons?courseId=&sectionId=&lessonId=
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { courseId, sectionId, lessonId } = req.query;

    if (lessonId) {
      const lesson = await Lesson.getById(lessonId);
      return lesson ? res.json(lesson) : res.status(404).json({ error: 'Bài học không tồn tại' });
    }
    if (courseId && sectionId) {
      const lessons = await Lesson.getBySection(courseId, sectionId);
      return res.json(lessons);
    }
    if (courseId) {
      const lessons = await Lesson.getByCourseId(courseId);
      return res.json(lessons);
    }

    res.status(400).json({ error: 'Thiếu tham số courseId' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/lessons
router.post('/', auth, async (req, res) => {
  try {
    const lessonId = await Lesson.create(req.body);
    res.status(201).json({ message: 'Tạo bài học thành công', lessonId });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/lessons/:id
router.put('/:id', auth, async (req, res) => {
  try {
    await Lesson.update(req.params.id, req.body);
    res.json({ message: 'Cập nhật bài học thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/lessons/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Lesson.delete(req.params.id);
    res.json({ message: 'Xóa bài học thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Progress Routes ============

// GET /api/lessons/progress/:courseId
router.get('/progress/:courseId', auth, async (req, res) => {
  try {
    const completedLessons = await Lesson.getCompletedLessons(req.user.userId, req.params.courseId);
    res.json(completedLessons);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/lessons/progress/complete
router.post('/progress/complete', auth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    await Lesson.markComplete(req.user.userId, courseId, lessonId);
    res.json({ message: 'Đã hoàn thành bài học' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/lessons/progress/reset
router.post('/progress/reset', auth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    await Lesson.resetProgress(req.user.userId, courseId, lessonId);
    res.json({ message: 'Đã đặt lại tiến độ' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
