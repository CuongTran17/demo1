const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Course = require('../models/Course');
const Order = require('../models/Order');
const DiscountCode = require('../models/DiscountCode');
const PendingChange = require('../models/PendingChange');
const AccountLock = require('../models/AccountLock');
const FlashSale = require('../models/FlashSale');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Image upload config (same as teacher)
const UPLOAD_DIR = path.join(__dirname, '../../uploads/course-images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `admin_${Date.now()}_${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ upload file ảnh'), false);
  },
});

// All admin routes require admin role
router.use(auth, requireRole('admin'));

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    await Order.reconcilePendingSepayOrders();

    const [users, teachers, courses, pendingChanges, pendingOrders, paymentHistory, totalRevenue, discountCodes] =
      await Promise.all([
        User.getAll(),
        User.getTeachers(),
        Course.getAll(),
        PendingChange.getAll(),
        Order.getPendingPaymentOrders(),
        Order.getPaymentHistory(),
        Order.getTotalRevenue(),
        DiscountCode.getAll(),
      ]);

    const pendingCount = await PendingChange.countPending();

    res.json({
      stats: {
        totalUsers: users.length,
        totalTeachers: teachers.length,
        totalCourses: courses.length,
        pendingChanges: pendingCount,
        pendingOrders: pendingOrders.length,
        totalRevenue,
      },
      users,
      teachers,
      courses,
      pendingChanges,
      pendingOrders,
      paymentHistory,
      discountCodes,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Discount Codes ============

// GET /api/admin/discount-codes
router.get('/discount-codes', async (req, res) => {
  try {
    const discountCodes = await DiscountCode.getAll();
    res.json(discountCodes);
  } catch (err) {
    res.status(500).json({ error: 'Loi server' });
  }
});

// POST /api/admin/discount-codes
router.post('/discount-codes', async (req, res) => {
  try {
    const code = await DiscountCode.create(req.body, req.user.userId);
    res.status(201).json({ message: 'Tao ma giam gia thanh cong', code });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Loi server' });
  }
});

// PUT /api/admin/discount-codes/:id
router.put('/discount-codes/:id', async (req, res) => {
  try {
    const code = await DiscountCode.update(req.params.id, req.body);
    res.json({ message: 'Cap nhat ma giam gia thanh cong', code });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Loi server' });
  }
});

// DELETE /api/admin/discount-codes/:id
router.delete('/discount-codes/:id', async (req, res) => {
  try {
    const result = await DiscountCode.deleteById(req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Loi server' });
  }
});

// ============ User Management ============

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { fullname, email, phone } = req.body;
    await User.updateProfile(req.params.id, { fullname, email, phone });
    res.json({ message: 'Cập nhật người dùng thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.deleteUser(req.params.id);
    res.json({ message: 'Xóa người dùng thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/users/create-teacher
router.post('/users/create-teacher', async (req, res) => {
  try {
    const { email, phone, password, fullname } = req.body;
    const userId = await User.register({ email, phone, password, fullname });
    res.status(201).json({ message: 'Tạo giảng viên thành công', userId });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Account Lock ============

// POST /api/admin/users/:id/lock
router.post('/users/:id/lock', async (req, res) => {
  try {
    const { reason } = req.body;
    await User.lockAccount(req.params.id, reason, req.user.userId);
    res.json({ message: 'Đã khóa tài khoản' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/users/:id/unlock
router.post('/users/:id/unlock', async (req, res) => {
  try {
    await User.unlockAccount(req.params.id);
    res.json({ message: 'Đã mở khóa tài khoản' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/admin/lock-requests
router.get('/lock-requests', async (req, res) => {
  try {
    const requests = await AccountLock.getPendingRequests();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/lock-requests/:id/approve
router.post('/lock-requests/:id/approve', async (req, res) => {
  try {
    await AccountLock.approve(req.params.id, req.user.userId);
    res.json({ message: 'Đã duyệt yêu cầu' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/lock-requests/:id/reject
router.post('/lock-requests/:id/reject', async (req, res) => {
  try {
    await AccountLock.reject(req.params.id, req.user.userId);
    res.json({ message: 'Đã từ chối yêu cầu' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Course Assignment ============

// POST /api/admin/assign-course
router.post('/assign-course', async (req, res) => {
  try {
    const { teacherId, courseId } = req.body;
    await Course.assignTeacher(teacherId, courseId);
    res.json({ message: 'Đã gán khóa học cho giảng viên' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/admin/assign-course
router.delete('/assign-course', async (req, res) => {
  try {
    const { teacherId, courseId } = req.body;
    await Course.removeTeacher(teacherId, courseId);
    res.json({ message: 'Đã gỡ khóa học khỏi giảng viên' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Pending Changes ============

// POST /api/admin/changes/:id/approve
router.post('/changes/:id/approve', async (req, res) => {
  try {
    const { note } = req.body;
    const result = await PendingChange.approve(req.params.id, req.user.userId, note);
    res.json({
      message: result?.alreadyApproved ? 'Yêu cầu đã được duyệt trước đó' : 'Đã duyệt thay đổi',
      alreadyApproved: Boolean(result?.alreadyApproved),
    });
  } catch (err) {
    if (
      err.message?.includes('đã được duyệt') ||
      err.message?.includes('đã bị từ chối') ||
      err.message?.includes('đã được xử lý') ||
      err.message?.includes('đã tồn tại') ||
      err.message?.includes('Không tìm thấy')
    ) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Admin approve change error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/changes/:id/reject
router.post('/changes/:id/reject', async (req, res) => {
  try {
    const { note } = req.body;
    const result = await PendingChange.reject(req.params.id, req.user.userId, note);
    res.json({
      message: result?.alreadyRejected ? 'Yêu cầu đã bị từ chối trước đó' : 'Đã từ chối thay đổi',
      alreadyRejected: Boolean(result?.alreadyRejected),
    });
  } catch (err) {
    if (
      err.message?.includes('đã được duyệt') ||
      err.message?.includes('đã bị từ chối') ||
      err.message?.includes('Không tìm thấy')
    ) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Lỗi server' });
  }
});

// ============ Payment Approval ============

// POST /api/admin/orders/:id/approve
router.post('/orders/:id/approve', async (req, res) => {
  try {
    const { note } = req.body;
    await Order.updateStatus(req.params.id, 'completed');
    await Order.logPaymentApproval(req.params.id, req.user.userId, 'approved', note);
    res.json({ message: 'Đã duyệt thanh toán' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/orders/:id/reject
router.post('/orders/:id/reject', async (req, res) => {
  try {
    const { note } = req.body;
    await Order.updateStatus(req.params.id, 'rejected');
    await Order.logPaymentApproval(req.params.id, req.user.userId, 'rejected', note);
    res.json({ message: 'Đã từ chối thanh toán' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Course Management (Admin Direct) ============

// PUT /api/admin/courses/:id - Admin directly updates a course
router.put('/courses/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    const data = req.body;
    const fields = [];
    const values = [];
    const allowed = ['course_name', 'description', 'price', 'category', 'level', 'thumbnail', 'is_new', 'old_price', 'duration', 'discount_percentage'];
    for (const [key, value] of Object.entries(data)) {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
    values.push(req.params.id);
    await db.execute(`UPDATE courses SET ${fields.join(', ')} WHERE course_id = ?`, values);
    res.json({ message: 'Cập nhật khóa học thành công' });
  } catch (err) {
    console.error('Admin update course error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/admin/upload-image
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file' });
    const imageUrl = `/uploads/course-images/${req.file.filename}`;
    res.json({ message: 'Upload thành công', imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi upload' });
  }
});

// ============ Revenue ============

// GET /api/admin/revenue
router.get('/revenue', async (req, res) => {
  try {
    const details = await Order.getUserRevenueDetails();
    const total = await Order.getTotalRevenue();
    res.json({ total, details });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============ Flash Sale ============

// GET /api/admin/flash-sale
router.get('/flash-sale', async (req, res) => {
  try {
    const config = await FlashSale.getLatestConfig();
    res.json(config || null);
  } catch (err) {
    console.error('Admin get flash sale error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/admin/flash-sale
router.put('/flash-sale', async (req, res) => {
  try {
    const {
      flashSaleId,
      startAt,
      endAt,
      targetType,
      targetValue,
      courseIds,
      discountPercentage,
    } = req.body;

    if (!startAt || !endAt || !targetType || !discountPercentage) {
      return res.status(400).json({ error: 'Thiếu dữ liệu flash sale' });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Ngày giờ không hợp lệ' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
    }

    const discount = Number(discountPercentage);
    if (!Number.isFinite(discount) || discount <= 0 || discount > 90) {
      return res.status(400).json({ error: 'Phần trăm giảm giá phải từ 1 đến 90' });
    }

    if (!['all', 'category', 'courses'].includes(targetType)) {
      return res.status(400).json({ error: 'Đối tượng sale không hợp lệ' });
    }

    if (targetType === 'category' && !targetValue) {
      return res.status(400).json({ error: 'Vui lòng chọn danh mục khi sale theo danh mục' });
    }

    if (targetType === 'courses') {
      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 khóa học khi sale theo khóa học' });
      }
    }

    const saved = await FlashSale.saveConfig({
      flashSaleId,
      startAt,
      endAt,
      targetType,
      targetValue,
      courseIds,
      discountPercentage: Math.round(discount),
      createdBy: req.user.userId,
    });

    res.json({ message: 'Đã cập nhật flash sale', data: saved });
  } catch (err) {
    console.error('Admin save flash sale error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Lỗi server' });
  }
});

// DELETE /api/admin/flash-sale
router.delete('/flash-sale', async (req, res) => {
  try {
    await FlashSale.deactivateAll();
    res.json({ message: 'Đã tắt flash sale' });
  } catch (err) {
    console.error('Admin deactivate flash sale error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// DELETE /api/admin/flash-sale/:id
router.delete('/flash-sale/:id', async (req, res) => {
  try {
    const result = await FlashSale.deleteConfig(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Admin delete flash sale error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Lỗi server' });
  }
});

module.exports = router;
