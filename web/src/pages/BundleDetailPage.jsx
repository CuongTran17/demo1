import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bundlesAPI } from '../api';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function BundleDetailPage() {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { addBundleToCart } = useCart();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    bundlesAPI.getById(bundleId)
      .then((res) => setBundle(res.data?.bundle || null))
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, [bundleId]);

  const handleAddBundle = async () => {
    setAdding(true);
    try {
      await addBundleToCart(bundleId);
      setToast({ message: 'Đã thêm combo vào giỏ hàng', type: 'success' });
    } catch (err) {
      if (err.code === 'LOGIN_REQUIRED') navigate('/login');
      else setToast({ message: err.response?.data?.error || 'Không thể thêm combo', type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!bundle) {
    return (
      <main className="container" style={{ padding: '80px 0' }}>
        <h1>Không tìm thấy combo</h1>
        <Link to="/bundles" className="btn btn-primary">Xem combo khác</Link>
      </main>
    );
  }

  const saved = Math.max(0, Number(bundle.original_price || 0) - Number(bundle.bundle_price || 0));

  return (
    <main className="bundle-detail">
      <section className="bundle-detail__hero">
        <div className="container bundle-detail__hero-inner">
          <div>
            <h1>{bundle.bundle_name}</h1>
            <p>{bundle.description}</p>
            <div className="bundle-detail__price">
              <strong>{formatPrice(bundle.bundle_price)}</strong>
              {saved > 0 && <span>Tiết kiệm {formatPrice(saved)}</span>}
            </div>
            <button className="btn btn-primary btn-lg" onClick={handleAddBundle} disabled={adding}>
              {adding ? 'Đang thêm...' : 'Thêm combo vào giỏ'}
            </button>
          </div>
          {bundle.thumbnail && <img src={bundle.thumbnail} alt={bundle.bundle_name} />}
        </div>
      </section>

      <section className="container bundle-detail__courses">
        <h2>Các khóa học trong combo</h2>
        <div className="ta-table-wrap">
          <table className="ta-table">
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Danh mục</th>
                <th>Giá lẻ</th>
              </tr>
            </thead>
            <tbody>
              {(bundle.items || []).map((course) => (
                <tr key={course.course_id}>
                  <td><Link to={`/course/${course.course_id}`}><strong>{course.course_name}</strong></Link></td>
                  <td>{course.category}</td>
                  <td>{formatPrice(course.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
