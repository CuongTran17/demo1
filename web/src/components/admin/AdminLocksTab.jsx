export default function AdminLocksTab({ lockRequests, onApprove, onReject }) {
  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Yêu cầu khóa tài khoản ({lockRequests.length})</h3>
        </div>
        {lockRequests.length === 0 ? (
          <div className="ta-empty">Không có yêu cầu nào</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>ID</th><th>Người dùng</th><th>Lý do</th><th>Người yêu cầu</th><th>Ngày</th><th>Hành động</th></tr>
              </thead>
              <tbody>
                {lockRequests.map((r) => (
                  <tr key={r.request_id}>
                    <td className="ta-text-muted">{r.request_id}</td>
                    <td className="ta-text-bold">{r.target_name || r.target_user_id}</td>
                    <td>{r.reason}</td>
                    <td>{r.requester_name || r.requester_id}</td>
                    <td className="ta-text-muted">{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <div className="ta-actions">
                        <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => onApprove(r.request_id)}>Duyệt</button>
                        <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => onReject(r.request_id)}>Từ chối</button>
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
  );
}
