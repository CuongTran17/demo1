import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="container">
      <h1 className="page-title">Thanh toán</h1>

      <div className="checkout-grid">
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Phương thức thanh toán</h2>
          <div className="payment-methods">
            {[
              { key: 'bank_transfer', name: 'Chuyển khoản ngân hàng', icon: '🏦' },
              { key: 'momo', name: 'Ví MoMo', icon: '📱' },
              { key: 'zalopay', name: 'ZaloPay', icon: '💳' },
            ].map((method) => (
              <label
                key={method.key}
                className={`payment-method ${paymentMethod === method.key ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.key}
                  checked={paymentMethod === method.key}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span style={{ fontSize: '24px' }}>{method.icon}</span>
                <span style={{ fontWeight: 500 }}>{method.name}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Ghi chú</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Nhập ghi chú đơn hàng (tùy chọn)..."
              style={{
                width: '100%', padding: '12px', border: '1px solid var(--border)',
                borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div className="order-summary">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Đơn hàng của bạn</h3>
          {cartItems.map((item) => (
            <div key={item.course_id} className="order-item">
              <span>{item.course_name}</span>
              <strong>{formatPrice(item.price)}</strong>
            </div>
          ))}
          <div className="order-total">
            <span>Tổng cộng:</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button
            className="btn btn-gradient btn-lg"
            style={{ width: '100%', marginTop: '24px' }}
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : `Đặt hàng - ${formatPrice(total)}`}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
