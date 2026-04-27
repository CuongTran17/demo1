import { useMemo, useState } from 'react';

const CHANGE_TYPE_LABELS = {
  create_course: 'Tạo khóa học',
  update_course: 'Cập nhật khóa học',
  delete_course: 'Xóa khóa học',
  create_lesson: 'Tạo bài học',
  update_lesson: 'Cập nhật bài học',
  delete_lesson: 'Xóa bài học',
  create_quiz: 'Tạo bài kiểm tra',
  delete_quiz: 'Xóa bài kiểm tra',
};

const COURSE_FIELD_LABELS = {
  course_name: 'Tên khóa học',
  category: 'Danh mục',
  level: 'Cấp độ',
  price: 'Giá',
  old_price: 'Giá gốc',
  description: 'Mô tả',
  thumbnail: 'Ảnh bìa',
  duration: 'Thời lượng (phút)',
  discount_percentage: 'Giảm giá (%)',
  is_new: 'Đánh dấu Mới',
};

const LESSON_FIELD_LABELS = {
  lesson_title: 'Tên bài học',
  lesson_order: 'Thứ tự',
  video_url: 'Video URL',
  lesson_content: 'Nội dung',
  duration: 'Thời lượng (phút)',
};

const SKIP_FIELDS = new Set(['course_id', 'lesson_id', 'created_at', 'updated_at', 'last_modified_by', 'has_pending_changes', 'teacher_id', 'instructor_id']);

function parseVideoUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: 'file' };
  return { type: 'link' };
}

const VIDEO_TYPE_LABELS = { youtube: '▶ YouTube', vimeo: '▶ Vimeo', file: '▶ Video file' };

