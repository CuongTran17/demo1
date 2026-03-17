import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, ordersAPI, coursesAPI } from '../api';
import { formatPrice } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const CANCEL_REASONS = [
  'Tôi muốn thay đổi phương thức thanh toán',
  'Tôi đã chọn nhầm khóa học',
  'Tôi tìm được giá tốt hơn',
  'Tôi không còn nhu cầu học',
  'Thời gian chờ xử lý quá lâu',
];

const NAV_ICONS = {
  progress: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  courses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  orders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  password: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
};

export default function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('progress');
  const [orders, setOrders] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [cancelModal, setCancelModal] = useState({ open: false, orderId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const menuItems = [
    { key: 'progress', label: 'Tiến độ học tập' },
    { key: 'courses', label: 'Khóa học của tôi' },
    { key: 'orders', label: 'Đơn hàng' },
    { key: 'info', label: 'Thông tin cá nhân' },
    { key: 'password', label: 'Đổi mật khẩu' },
  ];

  const statusMap = {
    completed: { text: '✓ Đã thanh toán', color: '#22c55e', bg: '#f0fdf4' },
    rejected: { text: '✗ Bị từ chối', color: '#ef4444', bg: '#fef2f2' },
    pending_payment: { text: '⏳ Chờ IPN', color: '#f59e0b', bg: '#fffbeb' },
    pending: { text: '⏳ Đang xử lý', color: '#f59e0b', bg: '#fffbeb' },
    cancelled: { text: '✗ Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [ordersRes, coursesRes] = await Promise.all([
        ordersAPI.getAll().catch(() => ({ data: [] })),
        coursesAPI.getMyCourses().catch(() => ({ data: [] })),
      ]);
      setOrders(ordersRes.data.orders || ordersRes.data || []);
      setMyCourses(coursesRes.data.courses || coursesRes.data || []);
    } catch (err) {
      console.warn('Account data load failed:', err);
    } finally {
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
      setToast({ message: 'Mật khẩu xác nhận không khớp', type: 'error' }); return;
    }
    if (pwForm.newPassword.length < 8) {
      setToast({ message: 'Mật khẩu phải có ít nhất 8 ký tự', type: 'error' }); return;
    }
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setToast({ message: 'Đổi mật khẩu thành công!', type: 'success' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi đổi mật khẩu', type: 'error' });
    }
  };

  const openCancelModal = (orderId) => { setCancelModal({ open: true, orderId }); setCancelReason(''); setCustomReason(''); };
  const closeCancelModal = () => { setCancelModal({ open: false, orderId: null }); setCancelReason(''); setCustomReason(''); };

  const handleCancelOrder = async () => {
    const reason = cancelReason === '__custom__' ? customReason.trim() : cancelReason;
    if (!reason) { setToast({ message: 'Vui lòng chọn hoặc nhập lý do hủy đơn', type: 'error' }); return; }
    setCancelling(true);
    try {
      await ordersAPI.cancelOrder(cancelModal.orderId, reason);
      setToast({ message: 'Đơn hàng đã được hủy thành công', type: 'success' });
      closeCancelModal();
      await loadData();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi hủy đơn hàng', type: 'error' });
    } finally { setCancelling(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };
  const pendingOrderCount = orders.filter(o => ['pending', 'pending_payment'].includes(o.status)).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="account-ds-wrap">
      <aside className="account-ds-sidebar">
        <div className="account-ds-user">
          <div className="account-ds-avatar">{user?.fullname?.[0]?.toUpperCase() || 'U'}</div>
          <div className="account-ds-user-info">
            <div className="account-ds-username">{user?.fullname}</div>
            <div className="account-ds-role">Học viên</div>
          </div>
        </div>
        <nav className="account-ds-nav">
          {menuItems.map(item => (
            <button
              key={item.key}
              className={"account-ds-nav-item" + (activeTab === item.key ? ' active' : '')}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="account-ds-nav-icon">{NAV_ICONS[item.key]}</span>
              <span>{item.label}</span>
              {item.key === 'orders' && pendingOrderCount > 0 && (
                <span className="account-ds-badge">{pendingOrderCount}</span>
              )}
            </button>
          ))}
        </nav>
        <button className="account-ds-logout" onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Đăng xuất</span>
        </button>
      </aside>

      <main className="account-ds-main">
        {activeTab === 'progress' && (
          <div>
            <h2 className="account-ds-title">Tiến độ học tập</h2>
            <div className="ta-stats-row">
              <div className="ta-stat-card">
                <div className="ta-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>📚</div>
                <div className="ta-stat-info">
                  <span className="ta-stat-label">Tổng khóa học</span>
                  <span className="ta-stat-value">{myCourses.length}</span>
                </div>
              </div>
              <div className="ta-stat-card">
                <div className="ta-stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>🛒</div>
                <div className="ta-stat-info">
                  <span className="ta-stat-label">Đơn hàng</span>
                  <span className="ta-stat-value">{orders.length}</span>
                </div>
              </div>
              <div className="ta-stat-card">
                <div className="ta-stat-icon" style={{ background: '#fefce8', color: '#eab308' }}>✅</div>
                <div className="ta-stat-info">
                  <span className="ta-stat-label">Đã hoàn thành</span>
                  <span className="ta-stat-value">{orders.filter(o => o.status === 'completed').length}</span>
                </div>
              </div>
              <div className="ta-stat-card">
                <div className="ta-stat-icon" style={{ background: '#fdf4ff', color: '#a855f7' }}>🏆</div>
                <div className="ta-stat-info">
                  <span className="ta-stat-label">Xếp hạng</span>
                  <span className="ta-stat-value" style={{ fontSize: '16px' }}>
                    {myCourses.length > 0 ? 'Tích cực' : 'Mới'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <h2 className="account-ds-title">Khóa học của tôi</h2>
            {myCourses.length === 0 ? (
              <div className="ta-empty-state">
                <div className="ta-empty-icon">📚</div>
                <h3>Chưa có khóa học</h3>
                <p>Bạn chưa đăng ký khóa học nào. Hãy khám phá ngay!</p>
                <Link to="/search" className="ta-btn ta-btn--primary">Khám phá khóa học</Link>
              </div>
            ) : (
              <div className="ta-table-wrap">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Danh mục</th>
                      <th style={{ textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCourses.map(course => (
                      <tr key={course.course_id}>
                        <td><strong>{course.course_name}</strong></td>
                        <td><span className="ta-badge ta-badge--info">{course.category}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <Link to={"/learning/" + course.course_id} className="ta-btn ta-btn--primary ta-btn--sm">
                            ▶ Vào học
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="account-ds-title">Đơn hàng của tôi</h2>
            {orders.length === 0 ? (
              <div className="ta-empty-state">
                <div className="ta-empty-icon">🛒</div>
                <h3>Chưa có đơn hàng</h3>
                <p>Bạn chưa có đơn hàng nào.</p>
                <Link to="/search" className="ta-btn ta-btn--primary">Mua khóa học</Link>
              </div>
            ) : (
              <div className="ta-table-wrap">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Ngày đặt</th>
                      <th>Tổng tiền</th>
                      <th>Phương thức</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const st = statusMap[order.status] || { text: order.status, color: '#666', bg: '#f9fafb' };
                      const canCancel = ['pending', 'pending_payment'].includes(order.status);
                      return (
                        <tr key={order.order_id}>
                          <td><strong>#{order.order_id}</strong></td>
                          <td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                          <td><strong>{formatPrice(order.total_amount)}</strong></td>
                          <td>{order.payment_method === 'sepay' ? 'SePay' : 'Chuyển khoản'}</td>
                          <td>
                            <span className="ta-badge" style={{ background: st.bg, color: st.color, border: "1px solid " + st.color + "20" }}>
                              {st.text}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {canCancel && (
                              <button className="ta-btn ta-btn--danger ta-btn--sm" onClick={() => openCancelModal(order.order_id)}>
                                Hủy đơn
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div>
            <h2 className="account-ds-title">Thông tin cá nhân</h2>
            <form className="ta-form" onSubmit={handleUpdateProfile}>
              <div className="ta-form-group">
                <label className="ta-form-label">Họ và tên *</label>
                <input className="ta-form-input" type="text" value={profileForm.fullname}
                  onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })} required />
              </div>
              <div className="ta-form-group">
                <label className="ta-form-label">Email *</label>
                <input className="ta-form-input" type="email" value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
              </div>
              <div className="ta-form-group">
                <label className="ta-form-label">Số điện thoại *</label>
                <input className="ta-form-input" type="tel" value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} required />
              </div>
              <div style={{ marginTop: '4px' }}>
                <button type="submit" className="ta-btn ta-btn--primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div>
            <h2 className="account-ds-title">Đổi mật khẩu</h2>
            <form className="ta-form" onSubmit={handleChangePassword}>
              <div className="ta-form-group">
                <label className="ta-form-label">Mật khẩu hiện tại *</label>
                <input className="ta-form-input" type="password" value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
              </div>
              <div className="ta-form-group">
                <label className="ta-form-label">Mật khẩu mới *</label>
                <input className="ta-form-input" type="password" value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <div className="ta-form-group">
                <label className="ta-form-label">Xác nhận mật khẩu mới *</label>
                <input className="ta-form-input" type="password" value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
              </div>
              <div style={{ marginTop: '4px' }}>
                <button type="submit" className="ta-btn ta-btn--primary">Đổi mật khẩu</button>
              </div>
            </form>
          </div>
        )}
      </main>

      {cancelModal.open && (
        <div className="cancel-modal-backdrop" onClick={closeCancelModal}>
          <div className="cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="cancel-modal-header">
              <h3>Hủy đơn hàng #{cancelModal.orderId}</h3>
              <button className="cancel-modal-close" onClick={closeCancelModal}>×</button>
            </div>
            <div className="cancel-modal-body">
              <p style={{ marginBottom: '16px', color: '#64748b' }}>Vui lòng chọn lý do hủy đơn hàng:</p>
              <div className="cancel-reasons">
                {CANCEL_REASONS.map((reason, idx) => (
                  <label key={idx} className={"cancel-reason-item" + (cancelReason === reason ? ' active' : '')}>
                    <input type="radio" name="cancelReason" value={reason}
                      checked={cancelReason === reason} onChange={() => setCancelReason(reason)} />
                    <span>{reason}</span>
                  </label>
                ))}
                <label className={"cancel-reason-item" + (cancelReason === '__custom__' ? ' active' : '')}>
                  <input type="radio" name="cancelReason" value="__custom__"
                    checked={cancelReason === '__custom__'} onChange={() => setCancelReason('__custom__')} />
                  <span>Lý do khác</span>
                </label>
              </div>
              {cancelReason === '__custom__' && (
                <textarea className="cancel-custom-reason" placeholder="Nhập lý do của bạn..."
                  value={customReason} onChange={e => setCustomReason(e.target.value)} rows={3} />
              )}
            </div>
            <div className="cancel-modal-footer">
              <button className="ta-btn ta-btn--outline" onClick={closeCancelModal}>Quay lại</button>
              <button className="ta-btn ta-btn--danger" onClick={handleCancelOrder}
                disabled={cancelling || (!cancelReason || (cancelReason === '__custom__' && !customReason.trim()))}>
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}