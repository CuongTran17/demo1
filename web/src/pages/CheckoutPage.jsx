import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { sepayAPI, ordersAPI, authAPI } from '../api';
import { formatPrice } from '../utils/courseFormat';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CheckoutPage() {
  const { user, loading: authLoading, loginWithToken } = useAuth();
  const { cartItems, loading: cartLoading, mergeGuestCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);
  const [sepayData, setSepayData] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState(location.state?.appliedCoupon?.code || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null);
  const [accountForm, setAccountForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [accountErrors, setAccountErrors] = useState({});

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

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
    setAccountErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateAccountForm = () => {
    const nextErrors = {};
    const email = accountForm.email.trim();
    const phone = accountForm.phone.trim();
    const password = accountForm.password;

    if (!accountForm.fullname.trim()) nextErrors.fullname = 'Vui long nhap ho ten';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Email khong hop le';
    if (!/^[0-9]{10}$/.test(phone)) nextErrors.phone = 'So dien thoai phai co dung 10 chu so';
    if (password.length < 8) nextErrors.password = 'Mat khau phai co it nhat 8 ky tu';
    else if (!/[A-Z]/.test(password)) nextErrors.password = 'Mat khau phai co it nhat 1 chu hoa';
    else if (!/[a-z]/.test(password)) nextErrors.password = 'Mat khau phai co it nhat 1 chu thuong';
    else if (!/[0-9]/.test(password)) nextErrors.password = 'Mat khau phai co it nhat 1 chu so';
    if (accountForm.confirmPassword !== password) nextErrors.confirmPassword = 'Mat khau xac nhan khong khop';

    setAccountErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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

  const handleCheckout = async () => {
    if (user) {
      await handleSePayCheckout();
      return;
    }

    if (!validateAccountForm()) {
      setToast({ message: 'Vui long kiem tra thong tin tai khoan', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.guestCheckoutRegister({
        fullname: accountForm.fullname.trim(),
        email: accountForm.email.trim(),
        phone: accountForm.phone.trim(),
        password: accountForm.password,
      });

      loginWithToken(res.data.token, res.data.user);
      await mergeGuestCart();
      await handleSePayCheckout();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || err.response?.data?.hint || 'Khong the tao tai khoan',
        type: 'error',
      });
      setLoading(false);
    }
  };

  if (authLoading || cartLoading) return <LoadingSpinner />;

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
          {!user && (
            <div className="checkout-section">
              <h2 className="section-title">Thong tin tai khoan</h2>
              <div className="checkout-account-grid">
                <label className="checkout-field">
                  <span>Ho ten</span>
                  <input
                    type="text"
                    className="form-control"
                    name="fullname"
                    value={accountForm.fullname}
                    onChange={handleAccountChange}
                    disabled={loading}
                  />
                  {accountErrors.fullname && <small className="form-error">{accountErrors.fullname}</small>}
                </label>
                <label className="checkout-field">
                  <span>Email</span>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={accountForm.email}
                    onChange={handleAccountChange}
                    disabled={loading}
                  />
                  {accountErrors.email && <small className="form-error">{accountErrors.email}</small>}
                </label>
                <label className="checkout-field">
                  <span>So dien thoai</span>
                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    value={accountForm.phone}
                    onChange={handleAccountChange}
                    disabled={loading}
                  />
                  {accountErrors.phone && <small className="form-error">{accountErrors.phone}</small>}
                </label>
                <label className="checkout-field">
                  <span>Mat khau</span>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={accountForm.password}
                    onChange={handleAccountChange}
                    disabled={loading}
                  />
                  {accountErrors.password && <small className="form-error">{accountErrors.password}</small>}
                </label>
                <label className="checkout-field checkout-field-full">
                  <span>Xac nhan mat khau</span>
                  <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    value={accountForm.confirmPassword}
                    onChange={handleAccountChange}
                    disabled={loading}
                  />
                  {accountErrors.confirmPassword && <small className="form-error">{accountErrors.confirmPassword}</small>}
                </label>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#64748b' }}>
                Tai khoan se duoc tao de luu khoa hoc cua ban. Email xac thuc se duoc gui rieng va khong chan thanh toan.
              </p>
            </div>
          )}

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
                disabled={loading || applyingCoupon || !user}
                onKeyDown={(e) => user && e.key === 'Enter' && handleApplyCoupon()}
              />
              <button
                type="button"
                className="btn-apply"
                onClick={handleApplyCoupon}
                disabled={loading || applyingCoupon || !user}
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
              onClick={handleCheckout}
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
