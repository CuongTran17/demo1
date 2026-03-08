import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vnpayAPI, ordersAPI } from '../api';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const CANCEL_REASONS = [
  'Thanh toán VNPay thất bại',
  'Tôi muốn thay đổi phương thức thanh toán',
  'Tôi đã chọn nhầm khóa học',
  'Tôi không còn nhu cầu học',
];

export default function VNPayReturnPage() {
  const [searchParams] = useSearchParams();
  const { fetchCart } = useCart();
  const [status, setStatus] = useState('loading'); // loading | success | failed | error
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [toast, setToast] = useState(null);

  // Cancel modal state
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [orderCancelled, setOrderCancelled] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const res = await vnpayAPI.verifyReturn(params);
        setOrderId(res.data.orderId);
        if (res.data.code === '00') {
          setStatus('success');
          setMessage('Thanh toán thành công! Khóa học đã được kích hoạt.');
          // Refresh cart since it was cleared on order creation
          await fetchCart();
        } else {
          setStatus('failed');
          setMessage(res.data.message || 'Thanh toán không thành công.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Lỗi xác minh thanh toán. Vui lòng liên hệ hỗ trợ nếu tiền đã bị trừ.');
      }
    };
    verifyPayment();
  }, [searchParams]);

  const handleCancelOrder = async () => {
    const reason = cancelReason === '__custom__' ? customReason.trim() : cancelReason;
    if (!reason) {
      setToast({ message: 'Vui lòng chọn lý do hủy đơn', type: 'error' });
      return;
    }
    setCancelling(true);
    try {
      await ordersAPI.cancelOrder(orderId, reason);
      setToast({ message: 'Đơn hàng đã được hủy thành công', type: 'success' });
      setShowCancel(false);
      setOrderCancelled(true);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi hủy đơn hàng', type: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container text-center" style={{ padding: '80px 20px' }}>
        <LoadingSpinner />
        <p style={{ marginTop: '16px', fontSize: '18px', color: '#666' }}>
          Đang xác minh thanh toán...
        </p>
      </div>
    );
  }

  return (
    <div className="container text-center" style={{ padding: '80px 20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '24px' }}>
        {status === 'success' ? '🎉' : orderCancelled ? '🗑️' : '❌'}
      </div>
      <h1 style={{ fontSize: '32px', marginBottom: '16px', color: status === 'success' ? '#22c55e' : orderCancelled ? '#6b7280' : '#ef4444' }}>
        {status === 'success' ? 'Thanh toán thành công!' : orderCancelled ? 'Đơn hàng đã hủy' : 'Thanh toán thất bại'}
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
        {orderCancelled ? 'Đơn hàng của bạn đã được hủy. Bạn có thể đặt lại bất cứ lúc nào.' : message}
      </p>
      {orderId && (
        <p style={{ fontSize: '16px', color: '#999', marginBottom: '32px' }}>
          Mã đơn hàng: <strong>#{orderId}</strong>
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {status === 'success' ? (
          <>
            <Link to="/account" className="btn btn-primary btn-lg">
              Xem khóa học của tôi
            </Link>
            <Link to="/" className="btn btn-outline btn-lg">
              Về trang chủ
            </Link>
          </>
        ) : orderCancelled ? (
          <>
            <Link to="/search" className="btn btn-primary btn-lg">
              Tiếp tục mua sắm
            </Link>
            <Link to="/" className="btn btn-outline btn-lg">
              Về trang chủ
            </Link>
          </>
        ) : (
          <>
            <button
              className="btn btn-lg"
              style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={() => setShowCancel(true)}
            >
              Hủy đơn hàng
            </button>
            <Link to="/cart" className="btn btn-primary btn-lg">
              Quay lại giỏ hàng
            </Link>
            <Link to="/" className="btn btn-outline btn-lg">
              Về trang chủ
            </Link>
          </>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancel && (
        <div className="cancel-modal-backdrop" onClick={() => setShowCancel(false)}>
          <div className="cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="cancel-modal-header">
              <h3>Hủy đơn hàng #{orderId}</h3>
              <button className="cancel-modal-close" onClick={() => setShowCancel(false)}>×</button>
            </div>
            <div className="cancel-modal-body">
              <p style={{ marginBottom: '16px', color: '#64748b', textAlign: 'left' }}>Vui lòng chọn lý do hủy đơn hàng:</p>
              <div className="cancel-reasons">
                {CANCEL_REASONS.map((reason, idx) => (
                  <label key={idx} className={`cancel-reason-item ${cancelReason === reason ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
                <label className={`cancel-reason-item ${cancelReason === '__custom__' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="cancelReason"
                    value="__custom__"
                    checked={cancelReason === '__custom__'}
                    onChange={() => setCancelReason('__custom__')}
                  />
                  <span>Lý do khác</span>
                </label>
              </div>
              {cancelReason === '__custom__' && (
                <textarea
                  className="cancel-custom-reason"
                  placeholder="Nhập lý do của bạn..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  rows={3}
                />
              )}
            </div>
            <div className="cancel-modal-footer">
              <button className="ta-btn ta-btn--outline" onClick={() => setShowCancel(false)}>Quay lại</button>
              <button
                className="ta-btn ta-btn--danger"
                onClick={handleCancelOrder}
                disabled={cancelling || (!cancelReason || (cancelReason === '__custom__' && !customReason.trim()))}
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
