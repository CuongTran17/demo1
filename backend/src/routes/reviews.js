const express = require('express');
const Course = require('../models/Course');
const Review = require('../models/Review');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/course/:courseId — public
router.get('/course/:courseId', optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const [summary, reviews] = await Promise.all([
      Review.getSummary(courseId),
      Review.getByCourse(courseId, page, limit),
    ]);

    let userReview = null;
    if (req.user) {
      userReview = await Review.getUserReview(req.user.userId, courseId);
    }

    res.json({ summary, reviews, userReview });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Lỗi tải đánh giá' });
  }
});

// POST /api/reviews/course/:courseId — create review (auth, must have purchased)
router.post('/course/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, title, content } = req.body;

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    const hasPurchased = await Course.hasUserPurchased(req.user.userId, courseId);
    if (!hasPurchased) {
      return res.status(403).json({ error: 'Bạn cần mua khóa học trước khi đánh giá' });
    }

    const existing = await Review.getUserReview(req.user.userId, courseId);
    if (existing) {
      return res.status(409).json({ error: 'Bạn đã đánh giá khóa học này rồi' });
    }

    const reviewId = await Review.create(req.user.userId, courseId, ratingNum, title, content);
    const review = await Review.getById(reviewId);
    res.status(201).json({ message: 'Đánh giá thành công', review });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Lỗi tạo đánh giá' });
  }
});

// PUT /api/reviews/:reviewId — update own review
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID đánh giá không hợp lệ' });

    const { rating, title, content } = req.body;
    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    const updated = await Review.update(reviewId, req.user.userId, ratingNum, title, content);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });

    res.json({ message: 'Cập nhật đánh giá thành công' });
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ error: 'Lỗi cập nhật đánh giá' });
  }
});

// DELETE /api/reviews/:reviewId — delete own review or admin
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID đánh giá không hợp lệ' });

    const isAdmin = User.getRole(req.user.email) === 'admin';
    const deleted = await Review.deleteById(reviewId, req.user.userId, isAdmin);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });

    res.json({ message: 'Xóa đánh giá thành công' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Lỗi xóa đánh giá' });
  }
});

module.exports = router;
