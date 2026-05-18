import { useMemo, useState } from 'react';
import { formatPrice } from '../../utils/courseFormat';

const EMPTY_FORM = {
  bundleName: '',
  description: '',
  thumbnail: '',
  bundlePrice: '',
  originalPrice: '',
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
    const payload = {
      ...form,
      originalPrice: form.originalPrice || computedOriginalPrice,
    };
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
      originalPrice: String(bundle.original_price || ''),
      courseIds: (bundle.items || []).map((item) => item.course_id),
      isActive: Boolean(bundle.is_active),
    });
  };

  return (
    <div>
      <div className="ta-table-header ta-table-header--spread">
        <h2>Combo khóa học</h2>
      </div>

      <form className="ta-form ta-bundle-form" onSubmit={submit}>
        <div className="ta-form-row">
          <div className="ta-form-group">
            <label className="ta-form-label">Tên combo</label>
            <input className="ta-form-input" value={form.bundleName} onChange={(e) => setForm({ ...form, bundleName: e.target.value })} required />
          </div>
          <div className="ta-form-group">
            <label className="ta-form-label">Giá combo</label>
            <input className="ta-form-input" type="number" value={form.bundlePrice} onChange={(e) => setForm({ ...form, bundlePrice: e.target.value })} required />
          </div>
          <div className="ta-form-group">
            <label className="ta-form-label">Giá gốc</label>
            <input className="ta-form-input" type="number" placeholder={String(computedOriginalPrice || '')} value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
          </div>
        </div>
        <div className="ta-form-group">
          <label className="ta-form-label">Mô tả</label>
          <textarea className="ta-form-input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="ta-form-group">
          <label className="ta-form-label">Ảnh thumbnail URL</label>
          <input className="ta-form-input" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
        </div>
        <div className="ta-form-group">
          <label className="ta-form-label">Khóa học trong combo</label>
          <div className="ta-course-picker">
            {courses.map((course) => (
              <label key={course.course_id} className="ta-course-picker__item">
                <input
                  type="checkbox"
                  checked={form.courseIds.includes(course.course_id)}
                  onChange={() => toggleCourse(course.course_id)}
                />
                <span>{course.course_name}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="ta-check-row">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <span>Đang mở bán</span>
        </label>
        <div className="ta-form-actions">
          <button className="ta-btn ta-btn--primary" type="submit">{editingId ? 'Cập nhật combo' : 'Tạo combo'}</button>
          {editingId && <button className="ta-btn ta-btn--outline" type="button" onClick={resetForm}>Hủy sửa</button>}
        </div>
      </form>

      <div className="ta-table-wrap ta-table-wrap--spaced">
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
                <td><strong>{bundle.bundle_name}</strong></td>
                <td>{bundle.items?.length || 0}</td>
                <td>{formatPrice(bundle.bundle_price)}</td>
                <td>{bundle.is_active ? 'Đang bán' : 'Đã ẩn'}</td>
                <td>
                  <button className="ta-btn ta-btn--outline ta-btn--sm" onClick={() => startEdit(bundle)}>Sửa</button>
                  <button className="ta-btn ta-btn--danger ta-btn--sm" onClick={() => onDelete(bundle)}>Xóa</button>
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
