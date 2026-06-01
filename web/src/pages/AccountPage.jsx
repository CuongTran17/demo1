import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, ordersAPI, coursesAPI, certificatesAPI, wishlistAPI, notificationsAPI } from '../api';
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

function clampProgress(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function getLearningStatus(course) {
  const progress = clampProgress(course?.progress_percentage);
  if (progress >= 100 || course?.progress_status === 'completed') {
    return { key: 'completed', label: 'Hoàn thành' };
  }
  if (progress > 0) {
    return { key: 'learning', label: 'Đang học' };
  }
  return { key: 'not-started', label: 'Chưa bắt đầu' };
}

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
  certificates: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  wishlist: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
    </svg>
  ),
  notifications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
};

export default function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('progress');
  const [orders, setOrders] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [wishlistCourses, setWishlistCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [certDownloading, setCertDownloading] = useState(null);
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
    { key: 'wishlist', label: 'Yêu thích' },
    { key: 'notifications', label: 'Thông báo' },
    { key: 'orders', label: 'Đơn hàng' },
    { key: 'info', label: 'Thông tin cá nhân' },
    { key: 'password', label: 'Đổi mật khẩu' },
    { key: 'certificates', label: 'Chứng chỉ' },
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
      const [ordersRes, coursesRes, wishlistRes, notificationsRes, certsRes] = await Promise.all([
        ordersAPI.getAll().catch(() => ({ data: [] })),
        coursesAPI.getMyCourses().catch(() => ({ data: [] })),
        wishlistAPI.get().catch(() => ({ data: { courses: [] } })),
        notificationsAPI.get().catch(() => ({ data: { notifications: [], unreadCount: 0 } })),
        certificatesAPI.getMy().catch(() => ({ data: { certificates: [] } })),
      ]);
      setOrders(ordersRes.data.orders || ordersRes.data || []);
      setMyCourses(coursesRes.data.courses || coursesRes.data || []);
      setWishlistCourses(wishlistRes.data?.courses || []);
      setNotifications(notificationsRes.data?.notifications || []);
      setUnreadNotifications(notificationsRes.data?.unreadCount || 0);
      setCertificates(certsRes.data.certificates || []);
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

  const handleDownloadCert = async (courseId, courseName) => {
    setCertDownloading(courseId);
    try {
      const res = await certificatesAPI.download(courseId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Chung-chi-${courseName.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: 'Lỗi tải chứng chỉ, vui lòng thử lại', type: 'error' });
    } finally {
      setCertDownloading(null);
    }
  };

  const markNotificationRead = async (notification) => {
    if (!notification?.notification_id) return;
    try {
      await notificationsAPI.markRead(notification.notification_id);
      setNotifications((prev) => prev.map((item) => (
        item.notification_id === notification.notification_id
          ? { ...item, is_read: 1, read_at: item.read_at || new Date().toISOString() }
          : item
      )));
      setUnreadNotifications((count) => Math.max(0, count - (notification.is_read ? 0 : 1)));
      if (notification.action_url) navigate(notification.action_url);
    } catch {
      setToast({ message: 'Không cập nhật được thông báo', type: 'error' });
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1, read_at: item.read_at || new Date().toISOString() })));
      setUnreadNotifications(0);
    } catch {
      setToast({ message: 'Không cập nhật được thông báo', type: 'error' });
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };
  const pendingOrderCount = orders.filter(o => ['pending', 'pending_payment'].includes(o.status)).length;
  const completedCourseIds = new Set(certificates.map((cert) => String(cert.course_id)));
  const progressCourses = myCourses.map((course) => {
    const progress = completedCourseIds.has(String(course.course_id))
      ? 100
      : clampProgress(course.progress_percentage);
    const status = getLearningStatus({ ...course, progress_percentage: progress });
    return { ...course, progress, learningStatus: status };
  });
  const completedCourses = progressCourses.filter((course) => course.learningStatus.key === 'completed');
  const learningCourses = progressCourses.filter((course) => course.learningStatus.key === 'learning');
  const notStartedCourses = progressCourses.filter((course) => course.learningStatus.key === 'not-started');
  const averageProgress = progressCourses.length
    ? Math.round(progressCourses.reduce((sum, course) => sum + course.progress, 0) / progressCourses.length)
    : 0;
  const continueCourse = learningCourses
    .sort((a, b) => b.progress - a.progress)[0]
    || notStartedCourses[0]
    || completedCourses[0]
    || null;
  const progressDonut = {
    completed: progressCourses.length ? Math.round((completedCourses.length / progressCourses.length) * 100) : 0,
    learning: progressCourses.length ? Math.round((learningCourses.length / progressCourses.length) * 100) : 0,
  };
  progressDonut.notStarted = Math.max(0, 100 - progressDonut.completed - progressDonut.learning);
  const donutStyle = {
    background: `conic-gradient(#22c55e 0 ${progressDonut.completed}%, #6366f1 ${progressDonut.completed}% ${progressDonut.completed + progressDonut.learning}%, #e2e8f0 ${progressDonut.completed + progressDonut.learning}% 100%)`,
  };

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
              {item.key === 'notifications' && unreadNotifications > 0 && (
                <span className="account-ds-badge">{unreadNotifications}</span>
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
                  <span className="ta-stat-value">{completedCourses.length}</span>
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

            {myCourses.length === 0 ? (
              <div className="ta-empty-state student-progress-empty">
                <div className="ta-empty-icon">📚</div>
                <h3>Chưa có khóa học để theo dõi</h3>
                <p>Khi bạn mua khóa học, tiến độ học tập và gợi ý học tiếp sẽ hiển thị tại đây.</p>
                <Link to="/search" className="ta-btn ta-btn--primary">Khám phá khóa học</Link>
              </div>
            ) : (
              <>
                <div className="student-progress-grid">
                  <section className="student-continue-card">
                    <div className="student-section-head">
                      <div>
                        <h3>Tiếp tục học</h3>
                        <p>Quay lại khóa học phù hợp nhất với tiến độ hiện tại.</p>
                      </div>
                    </div>
                    {continueCourse ? (
                      <div className="student-continue-body">
                        <div className="student-continue-icon">▶</div>
                        <div className="student-continue-content">
                          <span className={`student-status-pill student-status-pill--${continueCourse.learningStatus.key}`}>
                            {continueCourse.learningStatus.label}
                          </span>
                          <h4>{continueCourse.course_name}</h4>
                          <p>{continueCourse.category || 'Khóa học của bạn'}</p>
                          <div className="student-progress-bar" aria-label={`Tiến độ ${continueCourse.progress}%`}>
                            <span style={{ width: `${continueCourse.progress}%` }} />
                          </div>
                          <div className="student-progress-meta">
                            <span>{continueCourse.progress}% hoàn thành</span>
                            <span>{continueCourse.progress >= 100 ? 'Đã sẵn sàng nhận chứng chỉ' : `Còn ${100 - continueCourse.progress}%`}</span>
                          </div>
                          <Link to={`/learning/${continueCourse.course_id}`} className="ta-btn ta-btn--primary">
                            {continueCourse.progress > 0 && continueCourse.progress < 100 ? 'Học tiếp' : 'Vào học'}
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="student-progress-donut-card">
                    <div className="student-section-head">
                      <div>
                        <h3>Trạng thái học tập</h3>
                        <p>Tổng quan tiến độ các khóa đã sở hữu.</p>
                      </div>
                    </div>
                    <div className="student-donut-wrap">
                      <div className="student-donut" style={donutStyle}>
                        <div>
                          <strong>{averageProgress}%</strong>
                          <span>trung bình</span>
                        </div>
                      </div>
                      <div className="student-donut-legend">
                        <div><span style={{ background: '#22c55e' }} /> Hoàn thành <strong>{completedCourses.length}</strong></div>
                        <div><span style={{ background: '#6366f1' }} /> Đang học <strong>{learningCourses.length}</strong></div>
                        <div><span style={{ background: '#e2e8f0' }} /> Chưa bắt đầu <strong>{notStartedCourses.length}</strong></div>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="student-progress-list">
                  <div className="student-section-head">
                    <div>
                      <h3>Tiến độ theo từng khóa</h3>
                      <p>Theo dõi trạng thái và tiếp tục học từ từng khóa của bạn.</p>
                    </div>
                  </div>
                  <div className="student-course-progress-list">
                    {progressCourses.map((course) => (
                      <article className="student-course-progress" key={course.course_id}>
                        <div className="student-course-progress-main">
                          <span className={`student-status-pill student-status-pill--${course.learningStatus.key}`}>
                            {course.learningStatus.label}
                          </span>
                          <h4>{course.course_name}</h4>
                          <p>{course.category || 'Khóa học'}</p>
                          <div className="student-progress-bar" aria-label={`Tiến độ ${course.progress}%`}>
                            <span style={{ width: `${course.progress}%` }} />
                          </div>
                        </div>
                        <div className="student-course-progress-side">
                          <strong>{course.progress}%</strong>
                          <Link to={`/learning/${course.course_id}`} className="ta-btn ta-btn--outline ta-btn--sm">
                            {course.progress > 0 && course.progress < 100 ? 'Học tiếp' : 'Vào học'}
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
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

        {activeTab === 'wishlist' && (
          <div>
            <h2 className="account-ds-title">Khóa học yêu thích</h2>
            {wishlistCourses.length === 0 ? (
              <div className="ta-empty-state">
                <div className="ta-empty-icon">♡</div>
                <h3>Chưa có khóa học yêu thích</h3>
                <p>Lưu các khóa học bạn quan tâm để quay lại mua sau.</p>
                <Link to="/search" className="ta-btn ta-btn--primary">Khám phá khóa học</Link>
              </div>
            ) : (
              <div className="ta-table-wrap">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Danh mục</th>
                      <th>Giá</th>
                      <th style={{ textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wishlistCourses.map((course) => (
                      <tr key={course.course_id}>
                        <td><strong>{course.course_name}</strong></td>
                        <td><span className="ta-badge ta-badge--info">{course.category}</span></td>
                        <td><strong>{formatPrice(course.price)}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <Link to={`/course/${course.course_id}`} className="ta-btn ta-btn--primary ta-btn--sm">
                            Xem chi tiết
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

        {activeTab === 'notifications' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h2 className="account-ds-title">Thông báo</h2>
              {unreadNotifications > 0 && (
                <button className="ta-btn ta-btn--outline ta-btn--sm" onClick={markAllNotificationsRead}>
                  Đánh dấu đã đọc
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="ta-empty-state">
                <div className="ta-empty-icon">!</div>
                <h3>Chưa có thông báo</h3>
                <p>Các nhắc nhở về giỏ hàng và tài khoản sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.notification_id}
                    className={`notification-item ${notification.is_read ? '' : 'notification-item--unread'}`}
                    onClick={() => markNotificationRead(notification)}
                  >
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <span>{new Date(notification.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    {notification.action_url && <span className="ta-btn ta-btn--primary ta-btn--sm">Mở</span>}
                  </button>
                ))}
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

        {activeTab === 'certificates' && (
          <div>
            <h2 className="account-ds-title">Chứng chỉ của tôi</h2>
            {certificates.length === 0 ? (
              <div className="ta-empty-state">
                <div className="ta-empty-icon">🏆</div>
                <h3>Chưa có chứng chỉ</h3>
                <p>Hoàn thành 100% bài học của một khóa học để nhận chứng chỉ.</p>
                <Link to="/search" className="ta-btn ta-btn--primary">Khám phá khóa học</Link>
              </div>
            ) : (
              <div className="ta-table-wrap">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Danh mục</th>
                      <th>Ngày cấp</th>
                      <th style={{ textAlign: 'center' }}>Chứng chỉ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map(cert => (
                      <tr key={cert.cert_id}>
                        <td><strong>{cert.course_name}</strong></td>
                        <td><span className="ta-badge ta-badge--info">{cert.category}</span></td>
                        <td>{new Date(cert.issued_at).toLocaleDateString('vi-VN')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="ta-btn ta-btn--primary ta-btn--sm"
                            disabled={certDownloading === cert.course_id}
                            onClick={() => handleDownloadCert(cert.course_id, cert.course_name)}
                          >
                            {certDownloading === cert.course_id ? '⏳ Đang tạo...' : '⬇ Tải về'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
