import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(emailOrPhone, password);
      if (userData.role === 'admin') navigate('/admin');
      else if (userData.role === 'teacher') navigate('/teacher');
      else navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Đăng nhập thất bại';
      setError(msg);
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
            <span className="ta-auth-logo-icon">P</span>
            <span className="ta-auth-logo-text">PTIT Learning</span>
          </Link>

          <h1 className="ta-auth-heading">Chào mừng trở lại</h1>
          <p className="ta-auth-sub">Vui lòng nhập thông tin của bạn để bắt đầu ngay!</p>

          {error && <div className="ta-auth-alert ta-auth-alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="ta-auth-field">
              <label className="ta-auth-label">Email / SĐT</label>
              <input
                className="ta-auth-input"
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                autoComplete="username"
                required
                placeholder="Nhập email hoặc số điện thoại"
              />
            </div>

            <div className="ta-auth-field">
              <label className="ta-auth-label">Mật khẩu</label>
              <input
                className="ta-auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Nhập mật khẩu"
              />
            </div>

            <div className="ta-auth-options">
              <label className="ta-auth-check">
                <input type="checkbox" /> <span>Ghi nhớ đăng nhập</span>
              </label>
              <Link to="#" className="ta-auth-link">Quên mật khẩu?</Link>
            </div>

            <button className="ta-auth-submit" type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="ta-auth-footer">
            <p>Chưa có tài khoản? <Link to="/register" className="ta-auth-link">Tạo tài khoản</Link></p>
            <Link to="/" className="ta-auth-link ta-auth-link--muted">← Về trang chủ</Link>
          </div>
        </div>
      </div>

      {/* Right – Brand Side */}
      <div className="ta-auth-brand-side">
        <div className="ta-auth-brand-inner">
          <h2 className="ta-auth-brand-title">HỌC VỚI GIÁ TRỊ TUYỆT VỜI</h2>
          <p className="ta-auth-brand-desc">
            Tiết kiệm đến 70% với gói combo giảm giá của chúng tôi so với việc mua
            từng khóa học riêng lẻ. Tham gia ngay!
          </p>
          <div className="ta-auth-demo-box">
            <h4>Tài khoản mẫu để thử:</h4>
            <ul>
              <li><strong>Học viên:</strong> test@ptit.edu.vn / 123456</li>
              <li><strong>Giảng viên:</strong> teacher1@ptit.edu.vn / teacher123</li>
              <li><strong>Admin:</strong> admin@ptit.edu.vn / admin123</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