function VideoEmbed({ url }) {
  if (!url) return <span className="ta-empty-inline">Không có</span>;
  const parsed = parseVideoUrl(url);
  const urlLink = (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="ta-link-muted">
      {url}
    </a>
  );

  if (parsed?.type === 'youtube') {
    return (
      <div>
        <iframe
          width="100%" height="200"
          src={`https://www.youtube.com/embed/${parsed.id}`}
          title="YouTube video" frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="ta-preview-media"
        />
        {urlLink}
      </div>
    );
  }
  if (parsed?.type === 'vimeo') {
    return (
      <div>
        <iframe
          width="100%" height="200"
          src={`https://player.vimeo.com/video/${parsed.id}`}
          title="Vimeo video" frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="ta-preview-media"
        />
        {urlLink}
      </div>
    );
  }
  if (parsed?.type === 'file') {
    return (
      <div>
        <video controls className="ta-preview-video">
          <source src={url} />
        </video>
        {urlLink}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="ta-link-primary">
      {url}
    </a>
  );
}

function fmtCourseValue(key, val) {
  if (val == null || val === '') return <span className="ta-empty-inline">Không có</span>;
  if (key === 'price' || key === 'old_price') return `${Number(val).toLocaleString('vi-VN')} ₫`;
  if (key === 'is_new') return val ? 'Có' : 'Không';
  if (key === 'thumbnail') {
    return (
      <img
        src={val}
        alt=""
        className="ta-preview-image"
      />
    );
  }
  return String(val);
}

function fmtLessonValue(key, val) {
  if (val == null || val === '') return <span className="ta-empty-inline">Không có</span>;
  if (key === 'video_url') {
    const parsed = parseVideoUrl(val);
    const typeLabel = VIDEO_TYPE_LABELS[parsed?.type];
    if (typeLabel) {
      return (
        <div>
          <span className="ta-badge ta-badge--info">
            {typeLabel}
          </span>
          <a href={val} target="_blank" rel="noopener noreferrer"
             className="ta-link-primary ta-link-primary--sm">{val}</a>
        </div>
      );
    }
    return (
      <a href={val} target="_blank" rel="noopener noreferrer"
         className="ta-link-primary">{val}</a>
    );
  }
  return String(val);
}

function DiffRow({ label, before, after, formatVal, isChanged }) {
  return (
    <div className={`ta-diff-card ${isChanged ? 'ta-diff-card--changed' : ''}`}>
      <div className="ta-diff-head">
        <span className="ta-diff-label">{label}</span>
        {isChanged && (
          <span className="ta-diff-status">Thay đổi</span>
        )}
      </div>
      {isChanged ? (
        <div className="ta-diff-lines">
          <div className="ta-diff-line">
            <span className="ta-diff-pill ta-diff-pill--old">Cũ</span>
            <div className="ta-diff-value ta-diff-value--old">
              {formatVal(before)}
            </div>
          </div>
          <div className="ta-diff-line">
            <span className="ta-diff-pill ta-diff-pill--new">Mới</span>
            <div className="ta-diff-value ta-diff-value--new">
              {formatVal(after)}
            </div>
          </div>
        </div>
      ) : (
        <div className="ta-diff-value">{formatVal(after)}</div>
      )}
    </div>
  );
}

function CourseDiff({ before, after }) {
  const keys = Object.keys(after).filter((k) => !SKIP_FIELDS.has(k) && COURSE_FIELD_LABELS[k]);
  if (keys.length === 0) return <p className="ta-text-muted">Không có trường nào được cập nhật.</p>;

  const changed = keys.filter((k) => String(before?.[k] ?? '') !== String(after[k] ?? ''));
  const unchanged = keys.filter((k) => !changed.includes(k));

  return (
    <div>
      {changed.length > 0 && (
        <div className="ta-section-block">
          <div className="ta-section-title">
            <span className="ta-section-dot" />
            {changed.length} trường thay đổi
          </div>
          <div className="ta-section-list">
            {changed.map((k) => (
              <DiffRow
                key={k}
                label={COURSE_FIELD_LABELS[k]}
                before={before?.[k]}
                after={after[k]}
                formatVal={(v) => fmtCourseValue(k, v)}
                isChanged
              />
            ))}
          </div>
        </div>
      )}
      {unchanged.length > 0 && (
        <details className="ta-details-compact">
          <summary className="ta-details-summary">
            {unchanged.length} trường không đổi
          </summary>
          <div className="ta-section-list ta-section-list--compact">
            {unchanged.map((k) => (
              <DiffRow
                key={k}
                label={COURSE_FIELD_LABELS[k]}
                before={before?.[k]}
                after={after[k]}
                formatVal={(v) => fmtCourseValue(k, v)}
                isChanged={false}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function LessonDiff({ before, after }) {
  const keys = Object.keys(after).filter((k) => !SKIP_FIELDS.has(k) && LESSON_FIELD_LABELS[k]);
  if (keys.length === 0) return <p className="ta-text-muted">Không có trường nào được cập nhật.</p>;

  const changed = keys.filter((k) => String(before?.[k] ?? '') !== String(after[k] ?? ''));
  const unchanged = keys.filter((k) => !changed.includes(k));

  return (
    <div>
      {changed.length > 0 && (
        <div className="ta-section-block">
          <div className="ta-section-title">
            <span className="ta-section-dot" />
            {changed.length} trường thay đổi
          </div>
          <div className="ta-section-list">
            {changed.map((k) => (
              <DiffRow
                key={k}
                label={LESSON_FIELD_LABELS[k]}
                before={before?.[k]}
                after={after[k]}
                formatVal={(v) => fmtLessonValue(k, v)}
                isChanged
              />
            ))}
          </div>
        </div>
      )}
      {unchanged.length > 0 && (
        <details className="ta-details-compact">
          <summary className="ta-details-summary">
            {unchanged.length} trường không đổi
          </summary>
          <div className="ta-section-list ta-section-list--compact">
            {unchanged.map((k) => (
              <DiffRow
                key={k}
                label={LESSON_FIELD_LABELS[k]}
                before={before?.[k]}
                after={after[k]}
                formatVal={(v) => fmtLessonValue(k, v)}
                isChanged={false}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function PreviewModal({ change, onClose }) {
  const raw = change.change_data || {};
  const hasDiff = raw.before != null && raw.after != null;
  const data = hasDiff ? raw.after : raw;
  const before = hasDiff ? raw.before : null;
  const type = change.change_type;

  const renderContent = () => {
    if (type.startsWith('delete_')) {
      return <p className="ta-text-muted">Yêu cầu xóa — không có nội dung xem trước.</p>;
    }

    if (type === 'update_course' && hasDiff) {
      return <CourseDiff before={before} after={data} />;
    }

    if (type === 'update_lesson' && hasDiff) {
      return <LessonDiff before={before} after={data} />;
    }

    if (type === 'create_course' || type === 'update_course') {
      return (
        <div className="ta-preview-stack">
          {data.course_name && <Row label="Tên khóa học" value={data.course_name} />}
          {data.category && <Row label="Danh mục" value={data.category} />}
          {data.level && <Row label="Cấp độ" value={data.level} />}
          {data.price != null && <Row label="Giá" value={`${Number(data.price).toLocaleString('vi-VN')} ₫`} />}
          {data.description && <Row label="Mô tả" value={data.description} />}
          {data.thumbnail && (
            <div>
              <div className="ta-value-label">Ảnh bìa</div>
              <img src={data.thumbnail} alt="" className="ta-preview-image ta-preview-image--large" />
            </div>
          )}
        </div>
      );
    }

    if (type === 'create_lesson' || type === 'update_lesson') {
      return (
        <div className="ta-preview-stack">
          {data.lesson_title && <Row label="Tên bài học" value={data.lesson_title} />}
          {data.lesson_order != null && <Row label="Thứ tự" value={data.lesson_order} />}
          {data.video_url && (
            <div>
              <div className="ta-value-label ta-value-label--spaced">Video</div>
              <VideoEmbed url={data.video_url} />
            </div>
          )}
          {data.lesson_content && <Row label="Nội dung" value={data.lesson_content} />}
        </div>
      );
    }

    if (type === 'create_quiz') {
      return (
        <div className="ta-preview-stack ta-preview-stack--loose">
          {data.quiz_title && <Row label="Tên bài kiểm tra" value={data.quiz_title} />}
          {data.description && <Row label="Mô tả" value={data.description} />}
          {data.lesson_order != null && <Row label="Thứ tự" value={data.lesson_order} />}
          {Array.isArray(data.questions) && data.questions.length > 0 && (
            <div>
              <div className="ta-value-label ta-value-label--spaced">Câu hỏi ({data.questions.length})</div>
              {data.questions.map((q, qi) => (
                <div key={qi} className="ta-quiz-preview-card">
                  <div className="ta-quiz-preview-title">Câu {qi + 1}: {q.question_text}</div>
                  <div className="ta-quiz-option-list">
                    {(q.options || []).map((o, oi) => (
                      <div key={oi} className="ta-quiz-option">
                        <span className={`ta-quiz-option-dot ${o.is_correct ? 'ta-quiz-option-dot--correct' : ''}`}>
                          {o.is_correct && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <span className={`ta-quiz-option-text ${o.is_correct ? 'ta-quiz-option-text--correct' : ''}`}>
                          {String.fromCharCode(65 + oi)}. {o.option_text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <p className="ta-text-muted">{JSON.stringify(data, null, 2)}</p>;
  };

  return (
    <div className="ta-modal-backdrop" onClick={onClose}>
      <div className="ta-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ta-modal-header">
          <div>
            <div className="ta-modal-title">
              {CHANGE_TYPE_LABELS[change.change_type] || change.change_type}
            </div>
            <div className="ta-modal-subtitle">
              Giảng viên: <strong>{change.teacher_name}</strong> · #{change.change_id}
            </div>
          </div>
          <button onClick={onClose} className="ta-modal-close" aria-label="Dong">×</button>
        </div>
        <div className="ta-modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div>
      <div className="ta-row-label">{label}</div>
      <div className={`ta-row-value ${mono ? 'ta-row-value--mono' : ''}`}>{value}</div>
    </div>
  );
}

function HistoryView({ changeHistory, loadingHistory }) {
  if (loadingHistory) {
    return <div className="ta-empty">Đang tải lịch sử...</div>;
  }
  if (changeHistory.length === 0) {
    return <div className="ta-empty">Chưa có yêu cầu nào được xử lý</div>;
  }
  return (
    <div className="ta-table-scroll">
      <table className="ta-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Giảng viên</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Người duyệt</th>
            <th>Ghi chú</th>
            <th>Ngày xử lý</th>
          </tr>
        </thead>
        <tbody>
          {changeHistory.map((c, i) => (
            <tr key={c.change_id}>
              <td className="ta-text-muted">{i + 1}</td>
              <td className="ta-text-bold">{c.teacher_name || c.requested_by}</td>
              <td><span className="ta-badge ta-badge--info">{CHANGE_TYPE_LABELS[c.change_type] || c.change_type}</span></td>
              <td>
                <span className={`ta-badge ${c.status === 'approved' ? 'ta-badge--active' : 'ta-badge--danger'}`}>
                  {c.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                </span>
              </td>
              <td>{c.reviewer_name || '-'}</td>
              <td className="ta-col-note">
                {c.review_note
                  ? <span className="ta-review-note-text">"{c.review_note}"</span>
                  : <span className="ta-text-muted">—</span>}
              </td>
              <td className="ta-text-muted">
                {c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString('vi-VN') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminChangesTab({
  pendingChanges, lockRequests, processingChange, onApprove, onReject, onBulkApprove, onBulkReject, bulkProcessing,
  changeHistory, loadingHistory, onLoadHistory, onApproveLock, onRejectLock,
}) {
  const [subView, setSubView] = useState('pending');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewChange, setPreviewChange] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const typeCounts = useMemo(() => ({
    all: pendingChanges.length,
    course: pendingChanges.filter((change) => change.change_type?.includes('course')).length,
    lesson: pendingChanges.filter((change) => change.change_type?.includes('lesson')).length,
    quiz: pendingChanges.filter((change) => change.change_type?.includes('quiz')).length,
    delete: pendingChanges.filter((change) => change.change_type?.startsWith('delete_')).length,
  }), [pendingChanges]);

  const filteredChanges = useMemo(() => {
    if (typeFilter === 'all') return pendingChanges;
    if (typeFilter === 'delete') return pendingChanges.filter((change) => change.change_type?.startsWith('delete_'));
    return pendingChanges.filter((change) => change.change_type?.includes(typeFilter));
  }, [pendingChanges, typeFilter]);

  const typeFilters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'course', label: 'Khóa học' },
    { key: 'lesson', label: 'Bài học' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'delete', label: 'Yêu cầu xóa' },
  ];

  const pendingLockRequests = useMemo(() => {
    return (lockRequests || []).filter((request) => request.status === 'pending' || !request.status);
  }, [lockRequests]);

  const allSelected = filteredChanges.length > 0 && filteredChanges.every((c) => selectedIds.has(c.change_id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredChanges.map((c) => c.change_id)));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (!confirm(`Duyệt ${selectedIds.size} yêu cầu đã chọn?`)) return;
    await onBulkApprove(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkReject = async () => {
    if (!confirm(`Từ chối ${selectedIds.size} yêu cầu đã chọn?`)) return;
    await onBulkReject(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const startReject = (changeId) => {
    setRejectingId(changeId);
    setRejectNote('');
  };

  const confirmReject = (changeId) => {
    setRejectingId(null);
    onReject(changeId, rejectNote.trim() || undefined);
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectNote('');
  };

  const switchToHistory = () => {
    setSubView('history');
    onLoadHistory();
  };

  const isDisabled = (changeId) => bulkProcessing || processingChange.id === changeId;

  return (
    <div>
      {previewChange && <PreviewModal change={previewChange} onClose={() => setPreviewChange(null)} />}

      {/* Sub-view toggle */}
      <div className="ta-subview-toggle">
        <button
          className={`ta-btn ta-btn--sm ${subView === 'pending' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
          onClick={() => setSubView('pending')}
        >
          Chờ duyệt
          {pendingChanges.length > 0 && (
            <span className={`ta-inline-badge ${subView === 'pending' ? 'ta-inline-badge--muted' : ''}`}>
              {pendingChanges.length}
            </span>
          )}
        </button>
        <button
          className={`ta-btn ta-btn--sm ${subView === 'history' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
          onClick={switchToHistory}
        >
          Lịch sử duyệt
        </button>
      </div>

      {subView === 'history' ? (
        <div className="ta-table-wrap">
          <div className="ta-table-header">
            <h3 className="ta-table-title">Lịch sử duyệt ({changeHistory.length})</h3>
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={onLoadHistory} disabled={loadingHistory}>
              {loadingHistory ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
          <HistoryView changeHistory={changeHistory} loadingHistory={loadingHistory} />
        </div>
      ) : (
        <div className="ta-table-wrap">
          <div className="ta-table-header">
            <h3 className="ta-table-title">Phê Duyệt ({filteredChanges.length + pendingLockRequests.length})</h3>
            {selectedIds.size > 0 && (
              <div className="ta-actions">
                <span className="ta-selected-count">Đã chọn {selectedIds.size}</span>
                <button className="ta-btn ta-btn--sm ta-btn--success" onClick={handleBulkApprove} disabled={bulkProcessing}>
                  {bulkProcessing ? 'Đang xử lý...' : `Duyệt tất cả (${selectedIds.size})`}
                </button>
                <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={handleBulkReject} disabled={bulkProcessing}>
                  {bulkProcessing ? 'Đang xử lý...' : `Từ chối tất cả (${selectedIds.size})`}
                </button>
              </div>
            )}
          </div>

          <div className="ta-status-filter">
            {typeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`ta-btn ta-btn--sm ${typeFilter === filter.key ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                onClick={() => {
                  setTypeFilter(filter.key);
                  setSelectedIds(new Set());
                }}
              >
                {filter.label} ({typeCounts[filter.key]})
              </button>
            ))}
          </div>

          <div className="ta-table-subsection">
            <div className="ta-table-header ta-table-header--spread">
              <h4 className="ta-table-title ta-table-title--small">Thay đổi chờ duyệt ({filteredChanges.length}/{pendingChanges.length})</h4>
            </div>

            {filteredChanges.length === 0 ? (
              <div className="ta-empty">Không có thay đổi nào chờ duyệt</div>
            ) : (
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th className="ta-checkbox-cell">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="ta-checkbox" />
                      </th>
                      <th>ID</th>
                      <th>Giảng viên</th>
                      <th>Khóa học</th>
                      <th>Loại</th>
                      <th>Ngày</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChanges.map((c) => {
                      const isProcessing = processingChange.id === c.change_id;
                      const isApproving = isProcessing && processingChange.action === 'approve';
                      const isRejecting = isProcessing && processingChange.action === 'reject';
                      const hasPreview = !c.change_type?.startsWith('delete_');
                      const isRejectOpen = rejectingId === c.change_id;
                      return (
                        <tr key={c.change_id} className={isRejectOpen ? 'ta-row-warning' : selectedIds.has(c.change_id) ? 'ta-row-highlight' : undefined}>
                          <td>
                            <input type="checkbox" checked={selectedIds.has(c.change_id)} onChange={() => toggleOne(c.change_id)} className="ta-checkbox" disabled={isRejectOpen} />
                          </td>
                          <td className="ta-text-muted">{c.change_id}</td>
                          <td className="ta-text-bold">{c.teacher_name || c.teacher_id}</td>
                          <td>{c.course_name || c.course_id || (c.change_data?.course_id) || '-'}</td>
                          <td><span className="ta-badge ta-badge--info">{CHANGE_TYPE_LABELS[c.change_type] || c.change_type}</span></td>
                          <td className="ta-text-muted">{new Date(c.requested_at || c.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            {isRejectOpen ? (
                              <div className="ta-reject-box">
                                <textarea
                                  rows={2}
                                  placeholder="Lý do từ chối (không bắt buộc)..."
                                  value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)}
                                  autoFocus
                                  className="ta-reject-textarea"
                                />
                                <div className="ta-action-row">
                                  <button
                                    className="ta-btn ta-btn--sm ta-btn--danger"
                                    onClick={() => confirmReject(c.change_id)}
                                    disabled={isRejecting}
                                  >
                                    {isRejecting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                                  </button>
                                  <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={cancelReject}>
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="ta-actions">
                                {hasPreview && (
                                  <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={() => setPreviewChange(c)} disabled={isDisabled(c.change_id)}>
                                    Xem
                                  </button>
                                )}
                                <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => onApprove(c.change_id)} disabled={isDisabled(c.change_id)}>
                                  {isApproving ? 'Đang duyệt...' : 'Duyệt'}
                                </button>
                                <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => startReject(c.change_id)} disabled={isDisabled(c.change_id)}>
                                  Từ chối
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="ta-table-subsection">
            <div className="ta-table-header ta-table-header--spread">
              <h4 className="ta-table-title ta-table-title--small">Yêu cầu khóa tài khoản ({pendingLockRequests.length})</h4>
            </div>

            {pendingLockRequests.length === 0 ? (
              <div className="ta-empty">Không có yêu cầu khóa nào</div>
            ) : (
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Người dùng</th>
                      <th>Lý do</th>
                      <th>Người yêu cầu</th>
                      <th>Ngày</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLockRequests.map((r) => (
                      <tr key={r.request_id}>
                        <td className="ta-text-muted">{r.request_id}</td>
                        <td className="ta-text-bold">{r.target_name || r.target_user_id}</td>
                        <td>{r.reason}</td>
                        <td>{r.requester_name || r.requester_id}</td>
                        <td className="ta-text-muted">{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                        <td>
                          <div className="ta-actions">
                            <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => onApproveLock?.(r.request_id)}>Duyệt</button>
                            <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => onRejectLock?.(r.request_id)}>Từ chối</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
