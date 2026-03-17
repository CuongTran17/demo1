import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function validatePassword(password) {
  if (!password || password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ số';
  return '';
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    otpCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timerId = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [otpCooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'email') {
      setOtpMessage('');
      setOtpCooldown(0);
    }
  };

  const handleRequestOtp = async () => {
    const email = form.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'Email không hợp lệ' }));
      return;
    }

    setOtpSending(true);
    setOtpMessage('');
    setServerError('');

    try {
      const res = await authAPI.requestForgotPasswordOtp(email);
      setForm((prev) => ({ ...prev, email }));
      setOtpCooldown(Number(res.data?.cooldownSeconds || 60));
      setOtpMessage(res.data?.message || 'OTP đã được gửi tới email của bạn');
    } catch (err) {
      const remainingSeconds = Number(err.response?.data?.remainingSeconds || 0);
      if (remainingSeconds > 0) {
        setOtpCooldown(remainingSeconds);
      }
      setServerError(err.response?.data?.error || 'Không thể gửi OTP, vui lòng thử lại');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Email không hợp lệ';
    }
    if (!/^\d{6}$/.test(form.otpCode.trim())) {
      nextErrors.otpCode = 'Vui lòng nhập mã OTP gồm 6 chữ số';
    }

    const passwordError = validatePassword(form.newPassword);
    if (passwordError) {
      nextErrors.newPassword = passwordError;
    }
    if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setServerError('');
    setSuccessMessage('');

    try {
      const res = await authAPI.resetForgotPassword(
        form.email.trim().toLowerCase(),
        form.otpCode.trim(),
        form.newPassword
      );
      setSuccessMessage(res.data?.message || 'Đặt lại mật khẩu thành công');

      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setServerError(err.response?.data?.error || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ta-auth-wrapper">
      <div className="ta-auth-form-side">
        <div className="ta-auth-form-inner">
          <Link to="/" className="ta-auth-logo">
            <span className="ta-auth-logo-brand">PTIT <strong>LEARNING</strong> <span className="ta-auth-logo-by">by FIN1</span></span>
          </Link>

          <h1 className="ta-auth-heading">Quên mật khẩu</h1>
          <p className="ta-auth-sub">Nhập email, OTP và mật khẩu mới để khôi phục tài khoản.</p>

          {serverError && <div className="ta-auth-alert ta-auth-alert--error">{serverError}</div>}
          {successMessage && <div className="ta-auth-alert ta-auth-alert--success">{successMessage}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`ta-auth-field ${errors.email ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Email <span className="ta-required">*</span></label>
              <input
                className="ta-auth-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="email@example.com"
              />
              {errors.email && <small className="ta-auth-error">{errors.email}</small>}

              <div className="ta-auth-inline-action">
                <button
                  className="ta-auth-otp-btn"
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpSending || otpCooldown > 0}
                >
                  {otpSending ? 'Đang gửi OTP...' : otpCooldown > 0 ? `Gửi lại sau ${otpCooldown}s` : 'Gửi mã OTP'}
                </button>
              </div>

              {otpMessage && <small className="ta-auth-hint">{otpMessage}</small>}
            </div>

            <div className={`ta-auth-field ${errors.otpCode ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Mã OTP <span className="ta-required">*</span></label>
              <input
                className="ta-auth-input"
                type="text"
                name="otpCode"
                value={form.otpCode}
                onChange={handleChange}
                maxLength={6}
                required
                placeholder="Nhập 6 chữ số OTP"
              />
              {errors.otpCode && <small className="ta-auth-error">{errors.otpCode}</small>}
            </div>

            <div className={`ta-auth-field ${errors.newPassword ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Mật khẩu mới <span className="ta-required">*</span></label>
              <input
                className="ta-auth-input"
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
                placeholder="Tối thiểu 8 ký tự"
              />
              {errors.newPassword && <small className="ta-auth-error">{errors.newPassword}</small>}
            </div>

            <div className={`ta-auth-field ${errors.confirmPassword ? 'ta-auth-field--error' : ''}`}>
              <label className="ta-auth-label">Xác nhận mật khẩu mới <span className="ta-required">*</span></label>
              <input
                className="ta-auth-input"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Nhập lại mật khẩu mới"
              />
              {errors.confirmPassword && <small className="ta-auth-error">{errors.confirmPassword}</small>}
            </div>

            <button className="ta-auth-submit" type="submit" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </button>
          </form>

          <div className="ta-auth-footer">
            <p>Đã nhớ mật khẩu? <Link to="/login" className="ta-auth-link">Đăng nhập</Link></p>
            <Link to="/" className="ta-auth-link ta-auth-link--muted">← Về trang chủ</Link>
          </div>
        </div>
      </div>

      <div className="ta-auth-brand-side">
        <div className="ta-auth-brand-inner">
          <h2 className="ta-auth-brand-title">BẢO VỆ TÀI KHOẢN CỦA BẠN</h2>
          <p className="ta-auth-brand-desc">
            Chúng tôi sử dụng OTP qua email để bảo vệ tài khoản và xác minh thao tác đổi mật khẩu.
          </p>
          <div className="ta-auth-demo-box">
            <h4>Lưu ý bảo mật:</h4>
            <ul>
              <li>Không chia sẻ mã OTP cho người khác</li>
              <li>OTP sẽ hết hạn sau vài phút</li>
              <li>Nên dùng mật khẩu mạnh và khác biệt</li>
              <li>Đổi mật khẩu định kỳ để an toàn hơn</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
