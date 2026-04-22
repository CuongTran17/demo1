import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, lessonsAPI, reviewsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, resolveThumbnail } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import StarRating from '../components/StarRating';

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

  // Reviews state
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', content: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const REVIEWS_PER_PAGE = 5;

  const loadReviews = useCallback(async (page = 1) => {
    try {
      const res = await reviewsAPI.getByCourse(id, page, REVIEWS_PER_PAGE);
      setReviewSummary(res.data.summary);
      setReviews(res.data.reviews || []);
      if (res.data.userReview) {
        setUserReview(res.data.userReview);
        setReviewForm({
          rating: res.data.userReview.rating,
          title: res.data.userReview.title || '',
          content: res.data.userReview.content || '',
        });
      }
    } catch {
      // Reviews are non-critical; silently ignore
    }
  }, [id]);

  const loadCourse = useCallback(async () => {
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
        } catch (err) {
          console.warn('Failed to load purchased course ids:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load course:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    loadReviews(reviewPage);
  }, [loadReviews, reviewPage]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating) {
      setToast({ message: 'Vui lòng chọn số sao', type: 'error' });
      return;
    }
    setReviewSubmitting(true);
    try {
      if (editMode && userReview) {
        await reviewsAPI.update(userReview.review_id, reviewForm);
        setToast({ message: 'Đã cập nhật đánh giá!', type: 'success' });
      } else {
        await reviewsAPI.create(id, reviewForm);
        setToast({ message: 'Đánh giá thành công!', type: 'success' });
      }
      setEditMode(false);
      await loadReviews(1);
      setReviewPage(1);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi gửi đánh giá', type: 'error' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    try {
      await reviewsAPI.remove(userReview.review_id);
      setUserReview(null);
      setReviewForm({ rating: 0, title: '', content: '' });
      setEditMode(false);
      setToast({ message: 'Đã xóa đánh giá', type: 'success' });
      await loadReviews(1);
      setReviewPage(1);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi xóa đánh giá', type: 'error' });
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
              <img src={thumbnail} alt={course.course_name} />
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

      {/* Reviews Section */}
      <section className="section course-reviews-section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 28 }}>
            Đánh giá từ học viên
          </h2>

          {/* Summary */}
          {reviewSummary && Number(reviewSummary.total) > 0 ? (
            <div className="review-summary">
              <div className="review-summary-score">
                <span className="review-big-score">{Number(reviewSummary.average).toFixed(1)}</span>
                <StarRating value={Number(reviewSummary.average)} size={22} />
                <span className="review-total-count">{reviewSummary.total} đánh giá</span>
              </div>
              <div className="review-bar-list">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = Number(reviewSummary[`${['', 'one', 'two', 'three', 'four', 'five'][star]}_star`]);
                  const pct = reviewSummary.total > 0 ? Math.round((count / reviewSummary.total) * 100) : 0;
                  return (
                    <div key={star} className="review-bar-row">
                      <span className="review-bar-label">{star} sao</span>
                      <div className="review-bar-track">
                        <div className="review-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="review-bar-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="review-empty-hint">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
          )}

          {/* Review Form — only for purchased users */}
          {purchased && user && (
            <div className="review-form-shell">
              {userReview && !editMode ? (
                <div className="review-your-review">
                  <div className="review-your-header">
                    <span className="review-your-label">Đánh giá của bạn</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditMode(true)}>Sửa</button>
                      <button className="btn btn-danger btn-sm" onClick={handleDeleteReview}>Xóa</button>
                    </div>
                  </div>
                  <StarRating value={userReview.rating} size={18} />
                  {userReview.title && <p className="review-item-title">{userReview.title}</p>}
                  {userReview.content && <p className="review-item-content">{userReview.content}</p>}
                </div>
              ) : (
                <form className="review-form" onSubmit={handleReviewSubmit}>
                  <h4>{editMode ? 'Sửa đánh giá' : 'Viết đánh giá của bạn'}</h4>
                  <div className="review-form-stars">
                    <StarRating
                      value={reviewForm.rating}
                      size={28}
                      interactive
                      onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                    />
                    {reviewForm.rating > 0 && (
                      <span className="review-star-hint">
                        {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][reviewForm.rating]}
                      </span>
                    )}
                  </div>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Tiêu đề (tùy chọn)"
                    value={reviewForm.title}
                    maxLength={255}
                    onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <textarea
                    className="form-control review-textarea"
                    placeholder="Chia sẻ trải nghiệm học tập của bạn..."
                    value={reviewForm.content}
                    rows={4}
                    onChange={(e) => setReviewForm((f) => ({ ...f, content: e.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-gradient" type="submit" disabled={reviewSubmitting}>
                      {reviewSubmitting ? 'Đang gửi...' : editMode ? 'Lưu thay đổi' : 'Gửi đánh giá'}
                    </button>
                    {editMode && (
                      <button type="button" className="btn btn-outline" onClick={() => setEditMode(false)}>
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Review List */}
          {reviews.length > 0 && (
            <div className="review-list">
              {reviews.map((rv) => (
                <div key={rv.review_id} className="review-item">
                  <div className="review-item-header">
                    <span className="review-item-avatar">{rv.fullname?.[0]?.toUpperCase() || '?'}</span>
                    <div className="review-item-meta">
                      <span className="review-item-name">{rv.fullname}</span>
                      <span className="review-item-date">
                        {new Date(rv.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <StarRating value={rv.rating} size={14} />
                  </div>
                  {rv.title && <p className="review-item-title">{rv.title}</p>}
                  {rv.content && <p className="review-item-content">{rv.content}</p>}
                  {rv.reply_content && (
                    <div className="review-reply-block">
                      <div className="review-reply-label">
                        Phản hồi của {rv.replier_name || 'Giảng viên'}
                      </div>
                      <p className="review-reply-content">{rv.reply_content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {reviewSummary && Number(reviewSummary.total) > REVIEWS_PER_PAGE && (
            <div className="review-pagination">
              <button
                className="btn btn-outline btn-sm"
                disabled={reviewPage === 1}
                onClick={() => setReviewPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <span className="review-page-info">
                Trang {reviewPage} / {Math.ceil(reviewSummary.total / REVIEWS_PER_PAGE)}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={reviewPage >= Math.ceil(reviewSummary.total / REVIEWS_PER_PAGE)}
                onClick={() => setReviewPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
