import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function CartPage() {
  const { user } = useAuth();
  const { cartItems, cartCount, loading, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const total = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

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
            <span>Tổng cộng:</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <div className="cart-note">
            <label htmlFor="noteInput">Ghi chú</label>
            <textarea id="noteInput" rows="3" placeholder="Nhập ghi chú của bạn..."></textarea>
          </div>
          <div className="cart-actions">
            <button className="btn-checkout" disabled={cartItems.length === 0} onClick={() => navigate('/checkout')}>
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
