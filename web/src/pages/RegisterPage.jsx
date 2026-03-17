import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { getPendingRegistration, savePendingRegistration } from '../utils/pendingRegistration';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const pending = getPendingRegistration();

    return {
      fullname: pending?.fullname || '',
      email: pending?.email || '',
      phone: pending?.phone || '',
      password: '',
      confirmPassword: '',
    };
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.fullname.trim() || form.fullname.trim().length < 3)
      errs.fullname = 'Họ tên phải có ít nhất 3 ký tự';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email không hợp lệ';
    if (!/^[0-9]{10}$/.test(form.phone))
      errs.phone = 'Số điện thoại phải có 10 chữ số';
    if (form.password.length < 8)
      errs.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    else if (!/[A-Z]/.test(form.password))
      errs.password = 'Mật khẩu phải có ít nhất 1 chữ hoa';
    else if (!/[a-z]/.test(form.password))
      errs.password = 'Mật khẩu phải có ít nhất 1 chữ thường';
    else if (!/[0-9]/.test(form.password))
      errs.password = 'Mật khẩu phải có ít nhất 1 chữ số';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setServerError('');
    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const phone = form.phone.trim();

      const res = await authAPI.startRegister({
        fullname: form.fullname,
        email,
        phone,
        password: form.password,
      });

      savePendingRegistration({
        fullname: form.fullname.trim(),
        email,
        phone,
        otpMessage: res.data?.message || 'OTP đã được gửi tới email của bạn',
        otpCooldownSeconds: Number(res.data?.cooldownSeconds || 60),
        otpRequestedAt: Date.now(),
      });

      navigate('/register/otp', {
        state: {
          otpMessage: res.data?.message || 'OTP đã được gửi tới email của bạn',
        },
      });
    } catch (err) {
      setServerError(err.response?.data?.error || err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ta-auth-wrapper">
      {/* Left – Form Side */}
      <div className="ta-auth-form-side">
        <div className="ta-auth-form-inner">
          <Link to="/" className="ta-auth-logo">
            <span className="ta-auth-logo-brand">PTIT <strong>LEARNING</strong> <span className="ta-auth-logo-by">by FIN1</span></span>
          </Link>

          <h1 className="ta-auth-heading">Tạo tài khoản mới</h1>
          <p className="ta-auth-sub">Điền thông tin để bắt đầu hành trình học tập của bạn!</p>

          {serverError && <div className="ta-auth-alert ta-auth-alert--error">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`ta-auth-field ${errors.fullname ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Họ và tên <span className="ta-required">*</span></label>
              <input className="ta-auth-input" type="text" name="fullname" value={form.fullname} onChange={handleChange} required placeholder="Nhập họ và tên" />
              {errors.fullname && <small className="ta-auth-error">{errors.fullname}</small>}
            </div>

            <div className="ta-auth-row">
              <div className={`ta-auth-field ${errors.email ? 'ta-auth-field--error' : ''}`}>
                <label className="ta-auth-label">Email <span className="ta-required">*</span></label>
                <input className="ta-auth-input" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="email@example.com" />
                {errors.email && <small className="ta-auth-error">{errors.email}</small>}
              </div>
              <div className={`ta-auth-field ${errors.phone ? 'ta-auth-field--error' : ''}`}>
                <label className="ta-auth-label">Số điện thoại <span className="ta-required">*</span></label>
                <input className="ta-auth-input" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0123456789" required />
                {errors.phone && <small className="ta-auth-error">{errors.phone}</small>}
              </div>
            </div>

            <div className={`ta-auth-field ${errors.password ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Mật khẩu <span className="ta-required">*</span></label>
              <input className="ta-auth-input" type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Tối thiểu 8 ký tự" />
              {errors.password && <small className="ta-auth-error">{errors.password}</small>}
              {!errors.password && <small className="ta-auth-hint">Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số</small>}
            </div>

            <div className={`ta-auth-field ${errors.confirmPassword ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Xác nhận mật khẩu <span className="ta-required">*</span></label>
              <input className="ta-auth-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Nhập lại mật khẩu" />
              {errors.confirmPassword && <small className="ta-auth-error">{errors.confirmPassword}</small>}
            </div>

            <div className="ta-auth-step-note">
              <strong>Bước tiếp theo:</strong> Sau khi tiếp tục, hệ thống sẽ gửi OTP tới email để bạn xác minh ở một trang riêng.
            </div>

            <button className="ta-auth-submit" type="submit" disabled={loading}>
              {loading ? 'Đang gửi OTP...' : 'Tiếp tục xác minh email'}
            </button>
          </form>

          <div className="ta-auth-footer">
            <p>Đã có tài khoản? <Link to="/login" className="ta-auth-link">Đăng nhập</Link></p>
            <Link to="/" className="ta-auth-link ta-auth-link--muted">← Về trang chủ</Link>
          </div>
        </div>
      </div>

      {/* Right – Brand Side */}
      <div className="ta-auth-brand-side">
        <div className="ta-auth-brand-inner">
          <h2 className="ta-auth-brand-title">THAM GIA CÙNG CHÚNG TÔI</h2>
          <p className="ta-auth-brand-desc">
            Hơn 10,000+ sinh viên đã tin tưởng và học tập cùng PTIT LEARNING.
            Trở thành một phần của cộng đồng ngay hôm nay!
          </p>
          <div className="ta-auth-demo-box">
            <h4>Lợi ích khi đăng ký:</h4>
            <ul>
              <li>Truy cập miễn phí các khóa học demo</li>
              <li>Nhận thông báo về các ưu đãi mới</li>
              <li>Tham gia cộng đồng học tập</li>
              <li>Theo dõi tiến độ học tập</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
