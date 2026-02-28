const express = require('express');
const Course = require('../models/Course');
const PendingChange = require('../models/PendingChange');
const AccountLock = require('../models/AccountLock');
const Lesson = require('../models/Lesson');
const { auth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All teacher routes require teacher role
router.use(auth, requireRole('teacher'));

// Image upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/course-images'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// GET /api/teacher/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const courses = await Course.getTeacherCourses(req.user.userId);
    const pendingChanges = await PendingChange.getByTeacher(req.user.userId);

    // Count enrolled students for each course
    const db = require('../config/database');
    let totalStudents = 0;
    for (const course of courses) {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_courses WHERE course_id = ?',
        [course.course_id]
      );
      course.enrolled_students = rows[0].count;
      totalStudents += rows[0].count;
    }

    res.json({
      stats: {
        totalCourses: courses.length,
        totalStudents,
        pendingChanges: pendingChanges.filter(c => c.status === 'pending').length,
      },
      courses,
      pendingChanges,
    });
  } catch (err) {
    console.error('Teacher dashboard error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Course Management (via Pending Changes) ============

// POST /api/teacher/courses - Request create course (creates pending change)
router.post('/courses', async (req, res) => {
  try {
    const courseData = req.body;
    if (!courseData.course_id) courseData.course_id = uuidv4().substring(0, 50);

    await PendingChange.create(req.user.userId, 'create_course', courseData.course_id, courseData);
    res.status(201).json({ message: 'Yêu cầu tạo khóa học đã được gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/teacher/courses/:id - Request update course
router.put('/courses/:id', async (req, res) => {
  try {
    await PendingChange.create(req.user.userId, 'update_course', req.params.id, req.body);
    res.json({ message: 'Yêu cầu cập nhật khóa học đã được gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/teacher/courses/:id - Request delete course
router.delete('/courses/:id', async (req, res) => {
  try {
    await PendingChange.create(req.user.userId, 'delete_course', req.params.id, {});
    res.json({ message: 'Yêu cầu xóa khóa học đã được gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Lesson Management (via Pending Changes) ============

// POST /api/teacher/lessons - Request create lesson
router.post('/lessons', async (req, res) => {
  try {
    const lessonData = req.body;
    await PendingChange.create(req.user.userId, 'create_lesson', lessonData.course_id, lessonData);
    res.status(201).json({ message: 'Yêu cầu tạo bài học đã được gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/teacher/lessons/:id - Request update lesson
router.put('/lessons/:id', async (req, res) => {
  try {
    await PendingChange.create(req.user.userId, 'update_lesson', req.params.id, req.body);
    res.json({ message: 'Yêu cầu cập nhật bài học đã được gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/teacher/lessons/:id - Request delete lesson
router.delete('/lessons/:id', async (req, res) => {
  try {
    await PendingChange.create(req.user.userId, 'delete_lesson', req.params.id, {});
    res.json({ message: 'Yêu cầu xóa bài học đã được gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Image Upload ============

// POST /api/teacher/upload-image
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file ảnh' });
    const imageUrl = `/uploads/course-images/${req.file.filename}`;
    res.json({ message: 'Upload thành công', imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Account Lock Requests ============

// POST /api/teacher/lock-request
router.post('/lock-request', async (req, res) => {
  try {
    const { targetUserId, reason, requestType } = req.body;
    await AccountLock.createRequest(targetUserId, req.user.userId, reason, requestType || 'lock');
    res.json({ message: 'Yêu cầu đã được gửi' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/teacher/my-lock-requests
router.get('/my-lock-requests', async (req, res) => {
  try {
    const requests = await AccountLock.getByRequester(req.user.userId);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
