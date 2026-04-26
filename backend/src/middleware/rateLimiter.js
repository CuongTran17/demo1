const rateLimit = require('express-rate-limit');

function makeMessage(action, windowMin) {
  return `Bạn đã thực hiện quá nhiều ${action}. Vui lòng thử lại sau ${windowMin} phút.`;
}

// Endpoints gửi/nhận OTP — giới hạn chặt nhất
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: makeMessage('yêu cầu OTP', 15) },
});

// Đăng nhập — cho phép thử nhiều hơn một chút
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: makeMessage('lần đăng nhập', 15) },
});

// Toàn bộ API — bảo vệ tổng thể
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
  skip: (req) => {
    // Bỏ qua IPN webhook từ SePay
    return req.path.startsWith('/api/sepay');
  },
});

module.exports = { otpLimiter, loginLimiter, globalLimiter };
