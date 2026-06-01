import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bundlesAPI, reviewsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, getBundleSavings, resolveThumbnail } from '../utils/courseFormat';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';
import Toast from '../components/Toast';

const REVIEWS_PER_PAGE = 5;

export default function BundleDetailPage() {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addBundleToCart } = useCart();
  const [bundle, setBundle] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', content: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const loadReviews = useCallback(async (page = 1) => {
    try {
      const res = await reviewsAPI.getByBundle(bundleId, page, REVIEWS_PER_PAGE);
      setReviewSummary(res.data.summary);
      setReviews(res.data.reviews || []);
      setCanReview(Boolean(res.data.canReview));
      if (res.data.userReview) {
        setUserReview(res.data.userReview);
        setReviewForm({
          rating: res.data.userReview.rating,
          title: res.data.userReview.title || '',
          content: res.data.userReview.content || '',
        });
      } else {
        setUserReview(null);
        setReviewForm({ rating: 0, title: '', content: '' });
      }
    } catch {
      setReviewSummary(null);
      setReviews([]);
      setCanReview(false);
    }
  }, [bundleId]);

  useEffect(() => {
    setLoading(true);
    bundlesAPI.getById(bundleId)
      .then((res) => setBundle(res.data?.bundle || null))
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, [bundleId]);

  useEffect(() => {
    bundlesAPI.getRelated(bundleId, 4)
      .then((res) => setRelatedCourses(res.data?.courses || []))
      .catch(() => setRelatedCourses([]));
  }, [bundleId]);

  useEffect(() => {
    loadReviews(reviewPage);
  }, [loadReviews, reviewPage]);

  const handleAddBundle = async () => {
    setAdding(true);
    try {
      await addBundleToCart(bundleId);
      setToast({ message: 'Đã thêm combo vào giỏ hàng', type: 'success' });
      return true;
    } catch (err) {
      if (err.code === 'LOGIN_REQUIRED') navigate('/login');
      else setToast({ message: err.response?.data?.error || 'Không thể thêm combo', type: 'error' });
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    const added = await handleAddBundle();
    if (added) navigate('/cart');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating) {
      setToast({ message: 'Vui lòng chọn số sao', type: 'error' });
      return;
    }
    setReviewSubmitting(true);
    try {
      if (editMode && userReview) {
        await reviewsAPI.updateBundle(userReview.review_id, reviewForm);
        setToast({ message: 'Đã cập nhật đánh giá combo!', type: 'success' });
      } else {
        await reviewsAPI.createBundle(bundleId, reviewForm);
        setToast({ message: 'Đánh giá combo thành công!', type: 'success' });
      }
      setEditMode(false);
      setReviewPage(1);
      await loadReviews(1);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi gửi đánh giá combo', type: 'error' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    try {
      await reviewsAPI.removeBundle(userReview.review_id);
      setUserReview(null);
      setReviewForm({ rating: 0, title: '', content: '' });
      setEditMode(false);
      setToast({ message: 'Đã xóa đánh giá combo', type: 'success' });
      setReviewPage(1);
      await loadReviews(1);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi xóa đánh giá combo', type: 'error' });
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

  const items = bundle.items || [];
  const {
    originalPrice,
    bundlePrice,
    savedAmount: saved,
    discountPercent,
  } = getBundleSavings(bundle);
  const totalRetailPrice = originalPrice;
  const thumbnail = resolveThumbnail(bundle.thumbnail);

  return (
    <main className="bundle-detail">
      <section className="bundle-detail__hero">
        <div className="container">
          <div className="bundle-detail__grid">
            <div className="bundle-detail__info">
              <p className="course-breadcrumb">Combo khóa học • PTIT Learning</p>
              <div className="course-detail-badges">
                <span className="badge badge-info">{items.length} khóa học</span>
                {discountPercent > 0 && <span className="badge course-discount-chip">-{discountPercent}%</span>}
                <span className="badge badge-warning">Ưu đãi combo</span>
              </div>

              <h1>{bundle.bundle_name}</h1>
              <p className="course-provider">Lộ trình học trọn gói với mức giá tốt hơn mua lẻ</p>
              <p className="description">
                {bundle.description || 'Combo được thiết kế để bạn học theo một lộ trình liền mạch và tiết kiệm chi phí.'}
              </p>

              <div className="course-outcomes-shell">
                <h3>Điểm nổi bật của combo</h3>
                <div className="course-detail-highlights">
                  <div className="detail-highlight-card">
                    <span className="detail-check">✓</span>
                    <span>Học trọn bộ {items.length} khóa học trong cùng một gói.</span>
                  </div>
                  <div className="detail-highlight-card">
                    <span className="detail-check">✓</span>
                    <span>Tiết kiệm {saved > 0 ? formatPrice(saved) : 'chi phí'} so với mua từng khóa học riêng lẻ.</span>
                  </div>
                  <div className="detail-highlight-card">
                    <span className="detail-check">✓</span>
                    <span>Phù hợp khi bạn muốn đi theo một lộ trình học liên tục.</span>
                  </div>
                  <div className="detail-highlight-card">
                    <span className="detail-check">✓</span>
                    <span>Thêm một lần vào giỏ hàng và thanh toán gọn hơn.</span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="course-sidebar bundle-detail__sidebar">
              <img src={thumbnail} alt={bundle.bundle_name} />
              <div className="course-sidebar-body">
                <div className="course-price-big">
                  {formatPrice(bundlePrice)}
                  {originalPrice > bundlePrice && <span className="old">{formatPrice(originalPrice)}</span>}
                </div>
                {saved > 0 && <p className="course-saving-text">Bạn tiết kiệm {formatPrice(saved)}</p>}

                <div className="course-sidebar-actions">
                  <button className="btn btn-gradient btn-lg" style={{ width: '100%' }} onClick={handleAddBundle} disabled={adding}>
                    {adding ? 'Đang thêm...' : 'Thêm combo vào giỏ hàng'}
                  </button>
                  <button className="btn btn-outline btn-lg" style={{ width: '100%' }} onClick={handleBuyNow} disabled={adding}>
                    Mua ngay
                  </button>
                </div>

                <ul className="course-sidebar-note-list">
                  <li>Truy cập các khóa học trong combo sau khi thanh toán thành công</li>
                  <li>Giá combo được tính một lần, không cộng trùng khóa học</li>
                  <li>Có thể xem lại từng khóa học theo nhịp học cá nhân</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section course-lessons-section bundle-detail__courses">
        <div className="container">
          <div className="course-lessons-header">
            <h2 className="section-title">Các khóa học trong combo</h2>
            <p>{items.length} khóa học</p>
          </div>

          {items.length === 0 ? (
            <p className="course-lessons-empty">Combo này chưa có khóa học nào.</p>
          ) : (
            <div className="course-outline-shell">
              <div className="course-outline-meta">
                <span>Combo gồm {items.length} khóa học, tổng giá lẻ {formatPrice(totalRetailPrice)}</span>
              </div>
              <div className="course-lesson-list">
                {items.map((course, idx) => (
                  <Link to={`/course/${course.course_id}`} className="bundle-course-row" key={course.course_id}>
                    <span className="course-lesson-index">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="course-lesson-content">
                      <div className="course-lesson-title">{course.course_name}</div>
                      <div className="course-lesson-duration">{course.category || 'Khóa học'}</div>
                    </div>
                    <span className="bundle-course-price">{formatPrice(course.price)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {relatedCourses.length > 0 && (
        <section className="section course-discovery-section">
          <div className="container">
            <div className="course-discovery-header">
              <h2 className="section-title">Khóa học liên quan</h2>
            </div>
            <div className="course-discovery-grid">
              {relatedCourses.map((course) => <CourseCard key={course.course_id} course={course} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section course-reviews-section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 28 }}>
            Đánh giá combo
          </h2>

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
            <p className="review-empty-hint">Chưa có đánh giá combo nào. Hãy là người đầu tiên!</p>
          )}

          {user && !canReview && !userReview && (
            <p className="review-empty-hint">Bạn cần mua combo này trước khi gửi đánh giá.</p>
          )}

          {canReview && user && (
            <div className="review-form-shell">
              {userReview && !editMode ? (
                <div className="review-your-review">
                  <div className="review-your-header">
                    <span className="review-your-label">Đánh giá combo của bạn</span>
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
                  <h4>{editMode ? 'Sửa đánh giá combo' : 'Viết đánh giá combo của bạn'}</h4>
                  <div className="review-form-stars">
                    <StarRating
                      value={reviewForm.rating}
                      size={28}
                      interactive
                      onChange={(v) => setReviewForm((form) => ({ ...form, rating: v }))}
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
                    onChange={(e) => setReviewForm((form) => ({ ...form, title: e.target.value }))}
                  />
                  <textarea
                    className="form-control review-textarea"
                    placeholder="Chia sẻ cảm nhận của bạn về combo này..."
                    value={reviewForm.content}
                    rows={4}
                    onChange={(e) => setReviewForm((form) => ({ ...form, content: e.target.value }))}
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

          {reviews.length > 0 && (
            <div className="review-list">
              {reviews.map((review) => (
                <div key={review.review_id} className="review-item">
                  <div className="review-item-header">
                    <span className="review-item-avatar">{review.fullname?.[0]?.toUpperCase() || '?'}</span>
                    <div className="review-item-meta">
                      <span className="review-item-name">{review.fullname}</span>
                      <span className="review-item-date">
                        {new Date(review.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <StarRating value={review.rating} size={14} />
                  </div>
                  {review.title && <p className="review-item-title">{review.title}</p>}
                  {review.content && <p className="review-item-content">{review.content}</p>}
                </div>
              ))}
            </div>
          )}

          {reviewSummary && Number(reviewSummary.total) > REVIEWS_PER_PAGE && (
            <div className="review-pagination">
              <button
                className="btn btn-outline btn-sm"
                disabled={reviewPage === 1}
                onClick={() => setReviewPage((page) => page - 1)}
              >
                Trước
              </button>
              <span className="review-page-info">
                Trang {reviewPage} / {Math.ceil(reviewSummary.total / REVIEWS_PER_PAGE)}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={reviewPage >= Math.ceil(reviewSummary.total / REVIEWS_PER_PAGE)}
                onClick={() => setReviewPage((page) => page + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
