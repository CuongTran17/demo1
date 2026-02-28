import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ordersAPI } from '../api';
import { formatPrice } from '../components/CourseCard';
import Toast from '../components/Toast';

export default function CheckoutPage() {
  const { cartItems, fetchCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const total = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setToast({ message: 'Giỏ hàng trống!', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await ordersAPI.create(paymentMethod, note);
      await fetchCart();
      navigate('/checkout/success');
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi đặt hàng', type: 'error' });
    } finally {
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
              {[
                { key: 'bank_transfer', name: 'Chuyển khoản ngân hàng', icon: '🏦' },
                { key: 'momo', name: 'Ví MoMo', icon: '📱' },
                { key: 'zalopay', name: 'ZaloPay', icon: '💳' },
              ].map((method) => (
                <label
                  key={method.key}
                  className={`payment-option ${paymentMethod === method.key ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.key}
                    checked={paymentMethod === method.key}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-content">
                    <span className="payment-icon">{method.icon}</span>
                    <div className="payment-info">
                      <strong>{method.name}</strong>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="section-title">Ghi chú</h2>
            <textarea
              className="form-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Nhập ghi chú đơn hàng (tùy chọn)..."
              style={{ resize: 'vertical' }}
            />
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
              {loading ? 'Đang xử lý...' : `Đặt hàng - ${formatPrice(total)}`}
            </button>
            <Link to="/cart" className="back-to-cart">← Quay lại giỏ hàng</Link>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
