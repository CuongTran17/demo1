import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  clearPendingRegistration,
  getPendingRegistration,
  getPendingRegistrationCooldown,
  savePendingRegistration,
} from '../utils/pendingRegistration';

export default function RegisterOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeRegister } = useAuth();

  const [pending, setPending] = useState(() => getPendingRegistration());
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [otpMessage, setOtpMessage] = useState(
    location.state?.otpMessage || 'Mã OTP đã được gửi tới email của bạn'
  );
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(() => getPendingRegistrationCooldown(getPendingRegistration()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [otpCooldown]);

  if (!pending?.email) {
    return <Navigate to="/register" replace />;
  }

  const handleResendOtp = async () => {
    setError('');
    setOtpSending(true);

    try {
      const res = await authAPI.requestRegisterOtp(pending.email);
      const nextPending = savePendingRegistration({
        ...pending,
        otpCooldownSeconds: Number(res.data?.cooldownSeconds || 60),
        otpRequestedAt: Date.now(),
        otpMessage: res.data?.message || 'OTP đã được gửi tới email của bạn',
      });

      setPending(nextPending);
      setOtpMessage(nextPending.otpMessage);
      setOtpCooldown(getPendingRegistrationCooldown(nextPending));
    } catch (err) {
      const remainingSeconds = Number(err.response?.data?.remainingSeconds || 0);

      if (remainingSeconds > 0) {
        const nextPending = savePendingRegistration({
          ...pending,
          otpCooldownSeconds: remainingSeconds,
          otpRequestedAt: Date.now(),
        });

        setPending(nextPending);
        setOtpCooldown(remainingSeconds);
      }

      setError(err.response?.data?.error || 'Không thể gửi lại OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Vui lòng nhập mã OTP gồm 6 chữ số');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await completeRegister(pending.email, otpCode.trim());
      clearPendingRegistration();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể xác minh OTP');
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

          <h1 className="ta-auth-heading">Xác minh email</h1>
          <p className="ta-auth-sub">Nhập mã OTP để hoàn tất đăng ký tài khoản.</p>

          <div className="ta-auth-otp-summary">
            <div className="ta-auth-otp-email">{pending.email}</div>
            <p>
              Chúng tôi đã gửi mã xác minh tới email trên. Sau khi xác minh xong,
              tài khoản của bạn sẽ được tạo ngay.
            </p>
          </div>

          {error && <div className="ta-auth-alert ta-auth-alert--error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="ta-auth-field">
              <label className="ta-auth-label">Mã OTP email <span className="ta-required">*</span></label>
              <input
                className="ta-auth-input ta-auth-input--otp"
                type="text"
                name="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Nhập 6 chữ số OTP"
                required
              />
              {otpMessage && <small className="ta-auth-hint">{otpMessage}</small>}
            </div>

            <div className="ta-auth-inline-action ta-auth-inline-action--spread">
              <button
                className="ta-auth-otp-btn"
                type="button"
                onClick={handleResendOtp}
                disabled={otpSending || otpCooldown > 0}
              >
                {otpSending ? 'Đang gửi OTP...' : otpCooldown > 0 ? `Gửi lại sau ${otpCooldown}s` : 'Gửi lại OTP'}
              </button>
              <Link to="/register" className="ta-auth-link">Sửa thông tin đăng ký</Link>
            </div>

            <button className="ta-auth-submit" type="submit" disabled={loading}>
              {loading ? 'Đang xác minh...' : 'Hoàn tất đăng ký'}
            </button>
          </form>

          <div className="ta-auth-footer">
            <p>Đã có tài khoản? <Link to="/login" className="ta-auth-link">Đăng nhập</Link></p>
            <Link to="/" className="ta-auth-link ta-auth-link--muted">← Về trang chủ</Link>
          </div>
        </div>
      </div>

      <div className="ta-auth-brand-side">
        <div className="ta-auth-brand-inner">
          <h2 className="ta-auth-brand-title">XÁC THỰC TRƯỚC KHI THAM GIA</h2>
          <p className="ta-auth-brand-desc">
            Mã OTP qua email giúp xác minh đúng địa chỉ email của bạn trước khi tạo tài khoản mới.
          </p>
          <div className="ta-auth-demo-box">
            <h4>Lưu ý:</h4>
            <ul>
              <li>OTP có hiệu lực trong vài phút</li>
              <li>Không chia sẻ mã OTP với người khác</li>
              <li>Bạn có thể quay lại để chỉnh email hoặc số điện thoại</li>
              <li>Sau khi xác minh, hệ thống sẽ đăng nhập tự động</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}