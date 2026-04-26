import { useState } from 'react';
import { formatPrice } from '../../utils/courseFormat';

export default function AdminPromotionsTab({
  // Discount code props
  discountCodes,
  discountCodeForm,
  setDiscountCodeForm,
  editingDiscountCodeId,
  creatingDiscountCode,
  deletingDiscountCodeId,
  onSubmitDiscount,
  onStartEditDiscount,
  onCancelEditDiscount,
  onDeleteDiscount,
  // Flash sale props
  flashSaleConfig,
  flashSaleForm,
  setFlashSaleForm,
  savingFlashSale,
  disablingFlashSale,
  deletingFlashSale,
  onSaveFlashSale,
  onDeactivateFlashSale,
  onDeleteFlashSale,
  onToggleCourse,
  courses,
  courseCategories,
  selectedFlashSaleCourseNames,
}) {
  const [subTab, setSubTab] = useState('discounts');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`ta-btn ${subTab === 'discounts' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
          onClick={() => setSubTab('discounts')}
        >
          🏷️ Mã giảm giá ({discountCodes.length})
        </button>
        <button
          className={`ta-btn ${subTab === 'flash-sale' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
          onClick={() => setSubTab('flash-sale')}
        >
          ⚡ Flash Sale {flashSaleConfig?.is_active ? <span className="ta-badge ta-badge--active" style={{ marginLeft: 6, fontSize: 11 }}>Đang bật</span> : ''}
        </button>
      </div>

      {/* ── Mã giảm giá ── */}
      {subTab === 'discounts' && (
        <div>
          <div className="ta-form-card" style={{ marginBottom: 20 }}>
            <h3>{editingDiscountCodeId ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}</h3>
            {editingDiscountCodeId && (
              <p className="ta-text-muted" style={{ marginBottom: 12 }}>Bạn đang chỉnh sửa mã #{editingDiscountCodeId}</p>
            )}
            <form onSubmit={onSubmitDiscount}>
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Mã giảm giá <span className="ta-required">*</span></label>
                  <input
                    className="ta-form-input"
                    placeholder="VD: GIAM20"
                    value={discountCodeForm.code}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div>
                  <label className="ta-form-label">Loại giảm giá</label>
                  <select
                    className="ta-form-select"
                    value={discountCodeForm.discountType}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, discountType: e.target.value })}
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VND)</option>
                  </select>
                </div>
              </div>
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Giá trị giảm <span className="ta-required">*</span></label>
                  <input
                    type="number" min="1"
                    max={discountCodeForm.discountType === 'percentage' ? '100' : undefined}
                    className="ta-form-input"
                    placeholder={discountCodeForm.discountType === 'percentage' ? '1 - 100' : 'VD: 50000'}
                    value={discountCodeForm.discountValue}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, discountValue: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="ta-form-label">Đơn tối thiểu (VND)</label>
                  <input
                    type="number" min="0" className="ta-form-input"
                    value={discountCodeForm.minOrderAmount}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, minOrderAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Giảm tối đa (VND, tuỳ chọn)</label>
                  <input
                    type="number" min="1" className="ta-form-input"
                    value={discountCodeForm.maxDiscountAmount}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, maxDiscountAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ta-form-label">Số lượt sử dụng (tuỳ chọn)</label>
                  <input
                    type="number" min="1" className="ta-form-input"
                    value={discountCodeForm.usageLimit}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, usageLimit: e.target.value })}
                  />
                </div>
              </div>
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Bắt đầu (tuỳ chọn)</label>
                  <input
                    type="datetime-local" className="ta-form-input"
                    value={discountCodeForm.startsAt}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ta-form-label">Hết hạn (tuỳ chọn)</label>
                  <input
                    type="datetime-local" className="ta-form-input"
                    value={discountCodeForm.expiresAt}
                    onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="ta-form-label">Trạng thái</label>
                <select
                  className="ta-form-select"
                  value={discountCodeForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, isActive: e.target.value === 'active' })}
                >
                  <option value="active">Đang bật</option>
                  <option value="inactive">Đã tắt</option>
                </select>
              </div>
              <div className="ta-form-actions">
                <button type="submit" className="ta-btn ta-btn--primary" disabled={creatingDiscountCode}>
                  {creatingDiscountCode
                    ? (editingDiscountCodeId ? 'Đang cập nhật...' : 'Đang tạo...')
                    : (editingDiscountCodeId ? 'Cập nhật mã' : 'Tạo mã giảm giá')}
                </button>
                {editingDiscountCodeId && (
                  <button type="button" className="ta-btn ta-btn--outline" onClick={onCancelEditDiscount}>Huỷ chỉnh sửa</button>
                )}
              </div>
            </form>
          </div>

          <div className="ta-table-wrap">
            <div className="ta-table-header">
              <h3 className="ta-table-title">Danh sách mã giảm giá ({discountCodes.length})</h3>
            </div>
            {discountCodes.length === 0 ? (
              <div className="ta-empty">Chưa có mã giảm giá nào</div>
            ) : (
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead>
                    <tr><th>Code</th><th>Giá trị</th><th>Điều kiện</th><th>Sử dụng</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th></tr>
                  </thead>
                  <tbody>
                    {discountCodes.map((dc) => {
                      const valueLabel = dc.discount_type === 'percentage'
                        ? `${Number(dc.discount_value)}%`
                        : formatPrice(dc.discount_value);
                      const maxLabel = dc.max_discount_amount ? `, tối đa ${formatPrice(dc.max_discount_amount)}` : '';
                      const usageLabel = dc.usage_limit ? `${dc.used_count}/${dc.usage_limit}` : `${dc.used_count}/∞`;
                      const active = Boolean(dc.is_active);
                      return (
                        <tr key={dc.discount_id}>
                          <td className="ta-text-bold">{dc.code}</td>
                          <td>{valueLabel}</td>
                          <td>Từ {formatPrice(dc.min_order_amount || 0)}{maxLabel}</td>
                          <td>{usageLabel}</td>
                          <td>{dc.expires_at ? new Date(dc.expires_at).toLocaleString('vi-VN') : 'Không giới hạn'}</td>
                          <td>
                            <span className={`ta-badge ${active ? 'ta-badge--active' : 'ta-badge--rejected'}`}>
                              {active ? 'Đang bật' : 'Đã tắt'}
                            </span>
                          </td>
                          <td>
                            <div className="ta-actions">
                              <button type="button" className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => onStartEditDiscount(dc)}>
                                {editingDiscountCodeId === dc.discount_id ? 'Đang sửa' : 'Sửa'}
                              </button>
                              <button type="button" className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => onDeleteDiscount(dc)} disabled={deletingDiscountCodeId === dc.discount_id}>
                                {deletingDiscountCodeId === dc.discount_id ? 'Đang xoá...' : 'Xoá'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Flash Sale ── */}
      {subTab === 'flash-sale' && (
        <div>
          <div className="ta-form-card" style={{ marginBottom: 20 }}>
            <h3>Cấu hình Flash Sale</h3>
            <p className="ta-text-muted" style={{ marginBottom: 16 }}>
              Tạo hoặc chỉnh sửa flash sale theo toàn bộ khoá học, theo danh mục hoặc theo từng khoá học cụ thể.
            </p>
            <form onSubmit={onSaveFlashSale}>
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
                    type="number" min="1" max="90" className="ta-form-input"
                    placeholder="1 - 90"
                    value={flashSaleForm.discountPercentage}
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, discountPercentage: e.target.value })}
                    required
                  />
                </div>
              </div>

              {flashSaleForm.targetType === 'category' && (
                <div style={{ marginBottom: 16 }}>
                  <label className="ta-form-label">Danh mục áp dụng <span className="ta-required">*</span></label>
                  <select
                    className="ta-form-select"
                    value={flashSaleForm.targetValue}
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, targetValue: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {courseCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              )}

              {flashSaleForm.targetType === 'courses' && (
                <div style={{ marginBottom: 16 }}>
                  <label className="ta-form-label">Chọn khoá học áp dụng <span className="ta-required">*</span></label>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, maxHeight: 240, overflowY: 'auto', padding: '8px 10px', background: '#fff' }}>
                    {courses.length === 0 ? (
                      <div className="ta-text-muted">Chưa có khoá học nào để chọn</div>
                    ) : courses.map((course) => {
                      const id = String(course.course_id || '').trim();
                      const checked = flashSaleForm.courseIds.includes(id);
                      return (
                        <label key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 4px', borderBottom: '1px dashed #e2e8f0', cursor: 'pointer' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <input type="checkbox" checked={checked} onChange={() => onToggleCourse(id)} />
                            <span className="ta-text-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.course_name}</span>
                          </span>
                          <span className="ta-text-muted" style={{ whiteSpace: 'nowrap' }}>{formatPrice(course.price || 0)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="ta-text-muted" style={{ marginTop: 8 }}>Đã chọn {flashSaleForm.courseIds.length} khoá học</div>
                </div>
              )}

              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Bắt đầu <span className="ta-required">*</span></label>
                  <input
                    type="datetime-local" className="ta-form-input"
                    value={flashSaleForm.startAt}
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, startAt: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="ta-form-label">Kết thúc <span className="ta-required">*</span></label>
                  <input
                    type="datetime-local" className="ta-form-input"
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
                <button type="button" className="ta-btn ta-btn--danger" onClick={onDeactivateFlashSale} disabled={disablingFlashSale}>
                  {disablingFlashSale ? 'Đang tắt...' : 'Tắt flash sale'}
                </button>
                <button
                  type="button" className="ta-btn ta-btn--danger"
                  onClick={onDeleteFlashSale}
                  disabled={deletingFlashSale || !flashSaleConfig || Boolean(flashSaleConfig?.is_active)}
                  title={flashSaleConfig?.is_active ? 'Cần tắt flash sale trước khi xoá' : 'Xoá vĩnh viễn flash sale này'}
                >
                  {deletingFlashSale ? 'Đang xoá...' : 'Xoá flash sale'}
                </button>
              </div>
              {flashSaleConfig?.is_active && (
                <p className="ta-text-muted" style={{ marginTop: 8 }}>Muốn xoá flash sale, bạn cần tắt trước rồi mới xoá.</p>
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
                          <div className="ta-text-muted" style={{ marginTop: 6 }}>{selectedFlashSaleCourseNames.join(', ')}</div>
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
      )}
    </div>
  );
}
