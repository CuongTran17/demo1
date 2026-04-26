import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { sepayAPI, ordersAPI } from '../api';
import { formatPrice } from '../utils/courseFormat';
import Toast from '../components/Toast';

export default function CheckoutPage() {
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);
  const [sepayData, setSepayData] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState(location.state?.appliedCoupon?.code || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null);

  const subtotal = Math.round(cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0));
  const discountAmount = Number(appliedCoupon?.discountAmount || 0);
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = async () => {
    const code = couponCodeInput.trim();
    if (!code) {
      setToast({ message: 'Vui lòng nhập mã giảm giá', type: 'error' });
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await ordersAPI.validateDiscountCode(code);
      setAppliedCoupon(res.data);
      setCouponCodeInput(res.data.code || code.toUpperCase());
      setToast({ message: res.data.message || 'Áp mã thành công', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Không thể áp mã giảm giá', type: 'error' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

  const handleSePayCheckout = async () => {
    if (cartItems.length === 0) {
      setToast({ message: 'Giỏ hàng trống!', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await sepayAPI.createPayment(appliedCoupon?.code || null);
      const { checkoutURL, checkoutFormFields, freeOrder, orderId } = res.data;

      if (freeOrder) {
        navigate(`/checkout/sepay-return?status=success&orderId=${orderId}`);
        return;
      }

      setSepayData({ checkoutURL, checkoutFormFields });
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 100);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi tạo thanh toán', type: 'error' });
      if (err.response?.status === 400) {
        setAppliedCoupon(null);
      }
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

      {/* Hidden SePay form — auto-submitted after createPayment succeeds */}
      {sepayData && (
        <form ref={formRef} action={sepayData.checkoutURL} method="POST" style={{ display: 'none' }}>
          {Object.keys(sepayData.checkoutFormFields).map((field) => (
            <input
              key={field}
              type="hidden"
              name={field}
              value={sepayData.checkoutFormFields[field]}
            />
          ))}
        </form>
      )}

      <div className="checkout-layout">
        <div className="checkout-left">
          <div className="checkout-section">
            <h2 className="section-title">Phương thức thanh toán</h2>
            <div className="payment-methods">
              <label className="payment-option selected">
                <input type="radio" name="payment" value="sepay" checked readOnly />
                <div className="payment-content">
                  <span className="payment-icon">💳</span>
                  <div className="payment-info">
                    <strong>SePay</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                      Thanh toán qua SePay (Chuyển khoản ngân hàng / QR Code)
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="section-title">Mã giảm giá</h2>
            <div className="discount-input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Nhập mã giảm giá"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                disabled={loading || applyingCoupon}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button
                type="button"
                className="btn-apply"
                onClick={handleApplyCoupon}
                disabled={loading || applyingCoupon}
              >
                {applyingCoupon ? 'Đang áp...' : 'Áp dụng'}
              </button>
            </div>

            {appliedCoupon && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>
                  🎉 Đã áp mã {appliedCoupon.code}: -{formatPrice(appliedCoupon.discountAmount || 0)}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveCoupon}>
                  Bỏ mã
                </button>
              </div>
            )}
          </div>

          <div className="checkout-section" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔒</span>
              <strong style={{ color: '#166534' }}>Thanh toán an toàn qua SePay</strong>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#15803d' }}>
              Bạn sẽ được chuyển tới cổng thanh toán SePay để hoàn tất giao dịch.
              Khóa học sẽ được kích hoạt tự động sau khi thanh toán thành công.
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
            <div className="summary-row">
              <span>Tạm tính:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="summary-row discount-row">
                <span>Giảm giá ({appliedCoupon.code}):</span>
                <span className="discount-amount">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="summary-row total-row">
              <span>Tổng cộng:</span>
              <span className="total-amount">{formatPrice(total)}</span>
            </div>
            <button
              className="btn btn-gradient btn-lg"
              style={{ width: '100%' }}
              onClick={handleSePayCheckout}
              disabled={loading}
            >
              {loading ? 'Đang chuyển tới SePay...' : `Thanh toán SePay - ${formatPrice(total)}`}
            </button>
            <Link to="/cart" className="back-to-cart">← Quay lại giỏ hàng</Link>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
