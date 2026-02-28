import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { formatPrice, resolveThumbnail } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const TABS = [
  { key: 'overview', label: '📊 Tổng quan' },
  { key: 'users', label: '👥 Quản lý người dùng' },
  { key: 'teachers', label: '👨‍🏫 Giảng viên' },
  { key: 'courses', label: '📚 Khóa học' },
  { key: 'orders', label: '💳 Duyệt thanh toán' },
  { key: 'history', label: '📝 Lịch sử thanh toán' },
  { key: 'changes', label: '🔄 Thay đổi chờ duyệt' },
  { key: 'locks', label: '🔒 Yêu cầu khóa' },
  { key: 'revenue', label: '💰 Doanh thu' },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Admin Panel</h3>
          <button className="sidebar-toggle mobile-only" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((t) => (
            <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setSidebarOpen(false); }}>
              {t.label}
              {t.key === 'orders' && pendingOrders.length > 0 && <span className="badge">{pendingOrders.length}</span>}
              {t.key === 'changes' && pendingChanges.length > 0 && <span className="badge">{pendingChanges.length}</span>}
              {t.key === 'locks' && lockRequests.length > 0 && <span className="badge">{lockRequests.length}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <button className="sidebar-floating-toggle mobile-only" onClick={() => setSidebarOpen(true)}>☰ Menu</button>

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <h2>Tổng quan hệ thống</h2>
            <div className="stats-grid">
              <div className="stat-box"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Người dùng</div></div>
              <div className="stat-box"><div className="stat-value">{stats.totalTeachers}</div><div className="stat-label">Giảng viên</div></div>
              <div className="stat-box"><div className="stat-value">{stats.totalCourses}</div><div className="stat-label">Khóa học</div></div>
              <div className="stat-box"><div className="stat-value">{stats.pendingOrders}</div><div className="stat-label">Đơn chờ duyệt</div></div>
            </div>
            <div className="stats-grid" style={{ marginTop: '16px' }}>
              <div className="stat-box"><div className="stat-value">{stats.pendingChanges}</div><div className="stat-label">Thay đổi chờ duyệt</div></div>
              <div className="stat-box"><div className="stat-value">{formatPrice(stats.totalRevenue)}</div><div className="stat-label">Tổng doanh thu</div></div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <h2>Quản lý người dùng ({users.length})</h2>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id}>
                      <td>{u.user_id}</td>
                      <td>{u.fullname}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td><span className={`badge-role badge-${getUserRole(u.email)}`}>{getUserRole(u.email)}</span></td>
                      <td><span style={{ color: u.is_locked ? '#dc3545' : '#28a745' }}>{u.is_locked ? '🔒 Bị khóa' : '✓ Hoạt động'}</span></td>
                      <td className="action-cell">
                        {u.is_locked ? (
                          <button className="btn btn-sm btn-primary" onClick={() => unlockUser(u.user_id)}>Mở khóa</button>
                        ) : (
                          <button className="btn btn-sm btn-warning" onClick={() => lockUser(u.user_id)}>Khóa</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.user_id)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Teachers */}
        {tab === 'teachers' && (
          <div>
            <div className="section-header">
              <h2>Quản lý giảng viên ({teachers.length})</h2>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTeacher(!showCreateTeacher)}>+ Thêm giảng viên</button>
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: '8px' }} onClick={() => setShowAssignCourse(!showAssignCourse)}>📚 Gán khóa học</button>
              </div>
            </div>

            {showCreateTeacher && (
              <div className="modal-inline">
                <h3>Tạo tài khoản giảng viên</h3>
                <form onSubmit={createTeacher}>
                  <div className="form-row">
                    <input placeholder="Họ và tên" value={teacherForm.fullname} onChange={(e) => setTeacherForm({ ...teacherForm, fullname: e.target.value })} required />
                    <input placeholder="Email" type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
                  </div>
                  <div className="form-row">
                    <input placeholder="Số điện thoại" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} required />
                    <input placeholder="Mật khẩu" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Tạo</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTeacher(false)}>Hủy</button>
                  </div>
                </form>
              </div>
            )}

            {showAssignCourse && (
              <div className="modal-inline">
                <h3>Gán khóa học cho giảng viên</h3>
                <form onSubmit={assignCourse}>
                  <div className="form-row">
                    <select value={assignForm.teacherId} onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })} required>
                      <option value="">-- Chọn giảng viên --</option>
                      {teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.fullname}</option>)}
                    </select>
                    <select value={assignForm.courseId} onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })} required>
                      <option value="">-- Chọn khóa học --</option>
                      {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Gán</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAssignCourse(false)}>Hủy</button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.user_id}>
                      <td>{t.user_id}</td>
                      <td>{t.fullname}</td>
                      <td>{t.email}</td>
                      <td>{t.phone}</td>
                      <td><span style={{ color: t.is_locked ? '#dc3545' : '#28a745' }}>{t.is_locked ? '🔒 Bị khóa' : '✓ Hoạt động'}</span></td>
                      <td className="action-cell">
                        {t.is_locked ? (
                          <button className="btn btn-sm btn-primary" onClick={() => unlockUser(t.user_id)}>Mở khóa</button>
                        ) : (
                          <button className="btn btn-sm btn-warning" onClick={() => lockUser(t.user_id)}>Khóa</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => deleteUser(t.user_id)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Courses */}
        {tab === 'courses' && (
          <div>
            <h2>Khóa học ({courses.length})</h2>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>Ảnh</th><th>ID</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                <tbody>
                  {courses.map((c) => {
                    const thumb = resolveThumbnail(c.thumbnail);
                    return (
                      <tr key={c.course_id}>
                        <td><img src={thumb} alt="" style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} /></td>
                        <td>{c.course_id}</td>
                        <td>{c.course_name}</td>
                        <td>{c.category}</td>
                        <td>{formatPrice(c.price)}</td>
                        <td><span style={{ color: c.has_pending_changes ? '#ffc107' : '#28a745' }}>{c.has_pending_changes ? 'Chờ duyệt' : 'Hoạt động'}</span></td>
                        <td className="action-cell">
                          <label className="btn btn-sm" style={{ cursor: 'pointer', background: '#007bff', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '13px' }}>
                            📷 Đổi ảnh
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
        )}

        {/* Orders Approval */}
        {tab === 'orders' && (
          <div>
            <h2>Đơn hàng chờ duyệt ({pendingOrders.length})</h2>
            {pendingOrders.length === 0 ? (
              <p style={{ color: '#666', padding: '40px 0' }}>Không có đơn hàng nào chờ duyệt</p>
            ) : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead><tr><th>Mã đơn</th><th>Người mua</th><th>Tổng tiền</th><th>PT thanh toán</th><th>Ghi chú</th><th>Ngày</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {pendingOrders.map((o) => (
                      <tr key={o.order_id}>
                        <td>#{o.order_id}</td>
                        <td>{o.fullname || o.email}</td>
                        <td><strong>{formatPrice(o.total_amount)}</strong></td>
                        <td>{o.payment_method}</td>
                        <td>{o.note || '-'}</td>
                        <td>{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="action-cell">
                          <button className="btn btn-sm btn-primary" onClick={() => approveOrder(o.order_id)}>✓ Duyệt</button>
                          <button className="btn btn-sm btn-danger" onClick={() => rejectOrder(o.order_id)}>✗ Từ chối</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment History */}
        {tab === 'history' && (
          <div>
            <h2>Lịch sử thanh toán</h2>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>Mã đơn</th><th>Người mua</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                <tbody>
                  {paymentHistory.length === 0 ? (
                    <tr><td colSpan="5" className="text-center" style={{ padding: '40px', color: '#666' }}>Chưa có lịch sử</td></tr>
                  ) : paymentHistory.map((o) => (
                    <tr key={o.order_id}>
                      <td>#{o.order_id}</td>
                      <td>{o.fullname || o.email}</td>
                      <td>{formatPrice(o.total_amount)}</td>
                      <td><span style={{ color: o.status === 'completed' ? '#28a745' : '#dc3545' }}>{o.status === 'completed' ? '✓ Đã duyệt' : '✗ Từ chối'}</span></td>
                      <td>{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Changes */}
        {tab === 'changes' && (
          <div>
            <h2>Thay đổi chờ duyệt ({pendingChanges.length})</h2>
            {pendingChanges.length === 0 ? (
              <p style={{ color: '#666', padding: '40px 0' }}>Không có thay đổi nào chờ duyệt</p>
            ) : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead><tr><th>ID</th><th>Giảng viên</th><th>Khóa học</th><th>Loại</th><th>Mô tả</th><th>Ngày</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {pendingChanges.map((c) => (
                      <tr key={c.change_id}>
                        <td>{c.change_id}</td>
                        <td>{c.teacher_name || c.teacher_id}</td>
                        <td>{c.course_name || c.course_id}</td>
                        <td>{c.change_type}</td>
                        <td>{c.description || '-'}</td>
                        <td>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="action-cell">
                          <button className="btn btn-sm btn-primary" onClick={() => approveChange(c.change_id)}>✓ Duyệt</button>
                          <button className="btn btn-sm btn-danger" onClick={() => rejectChange(c.change_id)}>✗ Từ chối</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lock Requests */}
        {tab === 'locks' && (
          <div>
            <h2>Yêu cầu khóa tài khoản ({lockRequests.length})</h2>
            {lockRequests.length === 0 ? (
              <p style={{ color: '#666', padding: '40px 0' }}>Không có yêu cầu nào</p>
            ) : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead><tr><th>ID</th><th>Người dùng</th><th>Lý do</th><th>Người yêu cầu</th><th>Ngày</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {lockRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.target_name || r.user_id}</td>
                        <td>{r.reason}</td>
                        <td>{r.requester_name || r.requested_by}</td>
                        <td>{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="action-cell">
                          <button className="btn btn-sm btn-primary" onClick={() => approveLock(r.id)}>✓ Duyệt</button>
                          <button className="btn btn-sm btn-danger" onClick={() => rejectLock(r.id)}>✗ Từ chối</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Revenue */}
        {tab === 'revenue' && (
          <div>
            <h2>Báo cáo doanh thu</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-value">{formatPrice(revenue?.total || 0)}</div>
                <div className="stat-label">Tổng doanh thu</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{revenue?.details?.length || 0}</div>
                <div className="stat-label">Giao dịch thành công</div>
              </div>
            </div>
            {revenue?.details?.length > 0 && (
              <div className="table-responsive" style={{ marginTop: '24px' }}>
                <table className="dashboard-table">
                  <thead><tr><th>Người dùng</th><th>Số đơn</th><th>Tổng chi</th></tr></thead>
                  <tbody>
                    {revenue.details.map((d, i) => (
                      <tr key={i}>
                        <td>{d.fullname || d.email}</td>
                        <td>{d.order_count}</td>
                        <td>{formatPrice(d.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
