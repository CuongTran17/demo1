import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { vnpayAPI, ordersAPI } from '../api';
import { formatPrice } from '../components/CourseCard';
import Toast from '../components/Toast';

export default function CheckoutPage() {
  const { cartItems, fetchCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [toast, setToast] = useState(null);

  const total = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setToast({ message: 'Giỏ hàng trống!', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      if (paymentMethod === 'vnpay') {
        const res = await vnpayAPI.createPayment();
        window.location.href = res.data.paymentUrl;
      } else {
        // Bank transfer: create order w/ pending status, admin will verify & approve
        await ordersAPI.instantCheckout();
        await fetchCart();
        navigate('/checkout/success?method=bank_transfer');
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi tạo thanh toán', type: 'error' });
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container text-center" style={{ padding: '80px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
        <h2>Giỏ hàng trống</h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>Thêm khóa học vào giỏ hàng trước khi thanh toán</p>
        <button className="btn btn-primary" onClick={() => navigate('/search')}>
          Khám phá khóa học
        </button>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <h1 className="page-title">Thanh toán</h1>

      <div className="checkout-layout">
        <div className="checkout-left">
          <div className="checkout-section">
            <h2 className="section-title">Phương thức thanh toán</h2>
            <div className="payment-methods">
              <label className={`payment-option ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`} onClick={() => setPaymentMethod('bank_transfer')} style={{ cursor: 'pointer' }}>
                <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} />
                <div className="payment-content">
                  <span className="payment-icon">🏦</span>
                  <div className="payment-info">
                    <strong>Chuyển khoản ngân hàng</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                      Chuyển khoản và chờ Admin xác nhận thanh toán
                    </p>
                  </div>
                </div>
              </label>
              <label className={`payment-option ${paymentMethod === 'vnpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('vnpay')} style={{ cursor: 'pointer', marginTop: '8px' }}>
                <input type="radio" name="payment" value="vnpay" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} />
                <div className="payment-content">
                  <span className="payment-icon">💳</span>
                  <div className="payment-info">
                    <strong>VNPay</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                      Thanh toán qua VNPay (ATM / Visa / MasterCard / QR Code)
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="checkout-section" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔒</span>
              <strong style={{ color: '#166534' }}>
                {paymentMethod === 'vnpay' ? 'Thanh toán an toàn qua VNPay' : 'Chuyển khoản ngân hàng'}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#15803d' }}>
              {paymentMethod === 'vnpay'
                ? 'Bạn sẽ được chuyển tới cổng thanh toán VNPay để hoàn tất giao dịch. Khóa học sẽ được kích hoạt tự động sau khi thanh toán thành công.'
                : 'Đơn hàng sẽ được tạo và chờ Admin xác nhận sau khi bạn chuyển khoản thành công. Khóa học sẽ được kích hoạt khi thanh toán được duyệt.'}
            </p>
          </div>
        </div>

        <div className="checkout-right">
          <div className="checkout-section order-summary">
            <h3 className="section-title">Đơn hàng của bạn</h3>
            <div className="product-list">
              {cartItems.map((item) => (
                <div key={item.course_id} className="product-item">
                  <span className="product-name">{item.course_name}</span>
                  <strong className="product-price">{formatPrice(item.price)}</strong>
                </div>
              ))}
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total-row">
              <span>Tổng cộng:</span>
              <span className="total-amount">{formatPrice(total)}</span>
            </div>
            <button
              className="btn btn-gradient btn-lg"
              style={{ width: '100%' }}
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading
                ? (paymentMethod === 'vnpay' ? 'Đang chuyển tới VNPay...' : 'Đang xử lý...')
                : (paymentMethod === 'vnpay'
                    ? `Thanh toán VNPay - ${formatPrice(total)}`
                    : `Xác nhận thanh toán - ${formatPrice(total)}`)}
            </button>
            <Link to="/cart" className="back-to-cart">← Quay lại giỏ hàng</Link>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
