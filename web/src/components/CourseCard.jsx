import { Link } from 'react-router-dom';

export function formatPrice(price) {
  if (!price && price !== 0) return '0₫';
  return Number(price).toLocaleString('vi-VN') + '₫';
}

function resolveThumbnail(thumb) {
  if (!thumb) return 'https://via.placeholder.com/400x225?text=Course';
  if (thumb.startsWith('http')) return thumb;
  if (thumb.startsWith('/uploads/')) return thumb;
  // Extract just the filename if it contains path separators
  const filename = thumb.includes('/') ? thumb.split('/').pop() : thumb;
  return `/uploads/course-images/${encodeURIComponent(filename)}`;
}

function resolveImageAlt(courseName, thumb) {
  if (!thumb) return courseName || 'course image';
  const filename = thumb.includes('/') ? thumb.split('/').pop() : thumb;
  const base = decodeURIComponent(filename)
    .replace(/\.[^.]+$/, '')
    .trim();
  return base || courseName || 'course image';
}

export { resolveThumbnail, resolveImageAlt };

export default function CourseCard({ course, spotlight = false }) {
  const thumbnail = resolveThumbnail(course.thumbnail);
  const thumbnailAlt = resolveImageAlt(course.course_name, course.thumbnail);
  const shortDescription = course.description?.substring(0, 110) || 'Khóa học chất lượng với lộ trình rõ ràng, bám sát nhu cầu thực tế.';
  const hasDiscount = Number(course.old_price) > Number(course.price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(course.old_price) - Number(course.price)) / Number(course.old_price)) * 100)
    : 0;

  return (
    <Link
      to={`/course/${course.course_id}`}
      className={`card-link ${spotlight ? 'search-spotlight-card-link' : ''}`}
    >
      <div className={`card ${spotlight ? 'search-spotlight-card' : ''}`}>
        <div className="card-wrapper">
          <img
            src={thumbnail}
            alt={thumbnailAlt}
            className="card-img"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `https://placehold.co/400x225/e2e8f0/64748b?text=${encodeURIComponent(course.course_name?.slice(0,20) || 'Course')}`;
            }}
          />
          {course.is_new === 1 && <span className="card-badge">Mới</span>}
          {course.discount_percentage > 0 && (
            <span className="card-badge" style={{ background: '#ff6b35' }}>
              -{course.discount_percentage}%
            </span>
          )}
          {spotlight && (
            <div className="search-spotlight-panel">
              <div className="search-spotlight-tags">
                <span>{course.category || 'Khóa học'}</span>
                {course.level && <span>{course.level}</span>}
                {hasDiscount && <span>Giảm {discountPercent}%</span>}
              </div>
              <h4>{course.course_name}</h4>
              <p>{shortDescription}{course.description?.length > 110 ? '...' : ''}</p>
              <div className="search-spotlight-meta">
                {course.duration && <span>⏱ {course.duration}</span>}
                {course.students_count > 0 && <span>👥 {course.students_count} học viên</span>}
              </div>
              <div className="search-spotlight-cta">Xem chi tiết khóa học</div>
            </div>
          )}
        </div>
        <div className="card-body">
          <h3 className="card-title">{course.course_name}</h3>
          <p className="card-text">{course.description?.substring(0, 80)}...</p>
          <div className="card-meta">
            {course.level && <span>📊 {course.level}</span>}
            {course.duration && <span>⏱ {course.duration}</span>}
            {course.students_count > 0 && <span>👥 {course.students_count}</span>}
          </div>
          <div className="card-price">
            {formatPrice(course.price)}
            {course.old_price > 0 && course.old_price > course.price && (
              <span className="old-price">{formatPrice(course.old_price)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
