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

export { resolveThumbnail };

export default function CourseCard({ course }) {
  const thumbnail = resolveThumbnail(course.thumbnail);

  return (
    <Link to={`/course/${course.course_id}`} className="card-link">
      <div className="card">
        <div className="card-wrapper">
          <img
            src={thumbnail}
            alt={course.course_name}
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
