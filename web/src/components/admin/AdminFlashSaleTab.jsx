import { formatPrice } from '../../utils/courseFormat';

export default function AdminFlashSaleTab({
  flashSaleConfig,
  flashSaleForm,
  setFlashSaleForm,
  savingFlashSale,
  disablingFlashSale,
  deletingFlashSale,
  onSave,
  onDeactivate,
  onDelete,
  onToggleCourse,
  courses,
  courseCategories,
  selectedFlashSaleCourseNames,
}) {
  return (
    <div>
      <div className="ta-form-card" style={{ marginBottom: '20px' }}>
        <h3>Cấu hình Flash Sale</h3>
        <p className="ta-text-muted" style={{ marginBottom: '16px' }}>
          Tạo hoặc chỉnh sửa flash sale theo toàn bộ khoá học, theo danh mục hoặc theo từng khoá học cụ thể.
        </p>

        <form onSubmit={onSave}>
          <div className="ta-form-grid">
            <div>
              <label className="ta-form-label">Đối tượng áp dụng</label>
              <select
                className="ta-form-select"
                value={flashSaleForm.targetType}
                onChange={(e) => setFlashSaleForm({
                  ...flashSaleForm,
                  targetType: e.target.value,
                  targetValue: e.target.value === 'all' ? '' : flashSaleForm.targetValue,
                })}
              >
                <option value="all">Tất cả khoá học</option>
                <option value="category">Theo danh mục</option>
                <option value="courses">Theo từng khoá học</option>
              </select>
            </div>
            <div>
              <label className="ta-form-label">Phần trăm giảm (%) <span className="ta-required">*</span></label>
              <input
                type="number"
                min="1"
                max="90"
                className="ta-form-input"
                placeholder="1 - 90"
                value={flashSaleForm.discountPercentage}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, discountPercentage: e.target.value })}
                required
              />
            </div>
          </div>

          {flashSaleForm.targetType === 'category' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="ta-form-label">Danh mục áp dụng <span className="ta-required">*</span></label>
              <select
                className="ta-form-select"
                value={flashSaleForm.targetValue}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, targetValue: e.target.value })}
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {courseCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          )}

          {flashSaleForm.targetType === 'courses' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="ta-form-label">Chọn khoá học áp dụng <span className="ta-required">*</span></label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', maxHeight: '240px', overflowY: 'auto', padding: '8px 10px', background: '#fff' }}>
                {courses.length === 0 ? (
                  <div className="ta-text-muted">Chưa có khoá học nào để chọn</div>
                ) : (
                  courses.map((course) => {
                    const id = String(course.course_id || '').trim();
                    const checked = flashSaleForm.courseIds.includes(id);
                    return (
                      <label
                        key={id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 4px', borderBottom: '1px dashed #e2e8f0', cursor: 'pointer' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <input type="checkbox" checked={checked} onChange={() => onToggleCourse(id)} />
                          <span className="ta-text-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {course.course_name}
                          </span>
                        </span>
                        <span className="ta-text-muted" style={{ whiteSpace: 'nowrap' }}>
                          {formatPrice(course.price || 0)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="ta-text-muted" style={{ marginTop: '8px' }}>
                Đã chọn {flashSaleForm.courseIds.length} khoá học
              </div>
            </div>
          )}

          <div className="ta-form-grid">
            <div>
              <label className="ta-form-label">Bắt đầu <span className="ta-required">*</span></label>
              <input
                type="datetime-local"
                className="ta-form-input"
                value={flashSaleForm.startAt}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, startAt: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="ta-form-label">Kết thúc <span className="ta-required">*</span></label>
              <input
                type="datetime-local"
                className="ta-form-input"
                value={flashSaleForm.endAt}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, endAt: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="ta-form-actions">
            <button type="submit" className="ta-btn ta-btn--primary" disabled={savingFlashSale}>
              {savingFlashSale ? 'Đang lưu...' : 'Lưu flash sale'}
            </button>
            <button type="button" className="ta-btn ta-btn--danger" onClick={onDeactivate} disabled={disablingFlashSale}>
              {disablingFlashSale ? 'Đang tắt...' : 'Tắt flash sale'}
            </button>
            <button
              type="button"
              className="ta-btn ta-btn--danger"
              onClick={onDelete}
              disabled={deletingFlashSale || !flashSaleConfig || Boolean(flashSaleConfig?.is_active)}
              title={flashSaleConfig?.is_active ? 'Cần tắt flash sale trước khi xoá' : 'Xoá vĩnh viễn flash sale này'}
            >
              {deletingFlashSale ? 'Đang xoá...' : 'Xoá flash sale'}
            </button>
          </div>
          {flashSaleConfig?.is_active && (
            <p className="ta-text-muted" style={{ marginTop: '8px' }}>
              Muốn xoá flash sale, bạn cần tắt trước rồi mới xoá.
            </p>
          )}
        </form>
      </div>

      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Trạng thái hiện tại</h3>
        </div>
        {!flashSaleConfig ? (
          <div className="ta-empty">Chưa có chương trình flash sale nào</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>Giảm giá</th><th>Đối tượng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ta-text-bold">{Number(flashSaleConfig.discount_percentage || 0)}%</td>
                  <td>
                    {flashSaleConfig.target_type === 'all' && 'Tất cả khoá học'}
                    {flashSaleConfig.target_type === 'category' && `Danh mục: ${flashSaleConfig.target_value || '-'}`}
                    {flashSaleConfig.target_type === 'courses' && `Theo khoá học (${flashSaleConfig.course_ids?.length || 0})`}
                    {!['all', 'category', 'courses'].includes(String(flashSaleConfig.target_type || '')) && '-'}
                    {flashSaleConfig.target_type === 'courses' && selectedFlashSaleCourseNames.length > 0 && (
                      <div className="ta-text-muted" style={{ marginTop: '6px' }}>
                        {selectedFlashSaleCourseNames.join(', ')}
                      </div>
                    )}
                  </td>
                  <td>{flashSaleConfig.start_at ? new Date(flashSaleConfig.start_at).toLocaleString('vi-VN') : '-'}</td>
                  <td>{flashSaleConfig.end_at ? new Date(flashSaleConfig.end_at).toLocaleString('vi-VN') : '-'}</td>
                  <td>
                    <span className={`ta-badge ${flashSaleConfig.is_active ? 'ta-badge--active' : 'ta-badge--rejected'}`}>
                      {flashSaleConfig.is_active ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
