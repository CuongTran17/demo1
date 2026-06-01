import { Link } from 'react-router-dom';
import { formatPrice, getBundleSavings, resolveThumbnail } from '../utils/courseFormat';

function truncateText(value, maxLength = 96) {
  const text = String(value || '').trim();
  if (!text) return 'Lộ trình học theo combo với mức giá ưu đãi.';
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export default function BundleCard({ bundle, compact = false }) {
  const { originalPrice, bundlePrice, savedAmount } = getBundleSavings(bundle);
  const itemCount = bundle.items?.length || 0;

  return (
    <Link to={`/bundles/${bundle.bundle_id}`} className={`bundle-card ${compact ? 'bundle-card--compact' : ''}`}>
      <div className="bundle-card__media">
        <img
          src={resolveThumbnail(bundle.thumbnail)}
          alt={bundle.bundle_name}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = `https://placehold.co/640x360/e2e8f0/475569?text=${encodeURIComponent(bundle.bundle_name?.slice(0, 24) || 'Combo')}`;
          }}
        />
        {savedAmount > 0 && <span className="bundle-card__badge">Tiết kiệm {formatPrice(savedAmount)}</span>}
      </div>
      <div className="bundle-card__body">
        <div className="bundle-card__meta">{itemCount} khóa học</div>
        <h3>{bundle.bundle_name}</h3>
        <p>{truncateText(bundle.description, compact ? 72 : 110)}</p>
        <div className="bundle-card__price">
          <strong>{formatPrice(bundlePrice)}</strong>
          {originalPrice > bundlePrice && <span>{formatPrice(originalPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}
