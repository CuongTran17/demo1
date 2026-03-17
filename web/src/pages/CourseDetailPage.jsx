import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, lessonsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, resolveImageAlt, resolveThumbnail } from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function CourseDetailPage() {
  const { courseId: id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const [courseRes, lessonsRes] = await Promise.all([
        coursesAPI.getById(id),
        lessonsAPI.getByCourse(id).catch(() => ({ data: [] })),
      ]);
      setCourse(courseRes.data.course || courseRes.data);
      setLessons(lessonsRes.data.lessons || lessonsRes.data || []);

      if (user) {
        try {
          const idsRes = await coursesAPI.getPurchasedIds();
          const ids = idsRes.data.courseIds || idsRes.data || [];
          setPurchased(ids.includes(id));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load course:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addToCart(id);
      setToast({ message: 'Đã thêm vào giỏ hàng!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi thêm vào giỏ hàng', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <div className="container text-center" style={{ padding: '60px' }}><h2>Không tìm thấy khóa học</h2></div>;

  const thumbnail = resolveThumbnail(course.thumbnail);
  const thumbnailAlt = resolveImageAlt(course.course_name, course.thumbnail);
  const hasDiscount = Number(course.old_price) > Number(course.price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(course.old_price) - Number(course.price)) / Number(course.old_price)) * 100)
    : 0;
  const learningOutcomes = [
    'Nắm được tư duy nền tảng và quy trình triển khai thực tế.',
    'Thực hành theo từng bài học ngắn, dễ theo dõi tiến độ.',
    'Xây dựng được lộ trình tự học từ cơ bản đến nâng cao.',
    'Áp dụng kiến thức vào bài toán công việc và dự án cá nhân.',
  ];

  return (
    <>
      {/* Hero */}
      <section className="course-detail-hero">
        <div className="container">
          <div className="course-detail-grid">
            <div className="course-info">
              <p className="course-breadcrumb">Khóa học chuyên môn • {course.category || 'Tổng quan'}</p>
              <div className="course-detail-badges">
                <span className="badge badge-info">{course.category}</span>
                {course.level && <span className="badge badge-warning">{course.level}</span>}
                {hasDiscount && <span className="badge course-discount-chip">-{discountPercent}%</span>}
              </div>

              <h1>{course.course_name}</h1>
              <p className="course-provider">Được phát triển bởi PTIT Learning</p>

              <div className="course-detail-meta">
                <div className="meta">
                  {course.duration && <span className="course-meta-chip">⏱ {course.duration}</span>}
                  {course.students_count > 0 && <span className="course-meta-chip">👥 {course.students_count} học viên</span>}
                  <span className="course-meta-chip">📚 {lessons.length} bài học</span>
                </div>
              </div>

              <p className="description">{course.description}</p>

              <div className="course-outcomes-shell">
                <h3>Bạn sẽ học được gì</h3>
                <div className="course-detail-highlights">
                  {learningOutcomes.map((item) => (
                    <div key={item} className="detail-highlight-card">
                      <span className="detail-check">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="course-sidebar">
              <img src={thumbnail} alt={thumbnailAlt} />
              <div className="course-sidebar-body">
                <div className="course-price-big">
                  {formatPrice(course.price)}
                  {hasDiscount && (
                    <span className="old">{formatPrice(course.old_price)}</span>
                  )}
                </div>
                {hasDiscount && (
                  <p className="course-saving-text">Bạn tiết kiệm {formatPrice(Number(course.old_price) - Number(course.price))}</p>
                )}

                {purchased ? (
                  <button
                    className="btn btn-gradient btn-lg"
                    style={{ width: '100%' }}
                    onClick={() => navigate(`/learning/${id}`)}
                  >
                    Bắt đầu học ngay
                  </button>
                ) : (
                  <div className="course-sidebar-actions">
                    <button className="btn btn-gradient btn-lg" style={{ width: '100%' }} onClick={handleAddToCart}>
                      🛒 Thêm vào giỏ hàng
                    </button>
                    <button
                      className="btn btn-outline btn-lg"
                      style={{ width: '100%' }}
                      onClick={() => { handleAddToCart().then(() => navigate('/cart')); }}
                    >
                      Mua ngay
                    </button>
                  </div>
                )}

                <ul className="course-sidebar-note-list">
                  <li>Truy cập trọn đời và học theo nhịp cá nhân</li>
                  <li>Video chất lượng cao, có thể học lại không giới hạn</li>
                  <li>Theo dõi tiến độ chi tiết theo từng bài học</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lessons List */}
      <section className="section course-lessons-section">
        <div className="container">
          <div className="course-lessons-header">
            <h2 className="section-title">Nội dung khóa học</h2>
            <p>{lessons.length} bài học</p>
          </div>

          {lessons.length === 0 ? (
            <p className="course-lessons-empty">
              Chưa có bài học nào cho khóa học này.
            </p>
          ) : (
            <div className="course-outline-shell">
              <div className="course-outline-meta">
                <span>Khóa học gồm {lessons.length} bài học theo lộ trình tuần tự</span>
              </div>
              <div className="course-lesson-list">
              {lessons.map((lesson, idx) => (
                <div key={lesson.lesson_id} className="course-lesson-item">
                  <span className="course-lesson-index">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="course-lesson-content">
                    <div className="course-lesson-title">{lesson.lesson_title}</div>
                    {lesson.duration && (
                      <div className="course-lesson-duration">
                        ⏱ {lesson.duration}
                      </div>
                    )}
                  </div>
                  {purchased ? (
                    <span className="course-lesson-status view">Bắt đầu</span>
                  ) : (
                    <span className="course-lesson-status lock">🔒</span>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
