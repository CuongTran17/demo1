import { useState, useEffect } from 'react';
import { teacherAPI, lessonsAPI } from '../api';
import { formatPrice } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const TABS = [
  { key: 'overview', label: '📊 Tổng quan' },
  { key: 'courses', label: '📚 Khóa học' },
  { key: 'lessons', label: '📝 Bài học' },
  { key: 'changes', label: '🔄 Yêu cầu đã gửi' },
  { key: 'locks', label: '🔒 Yêu cầu khóa TK' },
];

export default function TeacherDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Course form
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    course_name: '', description: '', price: '', category: '', level: 'beginner', thumbnail: '',
  });

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    course_id: '', lesson_title: '', lesson_content: '', video_url: '', lesson_order: '',
  });

  // Selected course for lessons
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);

  // Lock request form
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockForm, setLockForm] = useState({ targetUserId: '', reason: '', requestType: 'lock' });
  const [lockRequests, setLockRequests] = useState([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await teacherAPI.getDashboard();
      setData(res.data);
      try {
        const locksRes = await teacherAPI.getMyLockRequests();
        setLockRequests(locksRes.data || []);
      } catch {}
    } catch {
      setToast({ message: 'Lỗi tải dữ liệu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (courseId) => {
    try {
      const res = await lessonsAPI.getByCourse(courseId);
      setCourseLessons(res.data.lessons || res.data || []);
      setSelectedCourse(courseId);
    } catch {
      setToast({ message: 'Lỗi tải bài học', type: 'error' });
    }
  };

  // === Course CRUD ===
  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ course_name: '', description: '', price: '', category: '', level: 'beginner', thumbnail: '' });
    setShowCourseForm(true);
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      course_name: course.course_name,
      description: course.description || '',
      price: course.price || '',
      category: course.category || '',
      level: course.level || 'beginner',
      thumbnail: course.thumbnail || '',
    });
    setShowCourseForm(true);
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await teacherAPI.updateCourse(editingCourse.course_id, courseForm);
        setToast({ message: 'Yêu cầu cập nhật đã gửi, chờ duyệt', type: 'success' });
      } else {
        await teacherAPI.createCourse(courseForm);
        setToast({ message: 'Yêu cầu tạo khóa học đã gửi, chờ duyệt', type: 'success' });
      }
      setShowCourseForm(false);
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const deleteCourse = async (courseId) => {
    if (!confirm('Yêu cầu xóa khóa học này sẽ được gửi cho admin duyệt. Tiếp tục?')) return;
    try {
      await teacherAPI.deleteCourse(courseId);
      setToast({ message: 'Yêu cầu xóa đã gửi', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  // === Image Upload ===
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await teacherAPI.uploadImage(formData);
      setCourseForm({ ...courseForm, thumbnail: res.data.imageUrl });
      setToast({ message: 'Upload ảnh thành công', type: 'success' });
    } catch {
      setToast({ message: 'Lỗi upload ảnh', type: 'error' });
    }
  };

  // === Lesson CRUD ===
  const openCreateLesson = (courseId) => {
    setLessonForm({ course_id: courseId || '', lesson_title: '', lesson_content: '', video_url: '', lesson_order: '' });
    setShowLessonForm(true);
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    try {
      await teacherAPI.createLesson(lessonForm);
      setToast({ message: 'Yêu cầu tạo bài học đã gửi, chờ duyệt', type: 'success' });
      setShowLessonForm(false);
      if (selectedCourse) loadLessons(selectedCourse);
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!confirm('Gửi yêu cầu xóa bài học?')) return;
    try {
      await teacherAPI.deleteLesson(lessonId);
      setToast({ message: 'Yêu cầu xóa đã gửi', type: 'success' });
      if (selectedCourse) loadLessons(selectedCourse);
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  // === Lock Requests ===
  const submitLockRequest = async (e) => {
    e.preventDefault();
    try {
      await teacherAPI.createLockRequest(lockForm);
      setToast({ message: 'Yêu cầu đã gửi', type: 'success' });
      setShowLockForm(false);
      setLockForm({ targetUserId: '', reason: '', requestType: 'lock' });
      const res = await teacherAPI.getMyLockRequests();
      setLockRequests(res.data || []);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="container text-center" style={{ padding: '80px' }}>Không có dữ liệu</div>;

  const { stats, courses = [], pendingChanges = [] } = data;

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Giảng viên</h3>
          <button className="sidebar-toggle mobile-only" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((t) => (
            <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setSidebarOpen(false); }}>
              {t.label}
              {t.key === 'changes' && pendingChanges.filter(c => c.status === 'pending').length > 0 && (
                <span className="badge">{pendingChanges.filter(c => c.status === 'pending').length}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <button className="sidebar-floating-toggle mobile-only" onClick={() => setSidebarOpen(true)}>☰ Menu</button>

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <h2>Tổng quan</h2>
            <div className="stats-grid">
              <div className="stat-box"><div className="stat-value">{stats.totalCourses}</div><div className="stat-label">Khóa học</div></div>
              <div className="stat-box"><div className="stat-value">{stats.totalStudents}</div><div className="stat-label">Học viên</div></div>
              <div className="stat-box"><div className="stat-value">{stats.pendingChanges}</div><div className="stat-label">Yêu cầu chờ duyệt</div></div>
            </div>
          </div>
        )}

        {/* Courses */}
        {tab === 'courses' && (
          <div>
            <div className="section-header">
              <h2>Khóa học của tôi ({courses.length})</h2>
              <button className="btn btn-primary btn-sm" onClick={openCreateCourse}>+ Tạo khóa học</button>
            </div>

            {showCourseForm && (
              <div className="modal-inline">
                <h3>{editingCourse ? 'Cập nhật khóa học' : 'Tạo khóa học mới'}</h3>
                <form onSubmit={submitCourse}>
                  <div className="form-row">
                    <label className="field">
                      <span>Tên khóa học *</span>
                      <input value={courseForm.course_name} onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })} required />
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="field">
                      <span>Mô tả</span>
                      <textarea rows="3" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
                    </label>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <label className="field">
                      <span>Giá (VNĐ) *</span>
                      <input type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} required />
                    </label>
                    <label className="field">
                      <span>Danh mục</span>
                      <select value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}>
                        <option value="">-- Chọn --</option>
                        <option value="programming">Lập trình</option>
                        <option value="web">Web</option>
                        <option value="mobile">Mobile</option>
                        <option value="database">Cơ sở dữ liệu</option>
                        <option value="ai">AI/ML</option>
                        <option value="other">Khác</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <label className="field">
                      <span>Cấp độ</span>
                      <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}>
                        <option value="beginner">Cơ bản</option>
                        <option value="intermediate">Trung cấp</option>
                        <option value="advanced">Nâng cao</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Ảnh bìa</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                  {courseForm.thumbnail && (
                    <div style={{ marginBottom: '16px' }}>
                      <img src={courseForm.thumbnail.startsWith('/uploads/') || courseForm.thumbnail.startsWith('http') ? courseForm.thumbnail : `/uploads/course-images/${encodeURIComponent(courseForm.thumbnail)}`} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                    </div>
                  )}
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">{editingCourse ? 'Gửi yêu cầu cập nhật' : 'Gửi yêu cầu tạo'}</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCourseForm(false)}>Hủy</button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>Tên</th><th>Danh mục</th><th>Cấp độ</th><th>Giá</th><th>Học viên</th><th>Hành động</th></tr></thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr><td colSpan="6" className="text-center" style={{ padding: '40px', color: '#666' }}>Chưa có khóa học</td></tr>
                  ) : courses.map((c) => (
                    <tr key={c.course_id}>
                      <td>{c.course_name}</td>
                      <td>{c.category}</td>
                      <td>{c.level}</td>
                      <td>{formatPrice(c.price)}</td>
                      <td>{c.enrolled_students || 0}</td>
                      <td className="action-cell">
                        <button className="btn btn-sm btn-primary" onClick={() => openEditCourse(c)}>✏️ Sửa</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { loadLessons(c.course_id); setTab('lessons'); }}>📝 Bài học</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteCourse(c.course_id)}>🗑️ Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lessons */}
        {tab === 'lessons' && (
          <div>
            <div className="section-header">
              <h2>Quản lý bài học</h2>
              <div>
                <select
                  value={selectedCourse || ''}
                  onChange={(e) => { if (e.target.value) loadLessons(e.target.value); }}
                  style={{ marginRight: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="">-- Chọn khóa học --</option>
                  {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => openCreateLesson(selectedCourse)}>+ Thêm bài học</button>
              </div>
            </div>

            {showLessonForm && (
              <div className="modal-inline">
                <h3>Tạo bài học mới</h3>
                <form onSubmit={submitLesson}>
                  <div className="form-row">
                    <label className="field">
                      <span>Khóa học *</span>
                      <select value={lessonForm.course_id} onChange={(e) => setLessonForm({ ...lessonForm, course_id: e.target.value })} required>
                        <option value="">-- Chọn --</option>
                        {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
                    <label className="field">
                      <span>Tên bài học *</span>
                      <input value={lessonForm.lesson_title} onChange={(e) => setLessonForm({ ...lessonForm, lesson_title: e.target.value })} required />
                    </label>
                    <label className="field">
                      <span>Thứ tự</span>
                      <input type="number" value={lessonForm.lesson_order} onChange={(e) => setLessonForm({ ...lessonForm, lesson_order: e.target.value })} style={{ width: '80px' }} />
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="field">
                      <span>Video URL (YouTube)</span>
                      <input value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="field">
                      <span>Nội dung</span>
                      <textarea rows="3" value={lessonForm.lesson_content} onChange={(e) => setLessonForm({ ...lessonForm, lesson_content: e.target.value })} />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Gửi yêu cầu</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowLessonForm(false)}>Hủy</button>
                  </div>
                </form>
              </div>
            )}

            {selectedCourse ? (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead><tr><th>#</th><th>Tên bài học</th><th>Video</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {courseLessons.length === 0 ? (
                      <tr><td colSpan="4" className="text-center" style={{ padding: '40px', color: '#666' }}>Chưa có bài học</td></tr>
                    ) : courseLessons.map((l, idx) => (
                      <tr key={l.lesson_id}>
                        <td>{l.lesson_order || idx + 1}</td>
                        <td>{l.lesson_title}</td>
                        <td>{l.video_url ? '✓ Có' : '✗ Chưa có'}</td>
                        <td className="action-cell">
                          <button className="btn btn-sm btn-danger" onClick={() => deleteLesson(l.lesson_id)}>🗑️ Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#666', padding: '40px 0' }}>Hãy chọn một khóa học để xem bài học</p>
            )}
          </div>
        )}

        {/* Pending Changes */}
        {tab === 'changes' && (
          <div>
            <h2>Yêu cầu đã gửi ({pendingChanges.length})</h2>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>ID</th><th>Loại</th><th>Khóa học</th><th>Trạng thái</th><th>Ghi chú admin</th><th>Ngày</th></tr></thead>
                <tbody>
                  {pendingChanges.length === 0 ? (
                    <tr><td colSpan="6" className="text-center" style={{ padding: '40px', color: '#666' }}>Chưa có yêu cầu</td></tr>
                  ) : pendingChanges.map((c) => (
                    <tr key={c.change_id}>
                      <td>{c.change_id}</td>
                      <td>{c.change_type}</td>
                      <td>{c.course_name || c.course_id}</td>
                      <td>
                        <span style={{ color: c.status === 'approved' ? '#28a745' : c.status === 'rejected' ? '#dc3545' : '#ffc107' }}>
                          {c.status === 'approved' ? '✓ Đã duyệt' : c.status === 'rejected' ? '✗ Bị từ chối' : '⏳ Đang chờ'}
                        </span>
                      </td>
                      <td>{c.admin_note || '-'}</td>
                      <td>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lock Requests */}
        {tab === 'locks' && (
          <div>
            <div className="section-header">
              <h2>Yêu cầu khóa tài khoản</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLockForm(!showLockForm)}>+ Tạo yêu cầu</button>
            </div>

            {showLockForm && (
              <div className="modal-inline">
                <h3>Gửi yêu cầu khóa/mở khóa</h3>
                <form onSubmit={submitLockRequest}>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <label className="field">
                      <span>ID người dùng *</span>
                      <input type="number" value={lockForm.targetUserId} onChange={(e) => setLockForm({ ...lockForm, targetUserId: e.target.value })} required />
                    </label>
                    <label className="field">
                      <span>Loại yêu cầu</span>
                      <select value={lockForm.requestType} onChange={(e) => setLockForm({ ...lockForm, requestType: e.target.value })}>
                        <option value="lock">Khóa tài khoản</option>
                        <option value="unlock">Mở khóa tài khoản</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="field">
                      <span>Lý do *</span>
                      <textarea rows="2" value={lockForm.reason} onChange={(e) => setLockForm({ ...lockForm, reason: e.target.value })} required />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Gửi</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowLockForm(false)}>Hủy</button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>ID</th><th>Người dùng</th><th>Loại</th><th>Lý do</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                <tbody>
                  {lockRequests.length === 0 ? (
                    <tr><td colSpan="6" className="text-center" style={{ padding: '40px', color: '#666' }}>Chưa có yêu cầu</td></tr>
                  ) : lockRequests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.target_name || r.user_id}</td>
                      <td>{r.request_type === 'lock' ? '🔒 Khóa' : '🔓 Mở khóa'}</td>
                      <td>{r.reason}</td>
                      <td>
                        <span style={{ color: r.status === 'approved' ? '#28a745' : r.status === 'rejected' ? '#dc3545' : '#ffc107' }}>
                          {r.status === 'approved' ? '✓ Đã duyệt' : r.status === 'rejected' ? '✗ Bị từ chối' : '⏳ Đang chờ'}
                        </span>
                      </td>
                      <td>{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
