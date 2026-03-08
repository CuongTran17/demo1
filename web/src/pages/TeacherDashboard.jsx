import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teacherAPI, lessonsAPI } from '../api';
import { formatPrice, resolveThumbnail } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'courses', label: 'Khóa học' },
  { key: 'lessons', label: 'Bài học' },
  { key: 'changes', label: 'Yêu cầu đã gửi' },
  { key: 'locks', label: 'Yêu cầu khóa TK' },
];

export default function TeacherDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

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
    <DashboardLayout
      menuItems={TABS}
      activeTab={tab}
      onTabChange={setTab}
      title="PTIT Learning"
      subtitle="Giảng viên"
      theme="teacher"
      badges={{
        changes: pendingChanges.filter(c => c.status === 'pending').length,
      }}
      onLogout={() => { logout(); navigate('/'); }}
    >
      <div className="ds-content">

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <h2>Tổng quan</h2>
            <div className="ta-metrics-grid">
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Khóa học</div>
                  <div className="ta-metric-value">{stats.totalCourses}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Học viên</div>
                  <div className="ta-metric-value">{stats.totalStudents}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Yêu cầu chờ duyệt</div>
                  <div className="ta-metric-value">{stats.pendingChanges}</div>
                  {stats.pendingChanges > 0 && (
                    <span className="ta-metric-trend ta-metric-trend--down">
                      <svg viewBox="0 0 14 14" fill="none"><path d="M7 3.5v7M4.5 8l2.5 2.5L9.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Đang chờ
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses */}
        {tab === 'courses' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Khóa học của tôi ({courses.length})</h3>
                <button className="ta-btn ta-btn--primary" onClick={openCreateCourse}>+ Tạo khóa học</button>
              </div>

              {showCourseForm && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>{editingCourse ? 'Cập nhật khóa học' : 'Tạo khóa học mới'}</h3>
                    <form onSubmit={submitCourse}>
                      <div className="ta-form-row">
                        <label className="ta-form-label">Tên khóa học <span className="ta-required">*</span></label>
                        <input className="ta-form-input" value={courseForm.course_name} onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })} required />
                      </div>
                      <div className="ta-form-row">
                        <label className="ta-form-label">Mô tả</label>
                        <textarea className="ta-form-textarea" rows="3" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
                      </div>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Giá (VNĐ) <span className="ta-required">*</span></label>
                          <input className="ta-form-input" type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} required />
                        </div>
                        <div>
                          <label className="ta-form-label">Danh mục</label>
                          <select className="ta-form-select" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}>
                            <option value="">-- Chọn --</option>
                            <option value="programming">Lập trình</option>
                            <option value="web">Web</option>
                            <option value="mobile">Mobile</option>
                            <option value="database">Cơ sở dữ liệu</option>
                            <option value="ai">AI/ML</option>
                            <option value="other">Khác</option>
                          </select>
                        </div>
                      </div>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Cấp độ</label>
                          <select className="ta-form-select" value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}>
                            <option value="beginner">Cơ bản</option>
                            <option value="intermediate">Trung cấp</option>
                            <option value="advanced">Nâng cao</option>
                          </select>
                        </div>
                        <div>
                          <label className="ta-form-label">Ảnh bìa</label>
                          <input className="ta-form-input" type="file" accept="image/*" onChange={handleImageUpload} style={{ padding: '8px 12px' }} />
                        </div>
                      </div>
                      {courseForm.thumbnail && (
                        <div style={{ marginBottom: '16px' }}>
                          <img src={courseForm.thumbnail.startsWith('/uploads/') || courseForm.thumbnail.startsWith('http') ? courseForm.thumbnail : `/uploads/course-images/${encodeURIComponent(courseForm.thumbnail)}`} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                        </div>
                      )}
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">{editingCourse ? 'Gửi yêu cầu cập nhật' : 'Gửi yêu cầu tạo'}</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowCourseForm(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead><tr><th>Ảnh</th><th>Tên</th><th>Danh mục</th><th>Cấp độ</th><th>Giá</th><th>Học viên</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {courses.length === 0 ? (
                      <tr><td colSpan="7"><div className="ta-empty">Chưa có khóa học</div></td></tr>
                    ) : courses.map((c) => (
                      <tr key={c.course_id}>
                        <td><img src={resolveThumbnail(c.thumbnail)} alt="" className="ta-cell-img" /></td>
                        <td className="ta-text-bold">{c.course_name}</td>
                        <td><span className="ta-badge ta-badge--info">{c.category}</span></td>
                        <td>{c.level}</td>
                        <td className="ta-text-bold">{formatPrice(c.price)}</td>
                        <td>{c.enrolled_students || 0}</td>
                        <td>
                          <div className="ta-actions">
                            <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => openEditCourse(c)}>Sửa</button>
                            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={() => { loadLessons(c.course_id); setTab('lessons'); }}>Bài học</button>
                            <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteCourse(c.course_id)}>Xóa</button>
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

        {/* Lessons */}
        {tab === 'lessons' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Quản lý bài học</h3>
                <div className="ta-actions">
                  <select className="ta-form-select" style={{ width: 'auto', minWidth: '180px' }} value={selectedCourse || ''} onChange={(e) => { if (e.target.value) loadLessons(e.target.value); }}>
                    <option value="">-- Chọn khóa học --</option>
                    {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                  </select>
                  <button className="ta-btn ta-btn--primary" onClick={() => openCreateLesson(selectedCourse)}>+ Thêm bài học</button>
                </div>
              </div>

              {showLessonForm && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>Tạo bài học mới</h3>
                    <form onSubmit={submitLesson}>
                      <div className="ta-form-row">
                        <label className="ta-form-label">Khóa học <span className="ta-required">*</span></label>
                        <select className="ta-form-select" value={lessonForm.course_id} onChange={(e) => setLessonForm({ ...lessonForm, course_id: e.target.value })} required>
                          <option value="">-- Chọn --</option>
                          {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                        </select>
                      </div>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Tên bài học <span className="ta-required">*</span></label>
                          <input className="ta-form-input" value={lessonForm.lesson_title} onChange={(e) => setLessonForm({ ...lessonForm, lesson_title: e.target.value })} required />
                        </div>
                        <div style={{ maxWidth: '120px' }}>
                          <label className="ta-form-label">Thứ tự</label>
                          <input className="ta-form-input" type="number" value={lessonForm.lesson_order} onChange={(e) => setLessonForm({ ...lessonForm, lesson_order: e.target.value })} />
                        </div>
                      </div>
                      <div className="ta-form-row">
                        <label className="ta-form-label">Video URL (YouTube)</label>
                        <input className="ta-form-input" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                      <div className="ta-form-row">
                        <label className="ta-form-label">Nội dung</label>
                        <textarea className="ta-form-textarea" rows="3" value={lessonForm.lesson_content} onChange={(e) => setLessonForm({ ...lessonForm, lesson_content: e.target.value })} />
                      </div>
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">Gửi yêu cầu</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowLessonForm(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {selectedCourse ? (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>#</th><th>Tên bài học</th><th>Video</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {courseLessons.length === 0 ? (
                        <tr><td colSpan="4"><div className="ta-empty">Chưa có bài học</div></td></tr>
                      ) : courseLessons.map((l, idx) => (
                        <tr key={l.lesson_id}>
                          <td>{l.lesson_order || idx + 1}</td>
                          <td className="ta-text-bold">{l.lesson_title}</td>
                          <td>{l.video_url ? <span className="ta-badge ta-badge--success">Có</span> : <span className="ta-badge ta-badge--warning">Chưa có</span>}</td>
                          <td>
                            <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteLesson(l.lesson_id)}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ta-empty">Hãy chọn một khóa học để xem bài học</div>
              )}
            </div>
          </div>
        )}

        {/* Pending Changes */}
        {tab === 'changes' && (
          <div className="ta-table-wrap">
            <div className="ta-table-header">
              <h3 className="ta-table-title">Yêu cầu đã gửi ({pendingChanges.length})</h3>
            </div>
            <div className="ta-table-scroll">
              <table className="ta-table">
                <thead><tr><th>ID</th><th>Loại</th><th>Khóa học</th><th>Trạng thái</th><th>Ghi chú admin</th><th>Ngày</th></tr></thead>
                <tbody>
                  {pendingChanges.length === 0 ? (
                    <tr><td colSpan="6"><div className="ta-empty">Chưa có yêu cầu</div></td></tr>
                  ) : pendingChanges.map((c) => (
                    <tr key={c.change_id}>
                      <td>{c.change_id}</td>
                      <td><span className="ta-badge ta-badge--info">{c.change_type}</span></td>
                      <td className="ta-text-bold">{c.course_name || c.course_id}</td>
                      <td>
                        <span className={`ta-badge ${c.status === 'approved' ? 'ta-badge--approved' : c.status === 'rejected' ? 'ta-badge--rejected' : 'ta-badge--pending'}`}>
                          {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Bị từ chối' : 'Đang chờ'}
                        </span>
                      </td>
                      <td className="ta-text-muted">{c.admin_note || '-'}</td>
                      <td className="ta-text-muted">{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
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
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Yêu cầu khóa tài khoản</h3>
                <button className="ta-btn ta-btn--primary" onClick={() => setShowLockForm(!showLockForm)}>+ Tạo yêu cầu</button>
              </div>

              {showLockForm && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>Gửi yêu cầu khóa/mở khóa</h3>
                    <form onSubmit={submitLockRequest}>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">ID người dùng <span className="ta-required">*</span></label>
                          <input className="ta-form-input" type="number" value={lockForm.targetUserId} onChange={(e) => setLockForm({ ...lockForm, targetUserId: e.target.value })} required />
                        </div>
                        <div>
                          <label className="ta-form-label">Loại yêu cầu</label>
                          <select className="ta-form-select" value={lockForm.requestType} onChange={(e) => setLockForm({ ...lockForm, requestType: e.target.value })}>
                            <option value="lock">Khóa tài khoản</option>
                            <option value="unlock">Mở khóa tài khoản</option>
                          </select>
                        </div>
                      </div>
                      <div className="ta-form-row">
                        <label className="ta-form-label">Lý do <span className="ta-required">*</span></label>
                        <textarea className="ta-form-textarea" rows="2" value={lockForm.reason} onChange={(e) => setLockForm({ ...lockForm, reason: e.target.value })} required />
                      </div>
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">Gửi</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowLockForm(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead><tr><th>ID</th><th>Người dùng</th><th>Loại</th><th>Lý do</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                  <tbody>
                    {lockRequests.length === 0 ? (
                      <tr><td colSpan="6"><div className="ta-empty">Chưa có yêu cầu</div></td></tr>
                    ) : lockRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td className="ta-text-bold">{r.target_name || r.user_id}</td>
                        <td><span className={`ta-badge ${r.request_type === 'lock' ? 'ta-badge--danger' : 'ta-badge--success'}`}>{r.request_type === 'lock' ? 'Khóa' : 'Mở khóa'}</span></td>
                        <td>{r.reason}</td>
                        <td>
                          <span className={`ta-badge ${r.status === 'approved' ? 'ta-badge--approved' : r.status === 'rejected' ? 'ta-badge--rejected' : 'ta-badge--pending'}`}>
                            {r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Bị từ chối' : 'Đang chờ'}
                          </span>
                        </td>
                        <td className="ta-text-muted">{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
