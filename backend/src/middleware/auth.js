const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Required authentication
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.getById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại' });
    }
    if (user.is_locked) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa', reason: user.locked_reason });
    }

    req.user = {
      userId: user.user_id,
      email: user.email,
      fullname: user.fullname,
      phone: user.phone,
      role: User.getEffectiveRole(user),
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

// Optional authentication (attach user if token present, but don't reject)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.getById(decoded.userId);
      if (user && !user.is_locked) {
        req.user = {
          userId: user.user_id,
          email: user.email,
          fullname: user.fullname,
          phone: user.phone,
          role: User.getEffectiveRole(user),
        };
      }
    }
  } catch (err) {
    // Ignore token errors for optional auth
  }
  next();
};

// Role-based access
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

module.exports = { auth, optionalAuth, requireRole };
