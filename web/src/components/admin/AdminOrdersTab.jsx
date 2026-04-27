import { formatPrice } from '../../utils/courseFormat';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

function getOrderStatusMeta(status) {
  if (status === 'completed') return { text: 'Thành công', badgeClass: 'ta-badge--approved' };
  if (status === 'pending_payment') return { text: 'Chờ IPN', badgeClass: 'ta-badge--pending' };
  if (status === 'cancelled') return { text: 'Đã hủy', badgeClass: 'ta-badge--warning' };
  if (status === 'rejected') return { text: 'Từ chối', badgeClass: 'ta-badge--rejected' };
  return { text: status || 'Không xác định', badgeClass: 'ta-badge--info' };
}

function getPaymentMethodLabel(method) {
  if (method === 'sepay') return 'SePay';
  if (!method) return '-';
  return String(method).toUpperCase();
}

export default function AdminOrdersTab({
  filteredOrderRows,
  orderHistoryRows,
  orderStatusFilter,
  setOrderStatusFilter,
  orderStatusCounts,
}) {
  const handleExportExcel = () => {
    const exportData = filteredOrderRows.map((o, i) => ({
      'STT': i + 1,
      'Mã đơn': `#${o.order_id}`,
      'Người mua': o.fullname || o.email,
      'Tổng tiền (VNĐ)': Number(o.total_amount) || 0,
      'Phương thức': getPaymentMethodLabel(o.payment_method),
      'Trạng thái': getOrderStatusMeta(o.status).text,
      'Ghi chú': o.approval_note || o.order_note || o.note || '-',
      'Cập nhật': (o.action_time || o.created_at) ? new Date(o.action_time || o.created_at).toLocaleString('vi-VN') : '-'
    }));
    exportToExcel(exportData, 'LichSuDonHang');
  };

  const handleExportPDF = () => {
    const exportData = filteredOrderRows.map((o, i) => ({
      'STT': i + 1,
      'Mã đơn': `#${o.order_id}`,
      'Người mua': o.fullname || o.email,
      'Tổng tiền (VNĐ)': Number(o.total_amount).toLocaleString('vi-VN'),
      'Phương thức': getPaymentMethodLabel(o.payment_method),
      'Trạng thái': getOrderStatusMeta(o.status).text,
      'Ghi chú': o.approval_note || o.order_note || o.note || '-',
      'Cập nhật': (o.action_time || o.created_at) ? new Date(o.action_time || o.created_at).toLocaleString('vi-VN') : '-'
    }));
    exportToPDF(exportData, 'LichSuDonHang', 'LỊCH SỬ ĐƠN HÀNG');
  };

  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Lịch sử đơn hàng ({filteredOrderRows.length}/{orderHistoryRows.length})</h3>
          <div className="ta-actions">
            {[
              { key: 'all', label: 'Tất cả', count: orderStatusCounts.all },
              { key: 'pending', label: 'Chờ IPN', count: orderStatusCounts.pending },
              { key: 'success', label: 'Thành công', count: orderStatusCounts.success },
              { key: 'failed', label: 'Thất bại', count: orderStatusCounts.failed },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                className={`ta-btn ta-btn--sm ${orderStatusFilter === key ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                onClick={() => setOrderStatusFilter(key)}
              >
                {label} ({count})
              </button>
            ))}
            <div style={{width: 8, display: 'inline-block'}}></div>
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportExcel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportPDF}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất PDF
            </button>
          </div>
        </div>

        {orderHistoryRows.length === 0 ? (
          <div className="ta-empty"><p>Chưa có đơn hàng nào</p></div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>Mã đơn</th><th>Người mua</th><th>Tổng tiền</th><th>PT thanh toán</th><th>Trạng thái</th><th>Ghi chú</th><th>Cập nhật</th></tr>
              </thead>
              <tbody>
                {filteredOrderRows.map((o) => {
                  const status = getOrderStatusMeta(o.status);
                  const note = o.approval_note || o.order_note || o.note || '-';
                  const updatedAt = o.action_time || o.created_at;
                  return (
                    <tr key={`${o.order_id}-${o.status || 'unknown'}`}>
                      <td className="ta-text-bold">#{o.order_id}</td>
                      <td>{o.fullname || o.email}</td>
                      <td className="ta-text-bold">{formatPrice(o.total_amount)}</td>
                      <td>
                        <span className={`ta-badge ${o.payment_method === 'sepay' ? 'ta-badge--success' : 'ta-badge--info'}`}>
                          {getPaymentMethodLabel(o.payment_method)}
                        </span>
                      </td>
                      <td><span className={`ta-badge ${status.badgeClass}`}>{status.text}</span></td>
                      <td className="ta-text-muted">{note}</td>
                      <td className="ta-text-muted">{updatedAt ? new Date(updatedAt).toLocaleString('vi-VN') : '-'}</td>
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
