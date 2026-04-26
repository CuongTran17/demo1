import { useState } from 'react';
import { formatPrice, resolveThumbnail } from '../../utils/courseFormat';

const CATEGORIES = [
  { value: 'programming', label: 'Lập trình' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'database', label: 'Cơ sở dữ liệu' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'other', label: 'Khác' },
];

const LEVELS = [
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung cấp' },
  { value: 'advanced', label: 'Nâng cao' },
];

function buildForm(course) {
  return {
    course_name: course.course_name || '',
    description: course.description || '',
    price: course.price != null ? String(course.price) : '',
    old_price: course.old_price != null ? String(course.old_price) : '',
    category: course.category || '',
    level: course.level || 'beginner',
    duration: course.duration != null ? String(course.duration) : '',
    discount_percentage: course.discount_percentage != null ? String(course.discount_percentage) : '',
    thumbnail: course.thumbnail || '',
    is_new: course.is_new ? 1 : 0,
  };
}

export default function AdminCoursesTab({
  courses,
  filteredAdminCourses,
  courseSearch,
  setCourseSearch,
  courseCategoryFilter,
  setCourseCategoryFilter,
  courseCategories,
  onSaveCourse,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (course) => {
    setEditingId(course.course_id);
    setEditForm(buildForm(course));
    setImageFile(null);
    setImagePreview(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveCourse(editingId, editForm, imageFile);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, value) => setEditForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      {/* Edit form */}
      {editingId && editForm && (
        <div className="ta-table-wrap">
          <div className="ta-table-header">
            <h3 className="ta-table-title">Chỉnh sửa khóa học</h3>
            <button className="ta-btn ta-btn--outline ta-btn--sm" onClick={cancelEdit}>✕ Hủy</button>
          </div>
          <form onSubmit={handleSubmit} className="ta-panel-body">
            <div className="ta-form-card">
              {/* Row 1: name + category */}
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Tên khóa học <span className="ta-required">*</span></label>
                  <input
                    className="ta-form-input"
                    value={editForm.course_name}
                    onChange={(e) => setField('course_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="ta-form-label">Danh mục</label>
                  <select className="ta-form-select" value={editForm.category} onChange={(e) => setField('category', e.target.value)}>
                    <option value="">-- Chọn --</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: price + old_price + level */}
              <div className="ta-form-grid ta-form-grid--thirds ta-form-grid--compact">
                <div>
                  <label className="ta-form-label">Giá (VNĐ) <span className="ta-required">*</span></label>
                  <input
                    className="ta-form-input"
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setField('price', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="ta-form-label">Giá gốc (VNĐ)</label>
                  <input
                    className="ta-form-input"
                    type="number"
                    min="0"
                    value={editForm.old_price}
                    onChange={(e) => setField('old_price', e.target.value)}
                    placeholder="Để trống nếu không có"
                  />
                </div>
                <div>
                  <label className="ta-form-label">Cấp độ</label>
                  <select className="ta-form-select" value={editForm.level} onChange={(e) => setField('level', e.target.value)}>
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: duration + discount + is_new */}
              <div className="ta-form-grid ta-form-grid--thirds ta-form-grid--compact">
                <div>
                  <label className="ta-form-label">Thời lượng (phút)</label>
                  <input
                    className="ta-form-input"
                    type="number"
                    min="0"
                    value={editForm.duration}
                    onChange={(e) => setField('duration', e.target.value)}
                    placeholder="VD: 120"
                  />
                </div>
                <div>
                  <label className="ta-form-label">Giảm giá (%)</label>
                  <input
                    className="ta-form-input"
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.discount_percentage}
                    onChange={(e) => setField('discount_percentage', e.target.value)}
                    placeholder="0 - 100"
                  />
                </div>
                <div className="ta-field-align-end">
                  <label className="ta-checkbox-row">
                    <input
                      type="checkbox"
                      checked={!!editForm.is_new}
                      onChange={(e) => setField('is_new', e.target.checked ? 1 : 0)}
                    />
                    Đánh dấu "Mới"
                  </label>
                </div>
              </div>

              {/* Row 4: description */}
              <div className="ta-form-row ta-form-row--compact">
                <label className="ta-form-label">Mô tả</label>
                <textarea
                  className="ta-form-textarea"
                  rows="3"
                  value={editForm.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>

              {/* Row 5: thumbnail */}
              <div className="ta-form-row ta-form-row--compact">
                <label className="ta-form-label">Ảnh bìa</label>
                <div className="ta-file-row">
                  <img
                    src={imagePreview || resolveThumbnail(editForm.thumbnail)}
                    alt=""
                    className="ta-image-preview"
                  />
                  <div className="ta-file-field">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="ta-form-input ta-file-input"
                    />
                    <div className="ta-form-hint">Chọn ảnh mới để thay thế, hoặc để trống để giữ nguyên</div>
                  </div>
                </div>
              </div>

              <div className="ta-form-actions ta-form-actions--top">
                <button type="submit" className="ta-btn ta-btn--primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button type="button" className="ta-btn ta-btn--outline" onClick={cancelEdit}>Hủy</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Courses table */}
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">
            Khóa học
            <span className="ta-count-muted">
              {filteredAdminCourses.length}/{courses.length}
            </span>
          </h3>
        </div>

        <div className="rm-filter-bar">
          <div className="rm-search-wrap">
            <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              className="rm-search-input"
              type="text"
              placeholder="Tìm theo tên khóa học..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            {courseSearch && (
              <button className="rm-clear-btn" onClick={() => setCourseSearch('')}>✕</button>
            )}
          </div>
          <select
            className="ta-form-select ta-select-filter"
            value={courseCategoryFilter}
            onChange={(e) => setCourseCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {courseCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {filteredAdminCourses.length === 0 ? (
          <div className="ta-empty">Không tìm thấy khóa học phù hợp</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>Ảnh</th><th>Tên</th><th>Danh mục</th><th>Cấp độ</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th></tr>
              </thead>
              <tbody>
                {filteredAdminCourses.map((c) => (
                  <tr key={c.course_id} className={editingId === c.course_id ? 'ta-row-highlight' : undefined}>
                    <td><img src={resolveThumbnail(c.thumbnail)} alt="" className="ta-cell-img" /></td>
                    <td>
                      <div className="ta-text-bold">{c.course_name}</div>
                      <div className="ta-text-muted ta-text-xs">{c.course_id}</div>
                    </td>
                    <td><span className="ta-badge ta-badge--info">{c.category || '-'}</span></td>
                    <td>{LEVELS.find(l => l.value === c.level)?.label || c.level || '-'}</td>
                    <td>
                      <div className="ta-text-bold">{formatPrice(c.price)}</div>
                      {c.discount_percentage > 0 && (
                        <div className="ta-discount-note">-{c.discount_percentage}%</div>
                      )}
                    </td>
                    <td>
                      <span className={`ta-badge ${c.has_pending_changes ? 'ta-badge--pending' : 'ta-badge--active'}`}>
                        {c.has_pending_changes ? 'Chờ duyệt' : 'Hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="ta-actions">
                        {editingId === c.course_id ? (
                          <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={cancelEdit}>Hủy sửa</button>
                        ) : (
                          <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => startEdit(c)}>Sửa</button>
                        )}
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
  );
}
