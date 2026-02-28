import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullname: '', email: '', phone: '', password: '', confirmPassword: '' });
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
    setForm({ ...form, [e.target.name]: e.target.value });
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
      await register({
        fullname: form.fullname,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate('/');
    } catch (err) {
      setServerError(err.response?.data?.error || err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container auth-grid">
      <section className="auth-card">
        <h1 className="auth-title">Tạo tài khoản mới</h1>
        <p className="auth-sub">Điền thông tin để bắt đầu hành trình học tập của bạn!</p>

        {serverError && <div className="error-msg">⚠️ {serverError}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className={`field ${errors.fullname ? 'error' : ''}`}>
            <span>Họ và tên *</span>
            <input type="text" name="fullname" value={form.fullname} onChange={handleChange} required />
            <small className="field-error">{errors.fullname}</small>
          </label>
          <label className={`field ${errors.email ? 'error' : ''}`}>
            <span>Email *</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
            <small className="field-error">{errors.email}</small>
          </label>
          <label className={`field ${errors.phone ? 'error' : ''}`}>
            <span>Số điện thoại *</span>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0123456789" required />
            <small className="field-error">{errors.phone}</small>
          </label>
          <label className={`field ${errors.password ? 'error' : ''}`}>
            <span>Mật khẩu *</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
            <small className="field-error">{errors.password}</small>
            <small className="field-hint">Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số</small>
          </label>
          <label className={`field ${errors.confirmPassword ? 'error' : ''}`}>
            <span>Xác nhận mật khẩu *</span>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
            <small className="field-error">{errors.confirmPassword}</small>
          </label>

          <div className="btn-row">
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng ký ngay'}
            </button>
            <Link className="btn btn-outline btn-lg" to="/login">
              Đã có tài khoản?
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/">Thoát</Link>
          </div>
        </form>
      </section>

      <aside className="auth-aside">
        <h2 className="promo-title">THAM GIA CÙNG CHÚNG TÔI</h2>
        <p className="promo-sub">
          Hơn 10,000+ sinh viên đã tin tưởng và học tập cùng PTIT LEARNING.
          Trở thành một phần của cộng đồng ngay hôm nay!
        </p>
        <div className="promo-features">
          <h3>Lợi ích khi đăng ký:</h3>
          <ul>
            <li>✓ Truy cập miễn phí các khóa học demo</li>
            <li>✓ Nhận thông báo về các ưu đãi mới</li>
            <li>✓ Tham gia cộng đồng học tập</li>
            <li>✓ Theo dõi tiến độ học tập</li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
