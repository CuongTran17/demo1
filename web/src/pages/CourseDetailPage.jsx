import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, lessonsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, resolveThumbnail } from '../components/CourseCard';
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

  return (
    <>
      {/* Hero */}
      <section className="course-detail-hero">
        <div className="container">
          <div className="course-detail-grid">
            <div className="course-info">
              <div style={{ marginBottom: '12px' }}>
                <span className="badge badge-info">{course.category}</span>
                {course.level && <span className="badge badge-warning" style={{ marginLeft: '8px' }}>{course.level}</span>}
              </div>
              <h1>{course.course_name}</h1>
              <div className="meta">
                {course.duration && <span>⏱ {course.duration}</span>}
                {course.students_count > 0 && <span>👥 {course.students_count} học viên</span>}
                <span>📚 {lessons.length} bài học</span>
              </div>
              <p className="description">{course.description}</p>
            </div>

            <div className="course-sidebar">
              <img src={thumbnail} alt={course.course_name} />
              <div className="course-sidebar-body">
                <div className="course-price-big">
                  {formatPrice(course.price)}
                  {course.old_price > 0 && course.old_price > course.price && (
                    <span className="old">{formatPrice(course.old_price)}</span>
                  )}
                </div>

                {purchased ? (
                  <button
                    className="btn btn-gradient btn-lg"
                    style={{ width: '100%' }}
                    onClick={() => navigate(`/learning/${id}`)}
                  >
                    ▶ Vào học ngay
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lessons List */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'left' }}>Nội dung khóa học</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>{lessons.length} bài học</p>

          {lessons.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              Chưa có bài học nào cho khóa học này.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.lesson_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px', background: '#f8f9fa',
                    borderRadius: '8px', border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: '#666', fontWeight: 600, minWidth: '30px' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{lesson.lesson_title}</div>
                    {lesson.duration && (
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                        ⏱ {lesson.duration}
                      </div>
                    )}
                  </div>
                  {purchased ? (
                    <span style={{ color: '#667eea', fontSize: '14px' }}>▶ Xem</span>
                  ) : (
                    <span style={{ color: '#999', fontSize: '14px' }}>🔒</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
