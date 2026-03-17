import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { ordersAPI } from '../api';

export default function CartPage() {
  const { user } = useAuth();
  const { cartItems, cartCount, loading, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  if (!user) {
    navigate('/login');
    return null;
  }

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
      setToast({ message: `Áp mã thành công: -${formatPrice(res.data.discountAmount)}`, type: 'success' });
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

  const handleRemove = async (courseId) => {
    if (!confirm('Bạn có chắc muốn xóa khóa học này?')) return;
    try {
      await removeFromCart(courseId);
      setToast({ message: 'Đã xóa khỏi giỏ hàng', type: 'success' });
    } catch {
      setToast({ message: 'Lỗi khi xóa', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <main className="container cart-page">
      <h1 className="page-title">GIỎ HÀNG</h1>

      <div className="cart-content">
        <div className="cart-table-wrapper">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Giá tiền</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr className="empty-cart">
                  <td colSpan="3" className="empty-message">
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
                      <div style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
                        Giỏ hàng trống
                      </div>
                      <div style={{ fontSize: '14px', color: '#999' }}>
                        Hãy thêm khóa học vào giỏ hàng để bắt đầu học!
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                cartItems.map((item) => (
                  <tr key={item.course_id}>
                    <td>
                      <div className="cart-item-name">
                        <Link to={`/course/${item.course_id}`}>
                          {item.course_name}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <strong>{formatPrice(item.price)}</strong>
                    </td>
                    <td>
                      <button className="btn-remove" onClick={() => handleRemove(item.course_id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="cart-summary">
          <div className="summary-row">
            <span>Tạm tính:</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>

          {/* Mã giảm giá */}
          <div style={{ margin: '16px 0' }}>
            <div className="discount-input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Nhập mã giảm giá"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                disabled={applyingCoupon}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button
                type="button"
                className="btn-apply"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon}
              >
                {applyingCoupon ? 'Đang áp...' : 'Áp dụng'}
              </button>
            </div>
            {appliedCoupon && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#166534', fontWeight: 600, fontSize: '14px' }}>
                  🎉 Mã {appliedCoupon.code}: -{formatPrice(appliedCoupon.discountAmount || 0)}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', padding: '2px 6px' }}
                >
                  Bỏ mã
                </button>
              </div>
            )}
          </div>

          {appliedCoupon && (
            <div className="summary-row discount-row">
              <span>Giảm giá:</span>
              <span className="discount-amount">-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="summary-row" style={{ fontWeight: 700, fontSize: '18px' }}>
            <span>Tổng cộng:</span>
            <strong style={{ color: '#7c3aed' }}>{formatPrice(total)}</strong>
          </div>

          <div className="cart-note">
            <label htmlFor="noteInput">Ghi chú</label>
            <textarea id="noteInput" rows="3" placeholder="Nhập ghi chú của bạn..."></textarea>
          </div>
          <div className="cart-actions">
            <button
              className="btn-checkout"
              disabled={cartItems.length === 0}
              onClick={() => navigate('/checkout', { state: { appliedCoupon } })}
            >
              Thanh toán ({cartCount})
            </button>
          </div>
          <Link to="/" className="continue-shopping">← Tiếp tục mua hàng</Link>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
