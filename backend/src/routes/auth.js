const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, fullname } = req.body;

    // Validation
    if (!email || !phone || !password || !fullname) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (await User.emailExists(email)) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }
    if (await User.phoneExists(phone)) {
      return res.status(400).json({ error: 'Số điện thoại đã được sử dụng' });
    }

    const userId = await User.register({ email, phone, password, fullname });
    const role = User.getRole(email);

    const token = jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: { userId, email, phone, fullname, role },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email/SĐT và mật khẩu' });
    }

    const user = await User.login(emailOrPhone, password);
    if (!user) {
      return res.status(401).json({ error: 'Email/SĐT hoặc mật khẩu không đúng' });
    }
    if (user.is_locked) {
      return res.status(403).json({
        error: 'Tài khoản đã bị khóa',
        reason: user.locked_reason,
      });
    }

    const role = User.getRole(user.email);
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        phone: user.phone,
        fullname: user.fullname,
        role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.getById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      userId: user.user_id,
      email: user.email,
      phone: user.phone,
      fullname: user.fullname,
      role: User.getRole(user.email),
      createdAt: user.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { fullname, email, phone } = req.body;

    // Check if new email/phone conflicts
    if (email && email !== req.user.email && await User.emailExists(email)) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }
    if (phone && phone !== req.user.phone && await User.phoneExists(phone)) {
      return res.status(400).json({ error: 'Số điện thoại đã được sử dụng' });
    }

    await User.updateProfile(req.user.userId, {
      fullname: fullname || req.user.fullname,
      email: email || req.user.email,
      phone: phone || req.user.phone,
    });

    // Generate new token if email changed
    const updatedUser = await User.getById(req.user.userId);
    const role = User.getRole(updatedUser.email);
    const token = jwt.sign(
      { userId: updatedUser.user_id, email: updatedUser.email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Cập nhật thành công',
      token,
      user: {
        userId: updatedUser.user_id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        fullname: updatedUser.fullname,
        role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/auth/password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu' });
    }
    await User.updatePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/auth/check-email?email=xxx
router.get('/check-email', async (req, res) => {
  try {
    const exists = await User.emailExists(req.query.email);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
