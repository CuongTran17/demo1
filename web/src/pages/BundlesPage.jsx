import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bundlesAPI } from '../api';
import { formatPrice } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';

export default function BundlesPage() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bundlesAPI.getAll()
      .then((res) => setBundles(res.data?.bundles || []))
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <main className="container bundles-page">
      <h1 className="page-title">Combo khóa học</h1>
      {bundles.length === 0 ? (
        <div className="ta-empty-state">
          <div className="ta-empty-icon">%</div>
          <h3>Chưa có combo đang mở bán</h3>
          <p>Quay lại sau để xem các lộ trình ưu đãi mới.</p>
        </div>
      ) : (
        <div className="bundle-grid">
          {bundles.map((bundle) => (
            <Link to={`/bundles/${bundle.bundle_id}`} className="bundle-card" key={bundle.bundle_id}>
              {bundle.thumbnail && <img src={bundle.thumbnail} alt={bundle.bundle_name} />}
              <div className="bundle-card__body">
                <h2>{bundle.bundle_name}</h2>
                <p>{bundle.description || `${bundle.items?.length || 0} khóa học trong một combo ưu đãi.`}</p>
                <div className="bundle-card__price">
                  <strong>{formatPrice(bundle.bundle_price)}</strong>
                  {Number(bundle.original_price || 0) > Number(bundle.bundle_price || 0) && (
                    <span>{formatPrice(bundle.original_price)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
