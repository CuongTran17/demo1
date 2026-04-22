const express = require('express');
const Lesson = require('../models/Lesson');
const Certificate = require('../models/Certificate');
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
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Không có quyền thực hiện' });
    }
    const lessonId = await Lesson.create(req.body);
    res.status(201).json({ message: 'Tạo bài học thành công', lessonId });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/lessons/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Không có quyền thực hiện' });
    }
    await Lesson.update(req.params.id, req.body);
    res.json({ message: 'Cập nhật bài học thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/lessons/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Không có quyền thực hiện' });
    }
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
    const certificateIssued = await maybeIssueCertificate(req.user.userId, courseId);
    res.json({ message: 'Đã hoàn thành bài học', certificateIssued });
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

// ============ Video Tracking Routes ============

// POST /api/lessons/progress/video - Update video watch progress (with seek detection)
router.post('/progress/video', auth, async (req, res) => {
  try {
    const { courseId, lessonId, segments, duration, lastPosition } = req.body;
    if (!courseId || !lessonId) {
      return res.status(400).json({ error: 'Thiếu courseId hoặc lessonId' });
    }
    const result = await Lesson.updateVideoProgress(
      req.user.userId, courseId, lessonId,
      segments || [],
      Math.round(duration || 0),
      Math.round(lastPosition || 0)
    );
    let certificateIssued = false;
    if (result.autoCompleted) {
      certificateIssued = await maybeIssueCertificate(req.user.userId, courseId);
    }
    res.json({
      message: 'Cập nhật tiến độ video',
      videoWatchedPercent: result.pct,
      lastPosition: Math.round(lastPosition || 0),
      autoCompleted: result.autoCompleted,
      certificateIssued,
      segments: result.segments,
    });
  } catch (err) {
    console.error('Video progress error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/lessons/progress/video/:courseId - Get all video progress for a course
router.get('/progress/video/:courseId', auth, async (req, res) => {
  try {
    const progress = await Lesson.getVideoProgress(req.user.userId, req.params.courseId);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/lessons/progress/video/:courseId/:lessonId - Get video progress for specific lesson
router.get('/progress/video/:courseId/:lessonId', auth, async (req, res) => {
  try {
    const progress = await Lesson.getVideoProgressByLesson(
      req.user.userId, req.params.courseId, req.params.lessonId
    );
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Issue certificate if course is 100% complete and cert not yet granted
async function maybeIssueCertificate(userId, courseId) {
  try {
    const db = require('../config/database');
    const [progress] = await db.execute(
      'SELECT progress_percentage FROM course_progress WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (!progress[0] || progress[0].progress_percentage < 100) return false;
    const existing = await Certificate.getByUserAndCourse(userId, courseId);
    if (existing) return false;
    await Certificate.issue(userId, courseId);
    return true;
  } catch (err) {
    console.error('[Certificate] Auto-issue failed:', err);
    return false;
  }
}

module.exports = router;
