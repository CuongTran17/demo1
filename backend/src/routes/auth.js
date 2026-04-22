const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const PendingRegistration = require('../models/PendingRegistration');
const { auth } = require('../middleware/auth');
const { requestOtp, verifyOtp, normalizeEmail } = require('../utils/otpService');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateStrongPassword(password) {
  if (!password || password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ số';
  return null;
}

function mapOtpError(result) {
  if (!result || result.ok) return null;

  if (result.reason === 'not_found') {
    return { status: 400, message: 'Bạn chưa gửi OTP hoặc OTP đã hết hạn, vui lòng gửi lại OTP' };
  }
  if (result.reason === 'expired') {
    return { status: 400, message: 'OTP đã hết hạn, vui lòng gửi lại OTP mới' };
  }
  if (result.reason === 'max_attempts') {
    return { status: 400, message: 'Bạn đã nhập sai OTP quá nhiều lần, vui lòng gửi lại OTP' };
  }
  if (result.reason === 'invalid_format') {
    return { status: 400, message: 'OTP không hợp lệ, vui lòng nhập đúng 6 chữ số' };
  }
  if (result.reason === 'invalid_code') {
    return {
      status: 400,
      message: 'OTP không chính xác',
      remainingAttempts: result.remainingAttempts,
    };
  }

  return { status: 400, message: 'OTP không hợp lệ' };
}

function handleOtpRequestError(err, res) {
  if (err.code === 'OTP_COOLDOWN') {
    return res.status(429).json({
      error: err.message,
      remainingSeconds: err.remainingSeconds,
    });
  }

  if (err.code === 'MAIL_CONFIG_MISSING') {
    return res.status(500).json({
      error: 'Hệ thống email chưa được cấu hình. Vui lòng cấu hình MAIL_USER và MAIL_PASSWORD',
    });
  }

  console.error('OTP request error:', err);
  return res.status(500).json({ error: 'Không thể gửi OTP, vui lòng thử lại sau' });
}

async function validateRegisterInput({ email, phone, password, fullname }) {
  if (!email || !phone || !password || !fullname) {
    return 'Vui lòng điền đầy đủ thông tin';
  }
  if (!isValidEmail(email)) {
    return 'Email không hợp lệ';
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return 'Số điện thoại phải có đúng 10 chữ số';
  }

  const passwordError = validateStrongPassword(password);
  if (passwordError) {
    return passwordError;
  }

  if (await User.emailExists(email)) {
    return 'Email đã được sử dụng';
  }
  if (await User.phoneExists(phone)) {
    return 'Số điện thoại đã được sử dụng';
  }

  return null;
}

function issueAuthToken(user) {
  const role = User.getRole(user.email);
  const token = jwt.sign(
    { userId: user.userId, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      fullname: user.fullname,
      role,
    },
  };
}

// POST /api/auth/register/start
router.post('/register/start', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');
    const fullname = String(req.body?.fullname || '').trim();

    const validationError = await validateRegisterInput({ email, phone, password, fullname });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    await PendingRegistration.upsert({ email, phone, password, fullname });

    const info = await requestOtp({ email, purpose: EmailOtp.PURPOSE.REGISTER });

    return res.json({
      message: 'OTP đã được gửi tới email của bạn',
      email,
      fullname,
      expiresInMinutes: info.expiresInMinutes,
      cooldownSeconds: info.cooldownSeconds,
    });
  } catch (err) {
    return handleOtpRequestError(err, res);
  }
});

