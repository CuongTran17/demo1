import { useMemo, useState } from 'react';
import { formatPrice } from '../../utils/courseFormat';

const EMPTY_FORM = {
  bundleName: '',
  description: '',
  thumbnail: '',
  bundlePrice: '',
  courseIds: [],
  isActive: true,
};

export default function AdminBundlesTab({ bundles, courses, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const selectedCourses = useMemo(
    () => courses.filter((course) => form.courseIds.includes(course.course_id)),
    [courses, form.courseIds]
  );
  const computedOriginalPrice = selectedCourses.reduce((sum, course) => sum + Number(course.price || 0), 0);
  const activeBundles = bundles.filter((bundle) => Boolean(bundle.is_active)).length;

  const toggleCourse = (courseId) => {
    setForm((prev) => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter((id) => id !== courseId)
        : [...prev.courseIds, courseId],
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form };
    if (editingId) await onUpdate(editingId, payload);
    else await onCreate(payload);
    resetForm();
  };

  const startEdit = (bundle) => {
    setEditingId(bundle.bundle_id);
    setForm({
      bundleName: bundle.bundle_name || '',
      description: bundle.description || '',
      thumbnail: bundle.thumbnail || '',
      bundlePrice: String(bundle.bundle_price || ''),
      courseIds: (bundle.items || []).map((item) => item.course_id),
      isActive: Boolean(bundle.is_active),
    });
  };

  return (
    <div className="ta-bundles-tab">
      <div className="ta-bundles-hero">
        <div>
          <span className="ta-section-kicker">Thương mại</span>
          <h2>Combo khóa học</h2>
          <p>Tạo gói học theo lộ trình, đặt giá ưu đãi và quản lý trạng thái bán của từng combo.</p>
        </div>
        <div className="ta-bundles-stats">
          <div>
            <strong>{bundles.length}</strong>
            <span>Tổng combo</span>
          </div>
          <div>
            <strong>{activeBundles}</strong>
            <span>Đang bán</span>
          </div>
          <div>
            <strong>{courses.length}</strong>
            <span>Khóa có thể chọn</span>
          </div>
        </div>
      </div>

      <form className="ta-form-card ta-bundle-form" onSubmit={submit}>
        <div className="ta-bundle-form__head">
          <div>
            <h3>{editingId ? 'Chỉnh sửa combo' : 'Tạo combo mới'}</h3>
            <p>{selectedCourses.length} khóa được chọn, tổng giá lẻ {formatPrice(computedOriginalPrice)}</p>
          </div>
          {editingId && <span className="ta-bundle-edit-pill">Đang sửa #{editingId}</span>}
        </div>

        <div className="ta-bundle-form-grid">
          <div className="ta-form-group ta-bundle-name-field">
            <label className="ta-form-label">Tên combo</label>
            <input
              className="ta-form-input"
              value={form.bundleName}
              onChange={(event) => setForm({ ...form, bundleName: event.target.value })}
              required
            />
          </div>
          <div className="ta-form-group">
            <label className="ta-form-label">Giá combo</label>
            <input
              className="ta-form-input"
              type="number"
              value={form.bundlePrice}
              onChange={(event) => setForm({ ...form, bundlePrice: event.target.value })}
              required
            />
          </div>
          <div className="ta-form-group">
            <label className="ta-form-label">Giá gốc từ khóa học</label>
            <div className="ta-form-input" aria-readonly="true">{formatPrice(computedOriginalPrice)}</div>
          </div>
        </div>

        <div className="ta-form-group">
          <label className="ta-form-label">Mô tả</label>
          <textarea
            className="ta-form-input"
            rows="3"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>

        <div className="ta-form-group">
          <label className="ta-form-label">Ảnh thumbnail URL</label>
          <input
            className="ta-form-input"
            value={form.thumbnail}
            onChange={(event) => setForm({ ...form, thumbnail: event.target.value })}
          />
        </div>

        <div className="ta-bundle-course-section">
          <div className="ta-bundle-course-head">
            <label className="ta-form-label">Khóa học trong combo</label>
            <span>{selectedCourses.length} đã chọn</span>
          </div>
          <div className="ta-bundle-course-picker">
            {courses.map((course) => {
              const checked = form.courseIds.includes(course.course_id);
              return (
                <label key={course.course_id} className={`ta-bundle-course-option${checked ? ' is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCourse(course.course_id)}
                  />
                  <span className="ta-bundle-course-option__main">
                    <strong>{course.course_name}</strong>
                    <small>{course.category || 'Chưa phân loại'} - {formatPrice(course.price || 0)}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="ta-check-row">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          <span>Đang mở bán</span>
        </label>

        <div className="ta-form-actions">
          <button className="ta-btn ta-btn--primary" type="submit">
            {editingId ? 'Cập nhật combo' : 'Tạo combo'}
          </button>
          {editingId && (
            <button className="ta-btn ta-btn--outline" type="button" onClick={resetForm}>
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      <div className="ta-table-wrap ta-table-wrap--spaced ta-bundle-table-wrap">
        <div className="ta-table-header ta-table-header--spread">
          <h3 className="ta-table-title">Danh sách combo</h3>
        </div>
        <table className="ta-table">
          <thead>
            <tr>
              <th>Combo</th>
              <th>Khóa học</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((bundle) => (
              <tr key={bundle.bundle_id}>
                <td>
                  <div className="ta-bundle-row-title">
                    <strong>{bundle.bundle_name}</strong>
                    {bundle.description && <span>{bundle.description}</span>}
                  </div>
                </td>
                <td><span className="ta-bundle-count">{bundle.items?.length || 0} khóa</span></td>
                <td>
                  <div className="ta-bundle-price-cell">
                    <strong>{formatPrice(bundle.bundle_price)}</strong>
                    {Number(bundle.original_price || 0) > Number(bundle.bundle_price || 0) && (
                      <span>{formatPrice(bundle.original_price)}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`ta-badge ${bundle.is_active ? 'ta-badge--active' : 'ta-badge--rejected'}`}>
                    {bundle.is_active ? 'Đang bán' : 'Đã ẩn'}
                  </span>
                </td>
                <td>
                  <div className="ta-actions">
                    <button className="ta-btn ta-btn--outline ta-btn--sm" onClick={() => startEdit(bundle)}>Sửa</button>
                    <button className="ta-btn ta-btn--danger ta-btn--sm" onClick={() => onDelete(bundle)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {bundles.length === 0 && (
              <tr><td colSpan="5" className="ta-text-muted">Chưa có combo khóa học.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
