const express = require('express');
const Course = require('../models/Course');
const Order = require('../models/Order');
const PendingChange = require('../models/PendingChange');
const AccountLock = require('../models/AccountLock');
const Lesson = require('../models/Lesson');
const Review = require('../models/Review');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const { auth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All teacher routes require teacher role
router.use(auth, requireRole('teacher'));

// Image upload config
const UPLOAD_DIR = path.join(__dirname, '../../uploads/course-images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
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
    const [courses, pendingChanges, revenue] = await Promise.all([
      Course.getTeacherCourses(req.user.userId),
      PendingChange.getByTeacher(req.user.userId),
      Order.getTeacherRevenueSummary(req.user.userId),
    ]);

    // Count enrolled students for each course
    const db = require('../config/database');
    const revenueByCourseId = new Map(revenue.courses.map((course) => [course.course_id, course]));
    let totalStudents = 0;
    for (const course of courses) {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_courses WHERE course_id = ?',
        [course.course_id]
      );
      course.enrolled_students = rows[0].count;
      course.grossRevenue = revenueByCourseId.get(course.course_id)?.grossRevenue || 0;
      course.revenue = revenueByCourseId.get(course.course_id)?.revenue || 0;
      course.unitsSold = revenueByCourseId.get(course.course_id)?.unitsSold || 0;
      course.completedOrders = revenueByCourseId.get(course.course_id)?.completedOrders || 0;
      course.lastSaleAt = revenueByCourseId.get(course.course_id)?.lastSaleAt || null;
      totalStudents += rows[0].count;
    }

    res.json({
      stats: {
        totalCourses: courses.length,
        totalStudents,
        pendingChanges: pendingChanges.filter(c => c.status === 'pending').length,
        totalRevenue: revenue.totalRevenue,
        totalSales: revenue.totalSales,
        coursesWithSales: revenue.coursesWithSales,
      },
      courses,
      pendingChanges,
      revenue,
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
    const current = await Course.getById(req.params.id);
    const changeData = current
      ? { before: current, after: req.body }
      : req.body;
    await PendingChange.create(req.user.userId, 'update_course', req.params.id, changeData);
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
    const current = await Lesson.getById(req.params.id);
    const changeData = current
      ? { before: current, after: req.body }
      : req.body;
    await PendingChange.create(req.user.userId, 'update_lesson', req.params.id, changeData);
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

// ── Quiz management ──────────────────────────────────────────────────────

// GET /api/teacher/quizzes?courseId=X
router.get('/quizzes', async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });
    const quizzes = await Quiz.getByCourseForTeacher(courseId);
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/teacher/quizzes - Request create quiz (pending change)
router.post('/quizzes', async (req, res) => {
  try {
    const { course_id, section_id, lesson_order, quiz_title, description, questions } = req.body;
    if (!course_id || !quiz_title) return res.status(400).json({ error: 'Thiếu tên bài kiểm tra' });
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Cần ít nhất 1 câu hỏi' });
    }
    for (const q of questions) {
      if (!q.question_text?.trim()) return res.status(400).json({ error: 'Nội dung câu hỏi không được để trống' });
      if (!q.options?.some((o) => o.is_correct)) return res.status(400).json({ error: 'Mỗi câu hỏi phải có đáp án đúng' });
    }
    await PendingChange.create(req.user.userId, 'create_quiz', course_id, {
      course_id, section_id, lesson_order, quiz_title, description, questions,
    });
    res.json({ message: 'Yêu cầu tạo bài kiểm tra đã gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/teacher/quizzes/:id - Request delete quiz
router.delete('/quizzes/:id', async (req, res) => {
  try {
    await PendingChange.create(req.user.userId, 'delete_quiz', req.params.id, {});
    res.json({ message: 'Yêu cầu xóa bài kiểm tra đã gửi, chờ admin duyệt' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/teacher/students?courseId=X - Student progress for a course
router.get('/students', async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });

    const teacherCourses = await Course.getTeacherCourses(req.user.userId);
    const owns = teacherCourses.some((c) => String(c.course_id) === String(courseId));
    if (!owns) return res.status(403).json({ error: 'Bạn không quản lý khóa học này' });

    const db = require('../config/database');
    const [students] = await db.execute(
      `SELECT u.user_id, u.fullname, u.email,
              uc.purchased_at AS enrolled_at,
              COALESCE(cp.progress_percentage, 0) AS progress_percentage,
              COALESCE(cp.status, 'in_progress') AS status,
              COUNT(DISTINCT CASE WHEN qa.passed = 1 THEN qa.quiz_id END) AS quiz_passed_count
       FROM user_courses uc
       JOIN users u ON uc.user_id = u.user_id
       LEFT JOIN course_progress cp ON cp.user_id = u.user_id AND cp.course_id = uc.course_id
       LEFT JOIN quizzes qz ON qz.course_id = uc.course_id AND qz.is_active = 1
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.quiz_id AND qa.user_id = u.user_id AND qa.passed = 1
       WHERE uc.course_id = ?
       GROUP BY u.user_id, u.fullname, u.email, uc.purchased_at, cp.progress_percentage, cp.status
       ORDER BY uc.purchased_at DESC`,
      [courseId]
    );

    const [quizTotals] = await db.execute(
      'SELECT COUNT(*) AS total FROM quizzes WHERE course_id = ? AND is_active = 1',
      [courseId]
    );

    res.json({ students, totalQuizzes: quizTotals[0].total });
  } catch (err) {
    console.error('Teacher get students error:', err);
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
    const { targetEmail, reason, requestType } = req.body;
    if (!targetEmail?.trim()) return res.status(400).json({ error: 'Vui lòng nhập email người dùng' });

    const target = await User.getByEmail(targetEmail.trim());
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng với email này' });

    await AccountLock.createRequest(target.user_id, req.user.userId, reason, requestType || 'lock');
    res.json({ message: `Yêu cầu cho ${target.fullname} đã được gửi` });
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

// ============ Review Management ============

// GET /api/teacher/reviews/course/:courseId
router.get('/reviews/course/:courseId', async (req, res) => {
  try {
    const teacherCourses = await Course.getTeacherCourses(req.user.userId);
    const owns = teacherCourses.some((c) => String(c.course_id) === String(req.params.courseId));
    if (!owns) return res.status(403).json({ error: 'Bạn không quản lý khóa học này' });

    const reviews = await Review.getByCourse(req.params.courseId, 1, 200);
    res.json(reviews);
  } catch (err) {
    console.error('Teacher get reviews error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/teacher/reviews/:reviewId/reply
router.post('/reviews/:reviewId/reply', async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Nội dung phản hồi không được trống' });

    // Verify the review belongs to one of this teacher's courses
    const review = await Review.getById(reviewId);
    if (!review) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });

    const teacherCourses = await Course.getTeacherCourses(req.user.userId);
    const owns = teacherCourses.some((c) => String(c.course_id) === String(review.course_id));
    if (!owns) return res.status(403).json({ error: 'Bạn không quản lý khóa học này' });

    await Review.reply(reviewId, req.user.userId, content.trim());
    res.json({ message: 'Phản hồi thành công' });
  } catch (err) {
    console.error('Teacher reply review error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
