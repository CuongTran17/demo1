import { Link } from 'react-router-dom';
import { formatPrice, resolveThumbnail } from '../utils/courseFormat';

export default function CourseCard({ course, spotlight = false }) {
  const thumbnail = resolveThumbnail(course.thumbnail);
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
