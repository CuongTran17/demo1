import { Link, useSearchParams } from 'react-router-dom';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const method = searchParams.get('method');
  const isBankTransfer = method === 'bank_transfer';

  return (
    <div className="container text-center" style={{ padding: '80px 20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '24px' }}>{isBankTransfer ? '📋' : '🎉'}</div>
      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
        {isBankTransfer ? 'Đặt hàng thành công!' : 'Thanh toán thành công!'}
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
        Cảm ơn bạn đã đặt mua khóa học.
      </p>
      {isBankTransfer ? (
        <>
          <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '600', marginBottom: '12px' }}>
            ⏳ Đơn hàng đang chờ xác nhận thanh toán
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Vui lòng chuyển khoản theo thông tin bên dưới. Khóa học sẽ được kích hoạt ngay sau khi Admin xác nhận đã nhận được tiền.
          </p>
        </>
      ) : (
        <p style={{ fontSize: '16px', color: '#22c55e', fontWeight: '600', marginBottom: '32px' }}>
          ✅ Khóa học đã được kích hoạt ngay lập tức. Bắt đầu học thôi!
        </p>
      )}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link to="/account" className="btn btn-primary btn-lg">
          {isBankTransfer ? 'Xem đơn hàng của tôi' : 'Xem khóa học của tôi'}
        </Link>
        <Link to="/" className="btn btn-outline btn-lg">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
