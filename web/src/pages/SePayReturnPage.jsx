import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SePayReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | failed | cancelled
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const paymentStatus = searchParams.get('status');
    const id = searchParams.get('orderId');
    setOrderId(id);

    if (paymentStatus === 'success') {
      setStatus('success');
      setMessage('Thanh toán thành công! Khóa học đã được kích hoạt.');
    } else if (paymentStatus === 'cancel') {
      setStatus('cancelled');
      setMessage('Bạn đã hủy thanh toán.');
    } else {
      setStatus('failed');
      setMessage('Thanh toán không thành công. Vui lòng thử lại.');
    }
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="container text-center" style={{ padding: '80px 20px' }}>
        <LoadingSpinner />
        <p style={{ marginTop: '16px', fontSize: '18px', color: '#666' }}>
          Đang xử lý kết quả thanh toán...
        </p>
      </div>
    );
  }

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
