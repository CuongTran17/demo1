import { Link } from 'react-router-dom';

export default function CheckoutSuccessPage() {
  return (
    <div className="container text-center" style={{ padding: '80px 20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎉</div>
      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Thanh toán thành công!</h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
        Cảm ơn bạn đã đặt mua khóa học.
      </p>
      <p style={{ fontSize: '16px', color: '#22c55e', fontWeight: '600', marginBottom: '32px' }}>
        ✅ Khóa học đã được kích hoạt ngay lập tức. Bắt đầu học thôi!
      </p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link to="/account" className="btn btn-primary btn-lg">
          Xem khóa học của tôi
        </Link>
        <Link to="/" className="btn btn-outline btn-lg">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
