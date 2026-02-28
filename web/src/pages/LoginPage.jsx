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
    <main className="container auth-grid">
      <section className="auth-card">
        <h1 className="auth-title">Chào mừng trở lại</h1>
        <p className="auth-sub">Vui lòng nhập thông tin của bạn để bắt đầu ngay!</p>

        {error && <div className="error-msg">❌ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email/SĐT</span>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              autoComplete="username"
              required
              placeholder="Nhập email hoặc số điện thoại"
            />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Nhập mật khẩu"
            />
          </label>

          <div className="btn-row">
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <Link className="btn btn-outline btn-lg" to="/register">
              Tạo tài khoản
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/">
              Thoát
            </Link>
          </div>
        </form>
      </section>

      <aside className="auth-aside">
        <h2 className="promo-title">HỌC VỚI GIÁ TRỊ TUYỆT VỜI</h2>
        <p className="promo-sub">
          Tiết kiệm đến 70% với gói combo giảm giá của chúng tôi so với việc mua
          từng khóa học riêng lẻ. Tham gia ngay!
        </p>
        <div className="promo-features">
          <h3>Tài khoản mẫu để thử:</h3>
          <ul>
            <li>�‍🎓 Học viên: <strong>test@ptit.edu.vn</strong> / <strong>123456</strong></li>
            <li>👨‍🏫 Giảng viên: <strong>teacher1@ptit.edu.vn</strong> / <strong>teacher123</strong></li>
            <li>👑 Admin: <strong>admin@ptit.edu.vn</strong> / <strong>admin123</strong></li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
