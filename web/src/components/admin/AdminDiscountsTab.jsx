import { formatPrice } from '../../utils/courseFormat';

export default function AdminDiscountsTab({
  discountCodes,
  discountCodeForm,
  setDiscountCodeForm,
  editingDiscountCodeId,
  creatingDiscountCode,
  deletingDiscountCodeId,
  onSubmit,
  onStartEdit,
  onCancelEdit,
  onDelete,
}) {
  return (
    <div>
      <div className="ta-form-card ta-form-card--spaced">
        <h3>{editingDiscountCodeId ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}</h3>
        {editingDiscountCodeId && (
          <p className="ta-text-muted ta-form-row--compact">
            Bạn đang chỉnh sửa mã #{editingDiscountCodeId}
          </p>
        )}
        <form onSubmit={onSubmit}>
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
                type="number"
                min="1"
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
                type="number"
                min="0"
                className="ta-form-input"
                value={discountCodeForm.minOrderAmount}
                onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, minOrderAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="ta-form-grid">
            <div>
              <label className="ta-form-label">Giảm tối đa (VND, tuỳ chọn)</label>
              <input
                type="number"
                min="1"
                className="ta-form-input"
                value={discountCodeForm.maxDiscountAmount}
                onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, maxDiscountAmount: e.target.value })}
              />
            </div>
            <div>
              <label className="ta-form-label">Số lượt sử dụng (tuỳ chọn)</label>
              <input
                type="number"
                min="1"
                className="ta-form-input"
                value={discountCodeForm.usageLimit}
                onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, usageLimit: e.target.value })}
              />
            </div>
          </div>

          <div className="ta-form-grid">
            <div>
              <label className="ta-form-label">Bắt đầu (tuỳ chọn)</label>
              <input
                type="datetime-local"
                className="ta-form-input"
                value={discountCodeForm.startsAt}
                onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, startsAt: e.target.value })}
              />
            </div>
            <div>
              <label className="ta-form-label">Hết hạn (tuỳ chọn)</label>
              <input
                type="datetime-local"
                className="ta-form-input"
                value={discountCodeForm.expiresAt}
                onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <div className="ta-form-row">
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
                : (editingDiscountCodeId ? 'Cập nhật mã giảm giá' : 'Tạo mã giảm giá')}
            </button>
            {editingDiscountCodeId && (
              <button type="button" className="ta-btn ta-btn--outline" onClick={onCancelEdit}>
                Huỷ chỉnh sửa
              </button>
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
                  const usageLabel = dc.usage_limit ? `${dc.used_count}/${dc.usage_limit}` : `${dc.used_count}/không giới hạn`;
                  const active = Boolean(dc.is_active);
                  const deleting = deletingDiscountCodeId === dc.discount_id;
                  const editing = editingDiscountCodeId === dc.discount_id;
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
                          <button type="button" className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => onStartEdit(dc)}>
                            {editing ? 'Đang sửa' : 'Sửa'}
                          </button>
                          <button type="button" className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => onDelete(dc)} disabled={deleting}>
                            {deleting ? 'Đang xoá...' : 'Xoá'}
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
  );
}
