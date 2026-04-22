import { useState, useMemo } from 'react';
import { adminAPI, teacherAPI } from '../api';
import StarRating from './StarRating';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN');
}

const STAR_FILTERS = [
  { value: 'all', label: 'Tất cả sao' },
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
  { value: '2', label: '2 sao' },
  { value: '1', label: '1 sao' },
];

const REPLY_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'replied', label: 'Đã phản hồi' },
  { value: 'pending', label: 'Chưa phản hồi' },
];

export default function ReviewManager({ role, courses }) {
  const api = role === 'admin' ? adminAPI : teacherAPI;

  // Course list filters
  const [courseSearch, setCourseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected course & reviews
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState(null);

  // Review list filters
  const [reviewSearch, setReviewSearch] = useState('');
  const [starFilter, setStarFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');

  // Reply state
  const [replyInputs, setReplyInputs] = useState({});
  const [editingReply, setEditingReply] = useState({});
  const [saving, setSaving] = useState({});

  const categories = useMemo(() => {
    const cats = [...new Set(courses.map((c) => String(c.category || '').trim()).filter(Boolean))];
    return cats.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch = !courseSearch.trim() ||
        c.course_name?.toLowerCase().includes(courseSearch.trim().toLowerCase());
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [courses, courseSearch, categoryFilter]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((rv) => {
      const q = reviewSearch.trim().toLowerCase();
      const matchSearch = !q ||
        rv.fullname?.toLowerCase().includes(q) ||
        rv.title?.toLowerCase().includes(q) ||
        rv.content?.toLowerCase().includes(q);
      const matchStar = starFilter === 'all' || String(rv.rating) === starFilter;
      const matchReply = replyFilter === 'all' ||
        (replyFilter === 'replied' ? Boolean(rv.reply_content) : !rv.reply_content);
      return matchSearch && matchStar && matchReply;
    });
  }, [reviews, reviewSearch, starFilter, replyFilter]);

  const loadReviews = async (course) => {
    setSelectedCourse(course);
    setReviews([]);
    setReplyInputs({});
    setEditingReply({});
    setReviewSearch('');
    setStarFilter('all');
    setReplyFilter('all');
    setError(null);
    setLoadingReviews(true);
    try {
      const res = await api.getReviewsByCourse(course.course_id);
      setReviews(res.data || []);
    } catch {
      setError('Không tải được đánh giá');
    } finally {
      setLoadingReviews(false);
    }
  };

  const submitReply = async (reviewId) => {
    const content = (replyInputs[reviewId] || '').trim();
    if (!content) return;
    setSaving((s) => ({ ...s, [reviewId]: true }));
    try {
      await api.replyReview(reviewId, content);
      setReviews((prev) =>
        prev.map((rv) =>
          rv.review_id === reviewId
            ? { ...rv, reply_content: content, reply_created_at: new Date().toISOString() }
            : rv
        )
      );
      setReplyInputs((p) => ({ ...p, [reviewId]: '' }));
      setEditingReply((p) => ({ ...p, [reviewId]: false }));
    } catch {
      // keep input so user can retry
    } finally {
      setSaving((s) => ({ ...s, [reviewId]: false }));
    }
  };

  const pendingCount = reviews.filter((rv) => !rv.reply_content).length;

  return (
    <div>
      {/* ── Course list panel ── */}
      <div className="ta-table-wrap" style={{ marginBottom: 20 }}>
        <div className="ta-table-header">
          <h3 className="ta-table-title">Chọn khóa học</h3>
        </div>

        {/* Filters */}
        <div className="rm-filter-bar">
          <div className="rm-search-wrap">
            <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              className="rm-search-input"
              type="text"
              placeholder="Tìm khóa học..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            {courseSearch && (
              <button className="rm-clear-btn" onClick={() => setCourseSearch('')}>✕</button>
            )}
          </div>
          <select
            className="ta-form-select"
            style={{ minWidth: 160 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {courses.length === 0 ? (
          <div className="ta-empty">Chưa có khóa học nào</div>
        ) : filteredCourses.length === 0 ? (
          <div className="ta-empty">Không tìm thấy khóa học phù hợp</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>Tên khóa học</th>
                  <th>Danh mục</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => {
                  const isActive = selectedCourse?.course_id === c.course_id;
                  return (
                    <tr key={c.course_id} style={{ background: isActive ? '#f0f4ff' : '' }}>
                      <td className="ta-text-bold">{c.course_name}</td>
                      <td>
                        <span className="ta-badge ta-badge--info">{c.category}</span>
                      </td>
                      <td>
                        <button
                          className={`ta-btn ta-btn--sm ${isActive ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                          onClick={() => isActive ? null : loadReviews(c)}
                        >
                          {isActive ? 'Đang xem' : 'Xem đánh giá'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Review panel ── */}
      {selectedCourse && (
        <div className="ta-table-wrap">
          <div className="ta-table-header">
            <h3 className="ta-table-title">
              {selectedCourse.course_name}
              {!loadingReviews && (
                <span className="ta-text-muted" style={{ marginLeft: 8, fontWeight: 400, fontSize: 14 }}>
                  {filteredReviews.length}/{reviews.length} đánh giá
                  {pendingCount > 0 && (
                    <span className="ta-badge ta-badge--warning" style={{ marginLeft: 8 }}>
                      {pendingCount} chưa phản hồi
                    </span>
                  )}
                </span>
              )}
            </h3>
          </div>

          {/* Review filters */}
          {!loadingReviews && !error && reviews.length > 0 && (
            <div className="rm-filter-bar">
              <div className="rm-search-wrap">
                <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <input
                  className="rm-search-input"
                  type="text"
                  placeholder="Tìm theo tên, tiêu đề, nội dung..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                />
                {reviewSearch && (
                  <button className="rm-clear-btn" onClick={() => setReviewSearch('')}>✕</button>
                )}
              </div>
              <select
                className="ta-form-select"
                style={{ minWidth: 130 }}
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
              >
                {STAR_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                className="ta-form-select"
                style={{ minWidth: 150 }}
                value={replyFilter}
                onChange={(e) => setReplyFilter(e.target.value)}
              >
                {REPLY_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          {loadingReviews && <div className="ta-empty">Đang tải...</div>}
          {error && !loadingReviews && <div className="ta-empty" style={{ color: '#ef4444' }}>{error}</div>}
          {!loadingReviews && !error && reviews.length === 0 && (
            <div className="ta-empty">Khóa học này chưa có đánh giá nào</div>
          )}
          {!loadingReviews && !error && reviews.length > 0 && filteredReviews.length === 0 && (
            <div className="ta-empty">Không tìm thấy đánh giá phù hợp</div>
          )}

          {!loadingReviews && filteredReviews.length > 0 && (
            <div style={{ padding: '0 24px 24px' }}>
              {filteredReviews.map((rv) => {
                const isEditing = editingReply[rv.review_id];
                const hasReply = Boolean(rv.reply_content);
                const inputVal = replyInputs[rv.review_id] ?? (isEditing ? (rv.reply_content || '') : '');
                const isSaving = Boolean(saving[rv.review_id]);

                return (
                  <div key={rv.review_id} className={`rm-review-card${!hasReply ? ' rm-review-card--pending' : ''}`}>
                    <div className="rm-review-header">
                      <span className="rm-avatar">{rv.fullname?.[0]?.toUpperCase() || '?'}</span>
                      <div className="rm-meta">
                        <span className="rm-name">{rv.fullname}</span>
                        <span className="rm-date">{formatDate(rv.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StarRating value={rv.rating} size={14} />
                        {!hasReply && (
                          <span className="ta-badge ta-badge--warning" style={{ fontSize: 11 }}>Chưa phản hồi</span>
                        )}
                      </div>
                    </div>

                    {rv.title && <p className="rm-title">{rv.title}</p>}
                    {rv.content && <p className="rm-content">{rv.content}</p>}

                    {hasReply && !isEditing && (
                      <div className="rm-reply-block">
                        <div className="rm-reply-label">
                          Phản hồi của {rv.replier_name || 'Giảng viên'}
                          <span className="rm-reply-date">{formatDate(rv.reply_created_at)}</span>
                        </div>
                        <p className="rm-reply-content">{rv.reply_content}</p>
                        <button
                          className="ta-btn ta-btn--sm ta-btn--outline"
                          style={{ marginTop: 6 }}
                          onClick={() => {
                            setEditingReply((p) => ({ ...p, [rv.review_id]: true }));
                            setReplyInputs((p) => ({ ...p, [rv.review_id]: rv.reply_content || '' }));
                          }}
                        >
                          Sửa phản hồi
                        </button>
                      </div>
                    )}

                    {(!hasReply || isEditing) && (
                      <div className="rm-reply-form">
                        <textarea
                          className="ta-form-input"
                          rows={2}
                          placeholder="Nhập phản hồi..."
                          value={inputVal}
                          style={{ resize: 'vertical', minHeight: 64 }}
                          onChange={(e) =>
                            setReplyInputs((p) => ({ ...p, [rv.review_id]: e.target.value }))
                          }
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button
                            className="ta-btn ta-btn--sm ta-btn--primary"
                            disabled={isSaving || !inputVal?.trim()}
                            onClick={() => submitReply(rv.review_id)}
                          >
                            {isSaving ? 'Đang lưu...' : hasReply ? 'Cập nhật phản hồi' : 'Gửi phản hồi'}
                          </button>
                          {isEditing && (
                            <button
                              className="ta-btn ta-btn--sm ta-btn--outline"
                              onClick={() => setEditingReply((p) => ({ ...p, [rv.review_id]: false }))}
                            >
                              Huỷ
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
