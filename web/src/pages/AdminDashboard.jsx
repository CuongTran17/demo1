import { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../api';
import { formatPrice, resolveThumbnail } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import Chart from 'react-apexcharts';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'users', label: 'Quản lý người dùng' },
  { key: 'teachers', label: 'Giảng viên' },
  { key: 'courses', label: 'Khóa học' },
  { key: 'orders', label: 'Duyệt thanh toán' },
  { key: 'history', label: 'Lịch sử thanh toán' },
  { key: 'changes', label: 'Thay đổi chờ duyệt' },
  { key: 'locks', label: 'Yêu cầu khóa' },
  { key: 'revenue', label: 'Doanh thu' },
];

function getUserRole(email) {
  if (email === 'admin@ptit.edu.vn') return 'admin';
  if (/^teacher\d*@ptit\.edu\.vn$/.test(email)) return 'teacher';
  return 'student';
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [lockRequests, setLockRequests] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Create teacher form
  const [teacherForm, setTeacherForm] = useState({ fullname: '', email: '', phone: '', password: '' });
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);

  // Assign course form
  const [assignForm, setAssignForm] = useState({ teacherId: '', courseId: '' });
  const [showAssignCourse, setShowAssignCourse] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await adminAPI.getDashboard();
      setData(res.data);

      const [locksRes, revRes] = await Promise.all([
        adminAPI.getLockRequests().catch(() => ({ data: [] })),
        adminAPI.getRevenue().catch(() => ({ data: { total: 0, details: [] } })),
      ]);
      setLockRequests(locksRes.data || []);
      setRevenue(revRes.data);
    } catch {
      setToast({ message: 'Lỗi tải dữ liệu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const lockUser = async (userId, reason) => {
    const r = reason || prompt('Lý do khóa tài khoản:');
    if (!r) return;
    try {
      await adminAPI.lockUser(userId, r);
      setToast({ message: 'Đã khóa tài khoản', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const unlockUser = async (userId) => {
    try {
      await adminAPI.unlockUser(userId);
      setToast({ message: 'Đã mở khóa', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Xác nhận xóa người dùng này?')) return;
    try {
      await adminAPI.deleteUser(userId);
      setToast({ message: 'Đã xóa', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createTeacher(teacherForm);
      setToast({ message: 'Tạo giảng viên thành công!', type: 'success' });
      setShowCreateTeacher(false);
      setTeacherForm({ fullname: '', email: '', phone: '', password: '' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const assignCourse = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.assignCourse(assignForm.teacherId, assignForm.courseId);
      setToast({ message: 'Gán khóa học thành công!', type: 'success' });
      setShowAssignCourse(false);
      setAssignForm({ teacherId: '', courseId: '' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const approveOrder = async (orderId) => {
    try {
      await adminAPI.approveOrder(orderId);
      setToast({ message: 'Đã duyệt thanh toán', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const rejectOrder = async (orderId) => {
    const note = prompt('Lý do từ chối:') || '';
    try {
      await adminAPI.rejectOrder(orderId, note);
      setToast({ message: 'Đã từ chối', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const approveChange = async (changeId) => {
    try {
      await adminAPI.approveChange(changeId);
      setToast({ message: 'Đã duyệt', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const rejectChange = async (changeId) => {
    try {
      await adminAPI.rejectChange(changeId);
      setToast({ message: 'Đã từ chối', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const approveLock = async (requestId) => {
    try {
      await adminAPI.approveLockRequest(requestId);
      setToast({ message: 'Đã duyệt', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const rejectLock = async (requestId) => {
    try {
      await adminAPI.rejectLockRequest(requestId);
      setToast({ message: 'Đã từ chối', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="container text-center" style={{ padding: '80px' }}>Không có dữ liệu</div>;

  const { stats, users = [], teachers = [], courses = [], pendingChanges = [], pendingOrders = [], paymentHistory = [] } = data;

  return (
    <DashboardLayout
      menuItems={TABS}
      activeTab={tab}
      onTabChange={setTab}
      title="PTIT Learning"
      subtitle="Admin Panel"
      theme="admin"
      badges={{
        orders: pendingOrders.length,
        changes: pendingChanges.length,
        locks: lockRequests.length,
      }}
    >
      <div className="ds-content">

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <h2>Tổng quan hệ thống</h2>
            <div className="ta-metrics-grid">
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Người dùng</div>
                  <div className="ta-metric-value">{stats.totalUsers}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Giảng viên</div>
                  <div className="ta-metric-value">{stats.totalTeachers}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Khóa học</div>
                  <div className="ta-metric-value">{stats.totalCourses}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Đơn chờ duyệt</div>
                  <div className="ta-metric-value">{stats.pendingOrders}</div>
                  {stats.pendingOrders > 0 && (
                    <span className="ta-metric-trend ta-metric-trend--down">
                      <svg viewBox="0 0 14 14" fill="none"><path d="M7 3.5v7M4.5 8l2.5 2.5L9.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Cần xử lý
                    </span>
                  )}
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Thay đổi chờ duyệt</div>
                  <div className="ta-metric-value">{stats.pendingChanges}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--cyan">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Tổng doanh thu</div>
                  <div className="ta-metric-value">{formatPrice(stats.totalRevenue)}</div>
                  <span className="ta-metric-trend ta-metric-trend--up">
                    <svg viewBox="0 0 14 14" fill="none"><path d="M7 10.5v-7M4.5 6L7 3.5 9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Doanh thu
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            {revenue?.details?.length > 0 && (
              <div className="ta-chart-card">
                <div className="ta-chart-header">
                  <h3 className="ta-chart-title">Biểu đồ doanh thu theo người dùng</h3>
                </div>
                <Chart
                  type="bar"
                  height={320}
                  options={{
                    chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
                    colors: ['#3b82f6', '#22c55e'],
                    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                    xaxis: {
                      categories: revenue.details.slice(0, 10).map(d => (d.fullname || d.email || '').split(' ').pop()),
                      labels: { style: { colors: '#64748b', fontSize: '12px' } },
                    },
                    yaxis: {
                      labels: {
                        style: { colors: '#64748b', fontSize: '12px' },
                        formatter: (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
                      },
                    },
                    dataLabels: { enabled: false },
                    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                    tooltip: { y: { formatter: (v) => formatPrice(v) } },
                  }}
                  series={[{
                    name: 'Tổng chi',
                    data: revenue.details.slice(0, 10).map(d => Number(d.total_spent) || 0),
                  }]}
                />
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Quản lý người dùng ({users.length})</h3>
              </div>
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead>
                    <tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Hành động</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id}>
                        <td className="ta-text-muted">{u.user_id}</td>
                        <td className="ta-text-bold">{u.fullname}</td>
                        <td>{u.email}</td>
                        <td>{u.phone}</td>
                        <td><span className={`ta-badge ta-badge--${getUserRole(u.email) === 'admin' ? 'danger' : getUserRole(u.email) === 'teacher' ? 'info' : 'success'}`}>{getUserRole(u.email)}</span></td>
                        <td><span className={`ta-badge ${u.is_locked ? 'ta-badge--locked' : 'ta-badge--active'}`}>{u.is_locked ? 'Bị khóa' : 'Hoạt động'}</span></td>
                        <td>
                          <div className="ta-actions">
                            {u.is_locked ? (
                              <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => unlockUser(u.user_id)}>Mở khóa</button>
                            ) : (
                              <button className="ta-btn ta-btn--sm ta-btn--warning" onClick={() => lockUser(u.user_id)}>Khóa</button>
                            )}
                            <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteUser(u.user_id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Teachers */}
        {tab === 'teachers' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Quản lý giảng viên ({teachers.length})</h3>
                <div className="ta-actions">
                  <button className="ta-btn ta-btn--primary" onClick={() => setShowCreateTeacher(!showCreateTeacher)}>+ Thêm giảng viên</button>
                  <button className="ta-btn ta-btn--outline" onClick={() => setShowAssignCourse(!showAssignCourse)}>Gán khóa học</button>
                </div>
              </div>

              {showCreateTeacher && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>Tạo tài khoản giảng viên</h3>
                    <form onSubmit={createTeacher}>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Họ và tên</label>
                          <input className="ta-form-input" placeholder="Họ và tên" value={teacherForm.fullname} onChange={(e) => setTeacherForm({ ...teacherForm, fullname: e.target.value })} required />
                        </div>
                        <div>
                          <label className="ta-form-label">Email</label>
                          <input className="ta-form-input" placeholder="Email" type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
                        </div>
                      </div>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Số điện thoại</label>
                          <input className="ta-form-input" placeholder="Số điện thoại" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} required />
                        </div>
                        <div>
                          <label className="ta-form-label">Mật khẩu</label>
                          <input className="ta-form-input" placeholder="Mật khẩu" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
                        </div>
                      </div>
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">Tạo</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowCreateTeacher(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showAssignCourse && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>Gán khóa học cho giảng viên</h3>
                    <form onSubmit={assignCourse}>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Giảng viên</label>
                          <select className="ta-form-select" value={assignForm.teacherId} onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })} required>
                            <option value="">-- Chọn giảng viên --</option>
                            {teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.fullname}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="ta-form-label">Khóa học</label>
                          <select className="ta-form-select" value={assignForm.courseId} onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })} required>
                            <option value="">-- Chọn khóa học --</option>
                            {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">Gán</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowAssignCourse(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead><tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {teachers.map((t) => (
                      <tr key={t.user_id}>
                        <td className="ta-text-muted">{t.user_id}</td>
                        <td className="ta-text-bold">{t.fullname}</td>
                        <td>{t.email}</td>
                        <td>{t.phone}</td>
                        <td><span className={`ta-badge ${t.is_locked ? 'ta-badge--locked' : 'ta-badge--active'}`}>{t.is_locked ? 'Bị khóa' : 'Hoạt động'}</span></td>
                        <td>
                          <div className="ta-actions">
                            {t.is_locked ? (
                              <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => unlockUser(t.user_id)}>Mở khóa</button>
                            ) : (
                              <button className="ta-btn ta-btn--sm ta-btn--warning" onClick={() => lockUser(t.user_id)}>Khóa</button>
                            )}
                            <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteUser(t.user_id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Courses */}
        {tab === 'courses' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Khóa học ({courses.length})</h3>
              </div>
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead><tr><th>Ảnh</th><th>ID</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {courses.map((c) => {
                      const thumb = resolveThumbnail(c.thumbnail);
                      return (
                        <tr key={c.course_id}>
                          <td><img src={thumb} alt="" className="ta-cell-img" /></td>
                          <td className="ta-text-muted">{c.course_id}</td>
                          <td className="ta-text-bold">{c.course_name}</td>
                          <td>{c.category}</td>
                          <td className="ta-text-bold">{formatPrice(c.price)}</td>
                          <td><span className={`ta-badge ${c.has_pending_changes ? 'ta-badge--pending' : 'ta-badge--active'}`}>{c.has_pending_changes ? 'Chờ duyệt' : 'Hoạt động'}</span></td>
                          <td>
                            <label className="ta-btn ta-btn--sm ta-btn--primary" style={{ cursor: 'pointer' }}>
                              Đổi ảnh
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const fd = new FormData();
                                fd.append('image', file);
                                try {
                                  const res = await adminAPI.uploadImage(fd);
                                  await adminAPI.updateCourse(c.course_id, { thumbnail: res.data.imageUrl });
                                  setToast({ message: 'Đổi ảnh thành công', type: 'success' });
                                  loadDashboard();
                                } catch { setToast({ message: 'Lỗi đổi ảnh', type: 'error' }); }
                              }} />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Approval */}
        {tab === 'orders' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Đơn hàng chờ duyệt ({pendingOrders.length})</h3>
              </div>
              {pendingOrders.length === 0 ? (
                <div className="ta-empty">Không có đơn hàng nào chờ duyệt</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>Mã đơn</th><th>Người mua</th><th>Tổng tiền</th><th>PT thanh toán</th><th>Ghi chú</th><th>Ngày</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {pendingOrders.map((o) => (
                        <tr key={o.order_id}>
                          <td className="ta-text-bold">#{o.order_id}</td>
                          <td>{o.fullname || o.email}</td>
                          <td className="ta-text-bold">{formatPrice(o.total_amount)}</td>
                          <td><span className="ta-badge ta-badge--info">{o.payment_method}</span></td>
                          <td className="ta-text-muted">{o.note || '-'}</td>
                          <td className="ta-text-muted">{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div className="ta-actions">
                              <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => approveOrder(o.order_id)}>Duyệt</button>
                              <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => rejectOrder(o.order_id)}>Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History */}
        {tab === 'history' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Lịch sử thanh toán</h3>
              </div>
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead><tr><th>Mã đơn</th><th>Người mua</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                  <tbody>
                    {paymentHistory.length === 0 ? (
                      <tr><td colSpan="5"><div className="ta-empty">Chưa có lịch sử</div></td></tr>
                    ) : paymentHistory.map((o) => (
                      <tr key={o.order_id}>
                        <td className="ta-text-bold">#{o.order_id}</td>
                        <td>{o.fullname || o.email}</td>
                        <td className="ta-text-bold">{formatPrice(o.total_amount)}</td>
                        <td><span className={`ta-badge ${o.status === 'completed' ? 'ta-badge--approved' : 'ta-badge--rejected'}`}>{o.status === 'completed' ? 'Đã duyệt' : 'Từ chối'}</span></td>
                        <td className="ta-text-muted">{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pending Changes */}
        {tab === 'changes' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Thay đổi chờ duyệt ({pendingChanges.length})</h3>
              </div>
              {pendingChanges.length === 0 ? (
                <div className="ta-empty">Không có thay đổi nào chờ duyệt</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>ID</th><th>Giảng viên</th><th>Khóa học</th><th>Loại</th><th>Mô tả</th><th>Ngày</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {pendingChanges.map((c) => (
                        <tr key={c.change_id}>
                          <td className="ta-text-muted">{c.change_id}</td>
                          <td className="ta-text-bold">{c.teacher_name || c.teacher_id}</td>
                          <td>{c.course_name || c.course_id}</td>
                          <td><span className="ta-badge ta-badge--info">{c.change_type}</span></td>
                          <td className="ta-text-muted">{c.description || '-'}</td>
                          <td className="ta-text-muted">{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div className="ta-actions">
                              <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => approveChange(c.change_id)}>Duyệt</button>
                              <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => rejectChange(c.change_id)}>Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lock Requests */}
        {tab === 'locks' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Yêu cầu khóa tài khoản ({lockRequests.length})</h3>
              </div>
              {lockRequests.length === 0 ? (
                <div className="ta-empty">Không có yêu cầu nào</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>ID</th><th>Người dùng</th><th>Lý do</th><th>Người yêu cầu</th><th>Ngày</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {lockRequests.map((r) => (
                        <tr key={r.id}>
                          <td className="ta-text-muted">{r.id}</td>
                          <td className="ta-text-bold">{r.target_name || r.user_id}</td>
                          <td>{r.reason}</td>
                          <td>{r.requester_name || r.requested_by}</td>
                          <td className="ta-text-muted">{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div className="ta-actions">
                              <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => approveLock(r.id)}>Duyệt</button>
                              <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => rejectLock(r.id)}>Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue */}
        {tab === 'revenue' && (
          <div>
            <h2>Báo cáo doanh thu</h2>
            <div className="ta-metrics-grid">
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--cyan">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Tổng doanh thu</div>
                  <div className="ta-metric-value">{formatPrice(revenue?.total || 0)}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Giao dịch thành công</div>
                  <div className="ta-metric-value">{revenue?.details?.length || 0}</div>
                </div>
              </div>
            </div>
            {revenue?.details?.length > 0 && (
              <div className="ta-table-wrap">
                <div className="ta-table-header">
                  <h3 className="ta-table-title">Chi tiết doanh thu</h3>
                </div>
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>Người dùng</th><th>Số đơn</th><th>Tổng chi</th></tr></thead>
                    <tbody>
                      {revenue.details.map((d, i) => (
                        <tr key={i}>
                          <td className="ta-text-bold">{d.fullname || d.email}</td>
                          <td>{d.order_count}</td>
                          <td className="ta-text-bold">{formatPrice(d.total_spent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
