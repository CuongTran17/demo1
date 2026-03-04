import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vnpayAPI } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function VNPayReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | failed | error
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const res = await vnpayAPI.verifyReturn(params);
        setOrderId(res.data.orderId);
        if (res.data.code === '00') {
          setStatus('success');
          setMessage('Thanh toán thành công! Khóa học đã được kích hoạt.');
        } else {
          setStatus('failed');
          setMessage(res.data.message || 'Thanh toán không thành công');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Lỗi xác minh thanh toán. Vui lòng liên hệ hỗ trợ.');
      }
    };
    verifyPayment();
  }, [searchParams]);

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
        {status === 'success' ? '🎉' : '❌'}
      </div>
      <h1 style={{ fontSize: '32px', marginBottom: '16px', color: status === 'success' ? '#22c55e' : '#ef4444' }}>
        {status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
        {message}
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
