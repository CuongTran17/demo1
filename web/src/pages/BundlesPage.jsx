import { useEffect, useState } from 'react';
import { bundlesAPI } from '../api';
import BundleCard from '../components/BundleCard';
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
            <BundleCard key={bundle.bundle_id} bundle={bundle} />
          ))}
        </div>
      )}
    </main>
  );
}