// POST /api/auth/register/request-otp
router.post('/register/request-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    if (await User.emailExists(email)) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    const info = await requestOtp({ email, purpose: EmailOtp.PURPOSE.REGISTER });

    return res.json({
      message: 'OTP đã được gửi tới email của bạn',
      expiresInMinutes: info.expiresInMinutes,
      cooldownSeconds: info.cooldownSeconds,
    });
  } catch (err) {
    return handleOtpRequestError(err, res);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');
    const fullname = String(req.body?.fullname || '').trim();
    const otpCode = String(req.body?.otpCode || '').trim();

    if (!otpCode) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const validationError = await validateRegisterInput({ email, phone, password, fullname });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const otpCheck = await verifyOtp({
      email,
      purpose: EmailOtp.PURPOSE.REGISTER,
      otpCode,
    });

    if (!otpCheck.ok) {
      const mapped = mapOtpError(otpCheck);
      return res.status(mapped.status).json({
        error: mapped.message,
        remainingAttempts: mapped.remainingAttempts,
      });
    }

    const userId = await User.register({ email, phone, password, fullname });
    const authPayload = issueAuthToken({ userId, email, phone, fullname });

    res.status(201).json({
      message: 'Đăng ký thành công',
      token: authPayload.token,
      user: authPayload.user,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/register/complete
router.post('/register/complete', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otpCode = String(req.body?.otpCode || '').trim();

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mã OTP' });
    }

    const pending = await PendingRegistration.getByEmail(email);
    if (!pending) {
      return res.status(400).json({ error: 'Không tìm thấy thông tin đăng ký tạm thời, vui lòng đăng ký lại' });
    }

    if (await User.emailExists(email)) {
      await PendingRegistration.deleteByEmail(email);
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    if (await User.phoneExists(pending.phone)) {
      return res.status(400).json({ error: 'Số điện thoại đã được sử dụng' });
    }

    const otpCheck = await verifyOtp({
      email,
      purpose: EmailOtp.PURPOSE.REGISTER,
      otpCode,
    });

    if (!otpCheck.ok) {
      const mapped = mapOtpError(otpCheck);
      return res.status(mapped.status).json({
        error: mapped.message,
        remainingAttempts: mapped.remainingAttempts,
      });
    }

    const userId = await User.registerWithHash({
      email,
      phone: pending.phone,
      passwordHash: pending.password_hash,
      fullname: pending.fullname,
    });

    await PendingRegistration.deleteByEmail(email);

    const authPayload = issueAuthToken({
      userId,
      email,
      phone: pending.phone,
      fullname: pending.fullname,
    });

    res.status(201).json({
      message: 'Đăng ký thành công',
      token: authPayload.token,
      user: authPayload.user,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/forgot-password/request-otp
router.post('/forgot-password/request-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Email không tồn tại trong hệ thống' });
    }

    const info = await requestOtp({ email, purpose: EmailOtp.PURPOSE.RESET_PASSWORD });

    return res.json({
      message: 'OTP đặt lại mật khẩu đã được gửi tới email của bạn',
      expiresInMinutes: info.expiresInMinutes,
      cooldownSeconds: info.cooldownSeconds,
    });
  } catch (err) {
    return handleOtpRequestError(err, res);
  }
});

// POST /api/auth/forgot-password/reset
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otpCode = String(req.body?.otpCode || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Email không tồn tại trong hệ thống' });
    }

    const otpCheck = await verifyOtp({
      email,
      purpose: EmailOtp.PURPOSE.RESET_PASSWORD,
      otpCode,
    });

    if (!otpCheck.ok) {
      const mapped = mapOtpError(otpCheck);
      return res.status(mapped.status).json({
        error: mapped.message,
        remainingAttempts: mapped.remainingAttempts,
      });
    }

    await User.resetPasswordByEmail(email, newPassword);

    return res.json({ message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.' });
  } catch (err) {
    console.error('Forgot password reset error:', err);
    return res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const emailOrPhone = String(req.body?.emailOrPhone || '').trim();
    const password = String(req.body?.password || '');

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

    // Fetch current user data from DB to compare
    const currentUser = await User.getById(req.user.userId);
    if (!currentUser) return res.status(404).json({ error: 'Người dùng không tồn tại' });

    // Check if new email/phone conflicts
    if (email && email !== currentUser.email && await User.emailExists(email)) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }
    if (phone && phone !== currentUser.phone && await User.phoneExists(phone)) {
      return res.status(400).json({ error: 'Số điện thoại đã được sử dụng' });
    }

    // Prevent email changes that would alter role (admin/teacher protection)
    if (email && email !== currentUser.email) {
      const currentRole = User.getRole(currentUser.email);
      const newRole = User.getRole(email);
      if (currentRole !== newRole) {
        return res.status(400).json({ error: 'Không thể thay đổi email vì sẽ ảnh hưởng đến quyền truy cập tài khoản' });
      }
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
    const exists = await User.emailExists(normalizeEmail(req.query.email));
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
