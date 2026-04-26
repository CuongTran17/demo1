export default function AdminUsersTab({
  users,
  filteredUsers,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  updatingRoleId,
  showCreateTeacher,
  setShowCreateTeacher,
  showAssignCourse,
  setShowAssignCourse,
  teacherForm,
  setTeacherForm,
  assignForm,
  setAssignForm,
  courses,
  resolveRole,
  onCreateTeacher,
  onAssignCourse,
  onLockUser,
  onUnlockUser,
  onDeleteUser,
  onUpdateUserRole,
}) {
  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">
            Quản lý người dùng
            <span className="ta-text-muted" style={{ marginLeft: 8, fontWeight: 400, fontSize: 14 }}>
              {filteredUsers.length}/{users.length}
            </span>
          </h3>
          <div className="ta-actions">
            <button className="ta-btn ta-btn--primary" onClick={() => setShowCreateTeacher(!showCreateTeacher)}>+ Tạo giảng viên</button>
            <button className="ta-btn ta-btn--outline" onClick={() => setShowAssignCourse(!showAssignCourse)}>Gán khóa học</button>
          </div>
        </div>

        {showCreateTeacher && (
          <div style={{ padding: '0 24px 24px' }}>
            <div className="ta-form-card">
              <h3>Tạo tài khoản giảng viên</h3>
              <form onSubmit={onCreateTeacher}>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Họ và tên</label>
                    <input className="ta-form-input" placeholder="Họ và tên" value={teacherForm.fullname} onChange={(e) => setTeacherForm({ ...teacherForm, fullname: e.target.value })} required />
                  </div>
                  <div>
                    <label className="ta-form-label">Email</label>
                    <input className="ta-form-input" placeholder="Email" type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
                  </div>
                </div>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Số điện thoại</label>
                    <input className="ta-form-input" placeholder="Số điện thoại" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label className="ta-form-label">Mật khẩu</label>
                    <input className="ta-form-input" placeholder="Mật khẩu" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
                  </div>
                </div>
                <div className="ta-form-actions">
                  <button type="submit" className="ta-btn ta-btn--primary">Tạo</button>
                  <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowCreateTeacher(false)}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAssignCourse && (
          <div style={{ padding: '0 24px 24px' }}>
            <div className="ta-form-card">
              <h3>Gán khóa học cho giảng viên</h3>
              <form onSubmit={onAssignCourse}>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Giảng viên</label>
                    <select className="ta-form-select" value={assignForm.teacherId} onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })} required>
                      <option value="">-- Chọn giảng viên --</option>
                      {users.filter((u) => resolveRole(u) === 'teacher').map((t) => <option key={t.user_id} value={t.user_id}>{t.fullname}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="ta-form-label">Khóa học</label>
                    <select className="ta-form-select" value={assignForm.courseId} onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })} required>
                      <option value="">-- Chọn khóa học --</option>
                      {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ta-form-actions">
                  <button type="submit" className="ta-btn ta-btn--primary">Gán</button>
                  <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowAssignCourse(false)}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="rm-filter-bar">
          <div className="rm-search-wrap">
            <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              className="rm-search-input"
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {userSearch && (
              <button className="rm-clear-btn" onClick={() => setUserSearch('')}>✕</button>
            )}
          </div>
          <select
            className="ta-form-select"
            style={{ minWidth: 150 }}
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="ta-empty">Không tìm thấy người dùng phù hợp</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Hành động</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const role = resolveRole(u);
                  const roleBadge = role === 'admin' ? 'ta-badge--danger' : role === 'teacher' ? 'ta-badge--info' : 'ta-badge--success';
                  const isSelf = u.email === 'admin@ptit.edu.vn';
                  const isUpdating = updatingRoleId === u.user_id;
                  return (
                    <tr key={u.user_id}>
                      <td className="ta-text-muted">{u.user_id}</td>
                      <td className="ta-text-bold">{u.fullname}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>
                        {isSelf ? (
                          <span className={`ta-badge ${roleBadge}`}>{role}</span>
                        ) : (
                          <select
                            className="ta-form-select"
                            style={{ padding: '4px 8px', fontSize: 13, minWidth: 100 }}
                            value={role}
                            disabled={isUpdating}
                            onChange={(e) => onUpdateUserRole(u.user_id, e.target.value)}
                          >
                            <option value="admin">admin</option>
                            <option value="teacher">teacher</option>
                            <option value="student">student</option>
                          </select>
                        )}
                      </td>
                      <td><span className={`ta-badge ${u.is_locked ? 'ta-badge--locked' : 'ta-badge--active'}`}>{u.is_locked ? 'Bị khóa' : 'Hoạt động'}</span></td>
                      <td>
                        <div className="ta-actions">
                          {u.is_locked ? (
                            <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => onUnlockUser(u.user_id)}>Mở khóa</button>
                          ) : (
                            <button className="ta-btn ta-btn--sm ta-btn--warning" onClick={() => onLockUser(u.user_id)}>Khóa</button>
                          )}
                          <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => onDeleteUser(u.user_id)} disabled={isSelf}>Xóa</button>
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
    </div>
  );
}
