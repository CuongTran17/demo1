import { useState } from 'react';

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
  if (!url) return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Không có</span>;
  const parsed = parseVideoUrl(url);
  const urlLink = (
    <a href={url} target="_blank" rel="noopener noreferrer"
       style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-all', display: 'block', marginTop: 4 }}>
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
          style={{ borderRadius: 8, border: '1px solid #e2e8f0', display: 'block' }}
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
          style={{ borderRadius: 8, border: '1px solid #e2e8f0', display: 'block' }}
        />
        {urlLink}
      </div>
    );
  }
  if (parsed?.type === 'file') {
    return (
      <div>
        <video controls style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 200, display: 'block' }}>
          <source src={url} />
        </video>
        {urlLink}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       style={{ fontSize: 13, color: '#3b82f6', wordBreak: 'break-all' }}>
      {url}
    </a>
  );
}

function fmtCourseValue(key, val) {
  if (val == null || val === '') return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Không có</span>;
  if (key === 'price' || key === 'old_price') return `${Number(val).toLocaleString('vi-VN')} ₫`;
  if (key === 'is_new') return val ? 'Có' : 'Không';
  if (key === 'thumbnail') {
    return (
      <img
        src={val}
        alt=""
        style={{ maxWidth: 180, maxHeight: 110, borderRadius: 6, border: '1px solid #e2e8f0', display: 'block', marginTop: 4 }}
      />
    );
  }
  return String(val);
}

function fmtLessonValue(key, val) {
  if (val == null || val === '') return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Không có</span>;
  if (key === 'video_url') {
    const parsed = parseVideoUrl(val);
    const typeLabel = VIDEO_TYPE_LABELS[parsed?.type];
    if (typeLabel) {
      return (
        <div>
          <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 7px', marginRight: 6, fontWeight: 600 }}>
            {typeLabel}
          </span>
          <a href={val} target="_blank" rel="noopener noreferrer"
             style={{ fontSize: 12, color: '#3b82f6', wordBreak: 'break-all' }}>{val}</a>
        </div>
      );
    }
    return (
      <a href={val} target="_blank" rel="noopener noreferrer"
         style={{ fontSize: 13, color: '#3b82f6', wordBreak: 'break-all' }}>{val}</a>
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
  if (keys.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13 }}>Không có trường nào được cập nhật.</p>;

  const changed = keys.filter((k) => String(before?.[k] ?? '') !== String(after[k] ?? ''));
  const unchanged = keys.filter((k) => !changed.includes(k));

  return (
    <div>
      {changed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ca8a04', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
            {changed.length} trường thay đổi
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}>
            {unchanged.length} trường không đổi
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
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
  if (keys.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13 }}>Không có trường nào được cập nhật.</p>;

  const changed = keys.filter((k) => String(before?.[k] ?? '') !== String(after[k] ?? ''));
  const unchanged = keys.filter((k) => !changed.includes(k));

  return (
    <div>
      {changed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ca8a04', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
            {changed.length} trường thay đổi
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}>
            {unchanged.length} trường không đổi
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
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
      return <p style={{ color: '#64748b' }}>Yêu cầu xóa — không có nội dung xem trước.</p>;
    }

    if (type === 'update_course' && hasDiff) {
      return <CourseDiff before={before} after={data} />;
    }

    if (type === 'update_lesson' && hasDiff) {
      return <LessonDiff before={before} after={data} />;
    }

    if (type === 'create_course' || type === 'update_course') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.course_name && <Row label="Tên khóa học" value={data.course_name} />}
          {data.category && <Row label="Danh mục" value={data.category} />}
          {data.level && <Row label="Cấp độ" value={data.level} />}
          {data.price != null && <Row label="Giá" value={`${Number(data.price).toLocaleString('vi-VN')} ₫`} />}
          {data.description && <Row label="Mô tả" value={data.description} />}
          {data.thumbnail && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Ảnh bìa</div>
              <img src={data.thumbnail} alt="" style={{ maxWidth: 200, borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </div>
          )}
        </div>
      );
    }

    if (type === 'create_lesson' || type === 'update_lesson') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.lesson_title && <Row label="Tên bài học" value={data.lesson_title} />}
          {data.lesson_order != null && <Row label="Thứ tự" value={data.lesson_order} />}
          {data.video_url && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Video</div>
              <VideoEmbed url={data.video_url} />
            </div>
          )}
          {data.lesson_content && <Row label="Nội dung" value={data.lesson_content} />}
        </div>
      );
    }

    if (type === 'create_quiz') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.quiz_title && <Row label="Tên bài kiểm tra" value={data.quiz_title} />}
          {data.description && <Row label="Mô tả" value={data.description} />}
          {data.lesson_order != null && <Row label="Thứ tự" value={data.lesson_order} />}
          {Array.isArray(data.questions) && data.questions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Câu hỏi ({data.questions.length})</div>
              {data.questions.map((q, qi) => (
                <div key={qi} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Câu {qi + 1}: {q.question_text}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(q.options || []).map((o, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: o.is_correct ? '#16a34a' : '#e2e8f0',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {o.is_correct && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <span style={{ color: o.is_correct ? '#15803d' : '#475569', fontWeight: o.is_correct ? 600 : 400 }}>
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

    return <p style={{ color: '#64748b', fontSize: 13 }}>{JSON.stringify(data, null, 2)}</p>;
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
              <td style={{ maxWidth: 200 }}>
                {c.review_note
                  ? <span style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>"{c.review_note}"</span>
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
  pendingChanges, processingChange, onApprove, onReject, onBulkApprove, onBulkReject, bulkProcessing,
  changeHistory, loadingHistory, onLoadHistory,
}) {
  const [subView, setSubView] = useState('pending');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewChange, setPreviewChange] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const allSelected = pendingChanges.length > 0 && pendingChanges.every((c) => selectedIds.has(c.change_id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingChanges.map((c) => c.change_id)));
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
            <h3 className="ta-table-title">Thay đổi chờ duyệt ({pendingChanges.length})</h3>
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

          {pendingChanges.length === 0 ? (
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
                  {pendingChanges.map((c) => {
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
      )}
    </div>
  );
}
