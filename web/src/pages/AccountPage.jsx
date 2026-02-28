import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, ordersAPI, coursesAPI } from '../api';
import { formatPrice } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('progress');
  const [orders, setOrders] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, coursesRes] = await Promise.all([
        ordersAPI.getAll().catch(() => ({ data: [] })),
        coursesAPI.getMyCourses().catch(() => ({ data: [] })),
      ]);
      setOrders(ordersRes.data.orders || ordersRes.data || []);
      setMyCourses(coursesRes.data.courses || coursesRes.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(profileForm);
      updateUser(profileForm);
      setToast({ message: 'Cập nhật thông tin thành công!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi cập nhật', type: 'error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setToast({ message: 'Mật khẩu xác nhận không khớp', type: 'error' });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setToast({ message: 'Mật khẩu phải có ít nhất 8 ký tự', type: 'error' });
      return;
    }
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setToast({ message: 'Đổi mật khẩu thành công!', type: 'success' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi đổi mật khẩu', type: 'error' });
    }
  };

  const tabs = [
    { key: 'progress', name: 'Tiến độ học tập' },
    { key: 'courses', name: 'Khóa học của tôi' },
    { key: 'orders', name: 'Đơn hàng' },
    { key: 'info', name: 'Thay đổi thông tin' },
    { key: 'password', name: 'Thay đổi mật khẩu' },
  ];

  const statusMap = {
    completed: { text: '✓ Đã thanh toán', color: '#28a745' },
    rejected: { text: '✗ Bị từ chối', color: '#dc3545' },
    pending_payment: { text: '⏳ Chờ duyệt', color: '#ffc107' },
    pending: { text: '⏳ Đang xử lý', color: '#ffc107' },
    cancelled: { text: '✗ Đã hủy', color: '#dc3545' },
  };

  if (loading) return <LoadingSpinner />;

  return (
    <main className="container account-page">
      <h1 className="page-title">Tài khoản của tôi</h1>

      <div className="account-layout">
        <aside className="account-sidebar">
          <nav className="sidebar-nav">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </aside>

        <section className="account-content">
          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-label">Tổng khóa học</div>
                  <div className="stat-value">{myCourses.length}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Đơn hàng</div>
                  <div className="stat-value">{orders.length}</div>
                </div>
              </div>
              <div className="stats-grid" style={{ marginTop: '16px' }}>
                <div className="stat-box">
                  <div className="stat-label">Đã hoàn thành</div>
                  <div className="stat-value">
                    {orders.filter((o) => o.status === 'completed').length}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Xếp hạng</div>
                  <div className="stat-value" style={{ fontSize: '18px' }}>
                    {myCourses.length > 0 ? 'Học viên tích cực' : 'Mới bắt đầu'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Courses Tab */}
          {activeTab === 'courses' && (
            <div>
              {myCourses.length === 0 ? (
                <div className="text-center" style={{ padding: '40px' }}>
                  <p style={{ color: '#666' }}>Bạn chưa có khóa học nào</p>
                  <Link to="/search" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Khám phá khóa học
                  </Link>
                </div>
              ) : (
                <div className="grid grid-2">
                  {myCourses.map((course) => (
                    <Link
                      key={course.course_id}
                      to={`/learning/${course.course_id}`}
                      className="card-link"
                    >
                      <div className="card">
                        <div className="card-body">
                          <h3 className="card-title">{course.course_name}</h3>
                          <p className="card-text">{course.category}</p>
                          <button className="btn btn-gradient btn-sm" style={{ width: 'fit-content', marginTop: '8px' }}>
                            ▶ Vào học
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Ngày đặt</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="4" className="text-center" style={{ padding: '40px', color: '#666' }}>Chưa có đơn hàng</td></tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.order_id}>
                        <td>#{order.order_id}</td>
                        <td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                        <td><strong>{formatPrice(order.total_amount)}</strong></td>
                        <td>
                          <span style={{ color: statusMap[order.status]?.color || '#666' }}>
                            {statusMap[order.status]?.text || order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div>
              <h2 style={{ margin: '0 0 24px' }}>Thông tin cá nhân</h2>
              <form className="account-form" onSubmit={handleUpdateProfile}>
                <div className="form-row">
                  <label className="field">
                    <span>Họ và tên *</span>
                    <input
                      type="text"
                      value={profileForm.fullname}
                      onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Email *</span>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Số điện thoại *</span>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div>
              <h2 style={{ margin: '0 0 24px' }}>Đổi mật khẩu</h2>
              <form className="account-form" onSubmit={handleChangePassword}>
                <div className="form-row">
                  <label className="field">
                    <span>Mật khẩu hiện tại *</span>
                    <input
                      type="password"
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Mật khẩu mới *</span>
                    <input
                      type="password"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Xác nhận mật khẩu mới *</span>
                    <input
                      type="password"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Đổi mật khẩu</button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      <div className="logout-section">
        <button className="btn-logout-full" onClick={logout}>
          Đăng xuất
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
