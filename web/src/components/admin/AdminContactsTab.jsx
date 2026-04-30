import { useMemo, useState } from 'react';

const SUBJECT_LABELS = {
  support: 'Hỗ trợ kỹ thuật',
  payment: 'Thanh toán',
  course: 'Khóa học',
  other: 'Khác',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
}

export default function AdminContactsTab({
  messages,
  loading,
  onToggleResolved,
  onDelete,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('unresolved');

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((message) => {
      const matchSearch = !q ||
        message.name?.toLowerCase().includes(q) ||
        message.email?.toLowerCase().includes(q) ||
        message.subject?.toLowerCase().includes(q) ||
        message.message?.toLowerCase().includes(q);
      const resolved = Number(message.is_resolved) === 1;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'resolved' && resolved) ||
        (statusFilter === 'unresolved' && !resolved);
      return matchSearch && matchStatus;
    });
  }, [messages, search, statusFilter]);

  const unresolvedCount = messages.filter((message) => Number(message.is_resolved) !== 1).length;

  return (
    <div className="ta-table-wrap">
      <div className="ta-table-header">
        <h3 className="ta-table-title">
          Tin nhắn liên hệ
          <span className="ta-count-muted">{filteredMessages.length}/{messages.length}</span>
        </h3>
        <span className="ta-badge ta-badge--pending">{unresolvedCount} chưa xử lý</span>
      </div>

      <div className="rm-filter-bar">
        <div className="rm-search-wrap">
          <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            className="rm-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, chủ đề, nội dung..."
          />
          {search && <button className="rm-clear-btn" type="button" onClick={() => setSearch('')}>×</button>}
        </div>
        <select className="ta-form-select ta-select-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="unresolved">Chưa xử lý</option>
          <option value="resolved">Đã xử lý</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      {loading ? (
        <div className="ta-empty">Đang tải tin nhắn...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="ta-empty">Không có tin nhắn phù hợp</div>
      ) : (
        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead>
              <tr>
                <th>Người gửi</th>
                <th>Chủ đề</th>
                <th>Nội dung</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((message) => {
                const resolved = Number(message.is_resolved) === 1;
                return (
                  <tr key={message.message_id}>
                    <td>
                      <div className="ta-text-bold">{message.name}</div>
                      <div className="ta-text-muted ta-text-xs">{message.email}</div>
                    </td>
                    <td>{SUBJECT_LABELS[message.subject] || message.subject || 'Không chọn'}</td>
                    <td style={{ minWidth: 280 }}>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message.message}</div>
                    </td>
                    <td>{formatDate(message.created_at)}</td>
                    <td>
                      <span className={`ta-badge ${resolved ? 'ta-badge--active' : 'ta-badge--pending'}`}>
                        {resolved ? 'Đã xử lý' : 'Chưa xử lý'}
                      </span>
                      {resolved && message.resolved_by_name && (
                        <div className="ta-text-muted ta-text-xs">bởi {message.resolved_by_name}</div>
                      )}
                    </td>
                    <td>
                      <div className="ta-actions">
                        <label className="ta-checkbox-row" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={resolved}
                            onChange={(e) => onToggleResolved(message.message_id, e.target.checked)}
                          />
                          Đã xử lý
                        </label>
                        <button className="ta-btn ta-btn--sm ta-btn--danger" type="button" onClick={() => onDelete(message)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
