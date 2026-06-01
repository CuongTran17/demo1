import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice, getBundleSavings } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { cartAPI, ordersAPI } from '../api';

function getCouponSummary(coupon) {
  if (!coupon) return '';
  const value = Number(coupon.discountValue || 0);
  const max = Number(coupon.maxDiscountAmount || 0);
  if (coupon.discountType === 'percentage') {
    return max > 0 ? `Giảm ${value}% tối đa ${formatPrice(max)}` : `Giảm ${value}%`;
  }
  return `Giảm ${formatPrice(value)}`;
}

export default function CartPage() {
  const { cartItems, cartBundles, cartCount, loading, removeFromCart, removeBundleFromCart, addUpsellToCart } = useCart();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [upsellSuggestions, setUpsellSuggestions] = useState({ bundles: [], courses: [] });
  const [addingUpsell, setAddingUpsell] = useState(null);

  const hasItems = cartItems.length > 0 || (cartBundles || []).length > 0;
  const subtotal = Math.round(
    cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0) +
    (cartBundles || []).reduce((sum, bundle) => sum + Number(bundle.bundle_price || 0), 0)
  );
  const discountAmount = Number(appliedCoupon?.discountAmount || 0);
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (!hasItems) {
      setUpsellSuggestions({ bundles: [], courses: [] });
      return;
    }

    let alive = true;
    cartAPI.getUpsellSuggestions()
      .then((res) => {
        if (alive) {
          setUpsellSuggestions({
            bundles: res.data?.bundles || [],
            courses: res.data?.courses || [],
          });
        }
      })
      .catch(() => {
        if (alive) setUpsellSuggestions({ bundles: [], courses: [] });
      });

    return () => { alive = false; };
  }, [hasItems, cartItems, cartBundles]);

  useEffect(() => {
    if (!hasItems) {
      setAvailableCoupons([]);
      return;
    }

    let alive = true;
    setLoadingCoupons(true);
    ordersAPI.getAvailableDiscountCodes()
      .then((res) => {
        if (alive) setAvailableCoupons(res.data?.codes || []);
      })
      .catch(() => {
        if (alive) setAvailableCoupons([]);
      })
      .finally(() => {
        if (alive) setLoadingCoupons(false);
      });

    return () => { alive = false; };
  }, [hasItems, cartItems, cartBundles]);

  const handleAddUpsell = async (itemType, itemId) => {
    const key = `${itemType}-${itemId}`;
    setAddingUpsell(key);
    try {
      await addUpsellToCart(itemType, itemId);
      const res = await cartAPI.getUpsellSuggestions();
      setUpsellSuggestions({
        bundles: res.data?.bundles || [],
        courses: res.data?.courses || [],
      });
      setToast({ message: 'Đã thêm ưu đãi mua kèm vào giỏ hàng', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Không thể thêm ưu đãi mua kèm', type: 'error' });
    } finally {
      setAddingUpsell(null);
    }
  };

  const handleApplyCoupon = async (codeOverride = '') => {
    const code = (typeof codeOverride === 'string' && codeOverride ? codeOverride : couponCodeInput).trim();
    if (!code) {
      setToast({ message: 'Vui lòng nhập mã giảm giá', type: 'error' });
      return;
    }
    setCouponCodeInput(code.toUpperCase());
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

  const handleRemoveConfirm = async (courseId) => {
    setRemovingId(courseId);
    try {
      await removeFromCart(courseId);
      setToast({ message: 'Đã xóa khỏi giỏ hàng', type: 'success' });
    } catch {
      setToast({ message: 'Lỗi khi xóa', type: 'error' });
    } finally {
      setRemovingId(null);
      setConfirmingRemove(null);
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
              {!hasItems ? (
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
                <>
                  {(cartBundles || []).map((bundle) => (
                    <tr key={`bundle-${bundle.bundle_id}`}>
                      <td>
                        <div className="cart-item-name">
                          <Link to={`/bundles/${bundle.bundle_id}`}>{bundle.bundle_name}</Link>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            Combo {bundle.items?.length || 0} khóa học
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{formatPrice(getBundleSavings(bundle).bundlePrice)}</strong>
                        {bundle.upsell_discount_percent > 0 && (
                          <div style={{ fontSize: 13, color: '#7c3aed', marginTop: 4 }}>
                            Mua kèm giảm thêm {bundle.upsell_discount_percent}%
                          </div>
                        )}
                        {getBundleSavings(bundle).savedAmount > 0 && (
                          <div style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>
                            Tiết kiệm {formatPrice(getBundleSavings(bundle).savedAmount)}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-remove"
                          onClick={() => removeBundleFromCart(bundle.bundle_id)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cartItems.map((item) => (
                    <tr key={item.course_id}>
                      <td>
                        <div className="cart-item-name">
                          <Link to={`/course/${item.course_id}`}>{item.course_name}</Link>
                        </div>
                      </td>
                      <td>
                        <strong>{formatPrice(item.price)}</strong>
                        {item.upsell_discount_percent > 0 && (
                          <div style={{ fontSize: 13, color: '#7c3aed', marginTop: 4 }}>
                            Mua kèm giảm thêm {item.upsell_discount_percent}%
                          </div>
                        )}
                      </td>
                      <td>
                        {confirmingRemove === item.course_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>Xóa khóa học này?</span>
                            <button
                              className="btn-remove"
                              style={{ background: '#ef4444', color: '#fff', minWidth: 52 }}
                              onClick={() => handleRemoveConfirm(item.course_id)}
                              disabled={removingId === item.course_id}
                            >
                              {removingId === item.course_id ? '...' : 'Xóa'}
                            </button>
                            <button
                              className="btn-remove"
                              style={{ background: '#e2e8f0', color: '#334155' }}
                              onClick={() => setConfirmingRemove(null)}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-remove"
                            onClick={() => setConfirmingRemove(item.course_id)}
                          >
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
          {hasItems && (upsellSuggestions.bundles.length > 0 || upsellSuggestions.courses.length > 0) && (
            <section className="cart-upsell">
              <div className="cart-upsell__head">
                <h2>Mua kèm giảm thêm</h2>
                <p>Gợi ý phù hợp với sản phẩm đang có trong giỏ hàng của bạn.</p>
              </div>

              {upsellSuggestions.bundles.length > 0 && (
                <div className="cart-upsell__group">
                  <h3>Combo ưu đãi khác</h3>
                  <div className="cart-upsell__grid">
                    {upsellSuggestions.bundles.map((bundle) => (
                      <article className="cart-upsell-card" key={`bundle-${bundle.bundle_id}`}>
                        <div>
                          <span className="cart-upsell-card__badge">Giảm thêm {bundle.upsell_discount_percent}%</span>
                          <h4>{bundle.bundle_name}</h4>
                          <p>{bundle.items?.length || 0} khóa học trong combo</p>
                          <div className="cart-upsell-card__price">
                            <strong>{formatPrice(bundle.upsell_price)}</strong>
                            <span>{formatPrice(bundle.bundle_price)}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-gradient btn-sm"
                          onClick={() => handleAddUpsell('bundle', bundle.bundle_id)}
                          disabled={addingUpsell === `bundle-${bundle.bundle_id}`}
                        >
                          {addingUpsell === `bundle-${bundle.bundle_id}` ? 'Đang thêm...' : 'Thêm ưu đãi'}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {upsellSuggestions.courses.length > 0 && (
                <div className="cart-upsell__group">
                  <h3>Khóa học cùng môn</h3>
                  <div className="cart-upsell__grid">
                    {upsellSuggestions.courses.map((course) => (
                      <article className="cart-upsell-card" key={`course-${course.course_id}`}>
                        <div>
                          <span className="cart-upsell-card__badge">Giảm thêm {course.upsell_discount_percent}%</span>
                          <h4>{course.course_name}</h4>
                          <p>{course.category || 'Khóa học liên quan'}</p>
                          <div className="cart-upsell-card__price">
                            <strong>{formatPrice(course.upsell_price)}</strong>
                            <span>{formatPrice(course.price)}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-gradient btn-sm"
                          onClick={() => handleAddUpsell('course', course.course_id)}
                          disabled={addingUpsell === `course-${course.course_id}`}
                        >
                          {addingUpsell === `course-${course.course_id}` ? 'Đang thêm...' : 'Thêm ưu đãi'}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="cart-summary">
          <div className="summary-row">
            <span>Tạm tính:</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>

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
                onClick={() => handleApplyCoupon()}
                disabled={applyingCoupon}
              >
                {applyingCoupon ? 'Đang áp...' : 'Áp dụng'}
              </button>
            </div>
            {appliedCoupon && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#166534', fontWeight: 600, fontSize: '14px' }}>
                  Mã {appliedCoupon.code}: -{formatPrice(appliedCoupon.discountAmount || 0)}
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
            {(loadingCoupons || availableCoupons.length > 0) && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
                  Mã có thể dùng
                </div>
                {loadingCoupons ? (
                  <div style={{ fontSize: 13, color: '#64748b' }}>Đang tìm mã phù hợp...</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {availableCoupons.map((coupon) => (
                      <button
                        type="button"
                        key={coupon.code}
                        onClick={() => handleApplyCoupon(coupon.code)}
                        disabled={applyingCoupon || appliedCoupon?.code === coupon.code}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: '1px solid #ddd6fe',
                          background: appliedCoupon?.code === coupon.code ? '#f0fdf4' : '#faf5ff',
                          color: '#3b0764',
                          borderRadius: 10,
                          padding: '10px 12px',
                          cursor: applyingCoupon || appliedCoupon?.code === coupon.code ? 'default' : 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <strong>{coupon.code}</strong>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>-{formatPrice(coupon.discountAmount || 0)}</span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#6b21a8' }}>
                          {getCouponSummary(coupon)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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

          <div className="cart-actions">
            <button
              className="btn-checkout"
              disabled={!hasItems}
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
