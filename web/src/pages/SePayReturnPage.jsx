import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { shouldTrackOnce, trackEvent } from '../utils/analytics';

export default function SePayReturnPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentStatus = searchParams.get('status');
  const { status, message } = useMemo(() => {
    if (paymentStatus === 'success') {
      return {
        status: 'success',
        message: 'Thanh toán thành công! Khóa học đã được kích hoạt.',
      };
    }

    if (paymentStatus === 'cancel') {
      return {
        status: 'cancelled',
        message: 'Bạn đã hủy thanh toán.',
      };
    }

    return {
      status: 'failed',
      message: 'Thanh toán không thành công. Vui lòng thử lại.',
    };
  }, [paymentStatus]);

  useEffect(() => {
    if (!orderId || !paymentStatus) return;
    const eventType = paymentStatus === 'success'
      ? 'payment_completed'
      : paymentStatus === 'cancel'
      ? 'payment_cancelled'
      : 'payment_failed';
    if (!shouldTrackOnce(`${eventType}:${orderId}`, 60 * 60 * 1000)) return;
    trackEvent(eventType, {
      orderId,
      metadata: { source: 'sepay_return', status: paymentStatus },
    });
  }, [orderId, paymentStatus]);

  const isSuccess = status === 'success';
  const isCancelled = status === 'cancelled';

  return (
    <div className="container text-center" style={{ padding: '80px 20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '24px' }}>
        {isSuccess ? '🎉' : isCancelled ? '↩️' : '❌'}
      </div>
      <h1
        style={{
          fontSize: '32px',
          marginBottom: '16px',
          color: isSuccess ? '#22c55e' : isCancelled ? '#f59e0b' : '#ef4444',
        }}
      >
        {isSuccess ? 'Thanh toán thành công!' : isCancelled ? 'Đã hủy thanh toán' : 'Thanh toán thất bại'}
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>{message}</p>
      {orderId && (
        <p style={{ fontSize: '16px', color: '#999', marginBottom: '32px' }}>
          Mã đơn hàng: <strong>#{orderId}</strong>
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {isSuccess ? (
          <>
            <Link to="/account" className="btn btn-primary btn-lg">
              Xem khóa học của tôi
            </Link>
            <Link to="/" className="btn btn-outline btn-lg">
              Về trang chủ
            </Link>
          </>
        ) : (
          <>
            <Link to="/cart" className="btn btn-primary btn-lg">
              Quay lại giỏ hàng
            </Link>
            <Link to="/" className="btn btn-outline btn-lg">
              Về trang chủ
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
