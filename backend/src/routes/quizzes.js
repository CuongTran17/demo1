const express = require('express');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');

const router = express.Router();

async function canAccessCourse(user, courseId) {
  if (!user || !courseId) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') {
    const teacherCourses = await Course.getTeacherCourses(user.userId);
    return teacherCourses.some((course) => String(course.course_id) === String(courseId));
  }
  return Course.hasUserPurchased(user.userId, courseId);
}

async function requireQuizAccess(req, res, quizId) {
  const courseId = await Quiz.getCourseId(quizId);
  if (!courseId) {
    res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
    return false;
  }
  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) {
    res.status(403).json({ error: 'Bạn cần mua khóa học trước khi làm bài kiểm tra này' });
    return false;
  }
  return true;
}

// GET /api/quizzes?courseId=X  — sidebar list (no questions)
router.get('/', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });
    if (!await canAccessCourse(req.user, courseId)) {
      return res.status(403).json({ error: 'Bạn cần mua khóa học trước khi xem bài kiểm tra' });
    }
    const quizzes = await Quiz.getByCourse(courseId);
    res.json(quizzes);
  } catch (err) {
    console.error('[quizzes GET /]', err.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/quizzes/:id/status  — has the current user passed?
router.get('/:id/status', auth, async (req, res) => {
  try {
    if (!await requireQuizAccess(req, res, req.params.id)) return;
    const attempt = await Quiz.getAttemptStatus(req.params.id, req.user.userId);
    res.json({ passed: !!attempt, attempt: attempt || null });
  } catch (err) {
    console.error('[quizzes GET status]', err.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/quizzes/:id/review  — questions with correct answers (only if passed)
router.get('/:id/review', auth, async (req, res) => {
  try {
    if (!await requireQuizAccess(req, res, req.params.id)) return;
    const attempt = await Quiz.getAttemptStatus(req.params.id, req.user.userId);
    if (!attempt) return res.status(403).json({ error: 'Bạn chưa qua bài kiểm tra này' });
    const quiz = await Quiz.getWithAnswers(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
    res.json(quiz);
  } catch (err) {
    console.error('[quizzes GET review]', err.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/quizzes/:id  — questions without correct answers
router.get('/:id', auth, async (req, res) => {
  try {
    if (!await requireQuizAccess(req, res, req.params.id)) return;
    const quiz = await Quiz.getWithQuestions(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
    res.json(quiz);
  } catch (err) {
    console.error('[quizzes GET :id]', err.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/quizzes/:id/submit  — submit answers
router.post('/:id/submit', auth, async (req, res) => {
  try {
    if (!await requireQuizAccess(req, res, req.params.id)) return;
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Thiếu dữ liệu answers' });
    }
    const result = await Quiz.submit(req.params.id, req.user.userId, answers);
    res.json(result);
  } catch (err) {
    console.error('[quizzes POST submit]', err.message);
    res.status(500).json({ error: err.message || 'Lỗi server' });
  }
});

module.exports = router;
