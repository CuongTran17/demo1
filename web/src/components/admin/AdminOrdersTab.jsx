import { formatPrice } from '../../utils/courseFormat';

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
