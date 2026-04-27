import { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import ReviewManager from '../ReviewManager';
import { formatPrice, resolveThumbnail } from '../../utils/courseFormat';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

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

export function TeacherOverviewTab({ stats, pendingChanges, resolvedTotalRevenue, resolvedTotalSales, onTabChange }) {
  const pendingRequests = pendingChanges.filter((change) => change.status === 'pending');
  const rejectedRequests = pendingChanges.filter((change) => change.status === 'rejected');
  const latestRejectedNote = rejectedRequests.find((change) => change.review_note)?.review_note;

  return (
    <div>
      <h2>Tổng quan</h2>

      <div className="ta-action-banners">
        <ActionBannerCard
          tone="warning"
          title="Việc đang chờ admin"
          value={pendingRequests.length}
          meta="Yêu cầu tạo, sửa hoặc xóa nội dung đã gửi và đang chờ duyệt."
          actionLabel="Xem yêu cầu"
          onAction={() => onTabChange('changes')}
          highlight={pendingRequests.length > 0}
        />
        <ActionBannerCard
          tone="danger"
          title="Cần chỉnh sửa lại"
          value={rejectedRequests.length}
          meta={latestRejectedNote || 'Các yêu cầu bị từ chối sẽ có ghi chú của admin để bạn xử lý tiếp.'}
          actionLabel="Mở phản hồi"
          onAction={() => onTabChange('changes')}
          highlight={rejectedRequests.length > 0}
        />
      </div>

      <div className="ta-metrics-grid">
        <MetricCard iconClass="ta-metric-icon--blue" label="Khóa học" value={stats.totalCourses} icon="screen" />
        <MetricCard iconClass="ta-metric-icon--green" label="Học viên" value={stats.totalStudents} icon="users" />
        <MetricCard
          iconClass="ta-metric-icon--cyan"
          label="Doanh thu của bạn"
          value={formatPrice(resolvedTotalRevenue || 0)}
          icon="money"
          trend={(resolvedTotalRevenue || 0) > 0 ? 'Đã ghi nhận' : null}
        />
        <MetricCard iconClass="ta-metric-icon--purple" label="Lượt bán" value={resolvedTotalSales || 0} icon="trend" />
      </div>
    </div>
  );
}

export function TeacherRevenueTab({
  revenueCourses,
  resolvedTotalRevenue,
  resolvedTotalSales,
  resolvedCoursesWithSales,
  resolvedCompletedOrders,
}) {
  const handleExportExcel = () => {
    const exportData = revenueCourses.map((c, i) => ({
      'STT': i + 1,
      'Tên khóa học': c.course_name,
      'Danh mục': c.category || 'Khác',
      'Giá niêm yết (VNĐ)': Number(c.price) || 0,
      'Lượt bán': Number(c.unitsSold) || 0,
      'Đơn hàng': Number(c.completedOrders) || 0,
      'Doanh thu (VNĐ)': Number(c.revenue) || 0,
      'Bán gần nhất': c.lastSaleAt ? new Date(c.lastSaleAt).toLocaleDateString('vi-VN') : '-'
    }));
    exportToExcel(exportData, 'BaoCaoDoanhThu_GiangVien');
  };

  const handleExportPDF = () => {
    const exportData = revenueCourses.map((c, i) => ({
      'STT': i + 1,
      'Tên khóa học': c.course_name,
      'Danh mục': c.category || 'Khác',
      'Giá niêm yết (VNĐ)': Number(c.price).toLocaleString('vi-VN'),
      'Lượt bán': Number(c.unitsSold) || 0,
      'Đơn hàng': Number(c.completedOrders) || 0,
      'Doanh thu (VNĐ)': Number(c.revenue).toLocaleString('vi-VN'),
      'Bán gần nhất': c.lastSaleAt ? new Date(c.lastSaleAt).toLocaleDateString('vi-VN') : '-'
    }));
    exportToPDF(exportData, 'BaoCaoDoanhThu_GiangVien', 'BÁO CÁO DOANH THU GIẢNG VIÊN');
  };

  return (
    <div>
      <div className="ta-metrics-grid">
        <MetricCard iconClass="ta-metric-icon--cyan" label="Tổng doanh thu" value={formatPrice(resolvedTotalRevenue || 0)} icon="money" />
        <MetricCard iconClass="ta-metric-icon--purple" label="Lượt bán thành công" value={resolvedTotalSales || 0} icon="trend" />
        <MetricCard iconClass="ta-metric-icon--green" label="Khóa học có doanh thu" value={resolvedCoursesWithSales || 0} icon="book" />
        <MetricCard iconClass="ta-metric-icon--blue" label="Đơn hàng hoàn tất" value={resolvedCompletedOrders || 0} icon="card" />
      </div>

      {revenueCourses.some((c) => Number(c.revenue) > 0 || Number(c.unitsSold) > 0) && (
        <div className="ta-chart-card ta-chart-card--spaced-lg">
          <div className="ta-chart-header">
            <h3 className="ta-chart-title">Doanh thu theo khóa học</h3>
          </div>
          <Chart
            type="bar"
            height={260}
            options={{
              chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
              colors: ['#3b82f6', '#22c55e'],
              plotOptions: { bar: { borderRadius: 5, columnWidth: '55%', grouped: true } },
              xaxis: {
                categories: revenueCourses.map((c) => c.course_name.length > 18 ? `${c.course_name.slice(0, 16)}...` : c.course_name),
                labels: { style: { colors: '#64748b', fontSize: '11px' } },
              },
              yaxis: {
                labels: {
                  style: { colors: '#64748b', fontSize: '11px' },
                  formatter: (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v,
                },
              },
              dataLabels: { enabled: false },
              grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
              tooltip: { y: [{ formatter: (v) => formatPrice(v) }, { formatter: (v) => `${v} đơn` }] },
              legend: { position: 'top', fontFamily: 'Be Vietnam Pro, sans-serif', fontSize: '12px' },
            }}
            series={[
              { name: 'Doanh thu', data: revenueCourses.map((c) => Number(c.revenue) || 0) },
              { name: 'Lượt bán', data: revenueCourses.map((c) => Number(c.unitsSold) || 0) },
            ]}
          />
        </div>
      )}

      <div className="ta-table-wrap ta-table-wrap--spaced-lg">
        <div className="ta-table-header ta-table-header--spread">
          <div>
            <h3 className="ta-table-title">Doanh thu theo khóa học</h3>
            <div className="ta-table-subtitle">
              Chỉ hiển thị khóa học của tài khoản giảng viên này. Doanh thu đã trừ phần khuyến mãi được chia theo từng đơn hàng.
            </div>
          </div>
          <div className="ta-actions">
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportExcel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportPDF}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất PDF
            </button>
          </div>
        </div>

        {revenueCourses.length === 0 ? (
          <div className="ta-empty">Bạn chưa được gán khóa học nào</div>
        ) : (
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Khóa học</th>
                  <th>Giá niêm yết</th>
                  <th>Lượt bán</th>
                  <th>Đơn hàng</th>
                  <th>Doanh thu</th>
                  <th>Bán gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {revenueCourses.map((course) => (
                  <tr key={course.course_id}>
                    <td><img src={resolveThumbnail(course.thumbnail)} alt="" className="ta-cell-img" /></td>
                    <td>
                      <div className="ta-text-bold">{course.course_name}</div>
                      <div className="ta-text-muted">{course.category || 'Khác'}</div>
                    </td>
                    <td>{formatPrice(course.price || 0)}</td>
                    <td>{course.unitsSold || 0}</td>
                    <td>{course.completedOrders || 0}</td>
                    <td className="ta-text-bold">{formatPrice(course.revenue || 0)}</td>
                    <td className="ta-text-muted">{course.lastSaleAt ? new Date(course.lastSaleAt).toLocaleDateString('vi-VN') : '-'}</td>
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

export function TeacherCoursesTab({
  courses,
  pendingCourseIds,
  showCourseForm,
  editingCourse,
  isResubmitMode,
  resubmitChangeId,
  courseForm,
  setCourseForm,
  onCreateCourse,
  onSubmitCourse,
  onImageUpload,
  onEditCourse,
  onDeleteCourse,
  onOpenLessons,
  onCancelCourseForm,
}) {
  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Khóa học của tôi ({courses.length})</h3>
          <button className="ta-btn ta-btn--primary" onClick={onCreateCourse}>+ Tạo khóa học</button>
        </div>

        {showCourseForm && (
          <div className="ta-panel-body">
            <div className="ta-form-card">
              {isResubmitMode && (
                <div className="ta-mb-12">
                  <span className="ta-badge ta-badge--pending">Đang sửa request #{resubmitChangeId}</span>
                </div>
              )}
              <h3>{editingCourse ? 'Cập nhật khóa học' : 'Tạo khóa học mới'}</h3>
              <form onSubmit={onSubmitCourse}>
                <div className="ta-form-row">
                  <label className="ta-form-label">Tên khóa học <span className="ta-required">*</span></label>
                  <input className="ta-form-input" value={courseForm.course_name} onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })} required />
                </div>
                <div className="ta-form-row">
                  <label className="ta-form-label">Mô tả</label>
                  <textarea className="ta-form-textarea" rows="3" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
                </div>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Giá (VNĐ) <span className="ta-required">*</span></label>
                    <input className="ta-form-input" type="number" min="0" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} required />
                  </div>
                  <div>
                    <label className="ta-form-label">Giá gốc (VNĐ)</label>
                    <input className="ta-form-input" type="number" min="0" value={courseForm.old_price} onChange={(e) => setCourseForm({ ...courseForm, old_price: e.target.value })} placeholder="Để trống nếu không có" />
                  </div>
                </div>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Danh mục</label>
                    <select className="ta-form-select" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}>
                      <option value="">-- Chọn --</option>
                      <option value="programming">Lập trình</option>
                      <option value="web">Web</option>
                      <option value="mobile">Mobile</option>
                      <option value="database">Cơ sở dữ liệu</option>
                      <option value="ai">AI/ML</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="ta-form-label">Cấp độ</label>
                    <select className="ta-form-select" value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}>
                      <option value="beginner">Cơ bản</option>
                      <option value="intermediate">Trung cấp</option>
                      <option value="advanced">Nâng cao</option>
                    </select>
                  </div>
                </div>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Thời lượng (phút)</label>
                    <input className="ta-form-input" type="number" min="0" value={courseForm.duration} onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })} placeholder="VD: 120" />
                  </div>
                  <div>
                    <label className="ta-form-label">Ảnh bìa</label>
                    <input className="ta-form-input ta-file-input" type="file" accept="image/*" onChange={onImageUpload} />
                  </div>
                </div>
                {courseForm.thumbnail && (
                  <div className="ta-preview-block">
                    <img src={resolveCoursePreview(courseForm.thumbnail)} alt="Preview" className="ta-image-preview ta-image-preview--large" />
                  </div>
                )}
                <div className="ta-form-actions">
                  <button type="submit" className="ta-btn ta-btn--primary">
                    {isResubmitMode
                      ? 'Cập nhật yêu cầu hiện tại'
                      : editingCourse
                        ? 'Gửi yêu cầu cập nhật'
                        : 'Gửi yêu cầu tạo'}
                  </button>
                  <button type="button" className="ta-btn ta-btn--outline" onClick={onCancelCourseForm}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead><tr><th>Ảnh</th><th>Tên</th><th>Danh mục</th><th>Cấp độ</th><th>Giá</th><th>Học viên</th><th>Hành động</th></tr></thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan="7"><div className="ta-empty">Chưa có khóa học</div></td></tr>
              ) : courses.map((course) => (
                <tr key={course.course_id}>
                  <td><img src={resolveThumbnail(course.thumbnail)} alt="" className="ta-cell-img" /></td>
                  <td>
                    <div className="ta-text-bold">{course.course_name}</div>
                    <div className="ta-course-meta">
                      {course.has_pending_changes && <span className="ta-badge ta-badge--pending">Chờ duyệt</span>}
                    </div>
                  </td>
                  <td><span className="ta-badge ta-badge--info">{course.category}</span></td>
                  <td>{course.level}</td>
                  <td className="ta-text-bold">{formatPrice(course.price)}</td>
                  <td>{course.enrolled_students || 0}</td>
                  <td>
                    {(course.has_pending_changes || pendingCourseIds?.has(String(course.course_id))) ? (
                      <span className="ta-badge ta-badge--pending">Đang chờ duyệt</span>
                    ) : (
                      <div className="ta-actions">
                        <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => onEditCourse(course)}>Sửa</button>
                        <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={() => onOpenLessons(course.course_id)}>Bài học</button>
                        <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => onDeleteCourse(course.course_id)}>Xóa</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TeacherLessonsTab({
  courses,
  selectedCourse,
  setSelectedCourse,
  courseLessons,
  courseQuizzes,
  lessonMode,
  setLessonMode,
  showLessonForm,
  setShowLessonForm,
  showQuizForm,
  setShowQuizForm,
  lessonForm,
  setLessonForm,
  editingLesson,
  isResubmitMode,
  quizForm,
  setQuizForm,
  isQuizResubmitMode,
  quizResubmitChangeId,
  emptyQuizForm,
  loadLessons,
  loadQuizzes,
  openCreateLesson,
  openEditLesson,
  submitLesson,
  deleteLesson,
  submitQuiz,
  deleteQuiz,
  addQuestion,
  removeQuestion,
  updateQuestion,
  updateOption,
  setEditingLesson,
  onCancelLessonForm,
  resubmitChangeId,
}) {
  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Quản lý nội dung</h3>
          <div className="ta-actions">
            <select
              className="ta-form-select ta-select-inline ta-select-filter"
              value={selectedCourse || ''}
              onChange={(e) => {
                if (!e.target.value) return;
                setSelectedCourse(e.target.value);
                loadLessons(e.target.value);
                loadQuizzes(e.target.value);
                setShowLessonForm(false);
                setShowQuizForm(false);
              }}
            >
              <option value="">-- Chọn khóa học --</option>
              {courses.map((course) => <option key={course.course_id} value={course.course_id}>{course.course_name}</option>)}
            </select>
          </div>
        </div>

        {selectedCourse && (
          <div className="ta-content-tabs">
            <button className={`ta-btn ${lessonMode === 'lessons' ? 'ta-btn--primary' : 'ta-btn--outline'}`} onClick={() => { setLessonMode('lessons'); setShowQuizForm(false); }}>
              Bài học ({courseLessons.length})
            </button>
            <button className={`ta-btn ${lessonMode === 'quizzes' ? 'ta-btn--primary' : 'ta-btn--outline'}`} onClick={() => { setLessonMode('quizzes'); setShowLessonForm(false); }}>
              Bài kiểm tra ({courseQuizzes.length})
            </button>
          </div>
        )}
      </div>

      {selectedCourse && lessonMode === 'lessons' && (
        <LessonsPanel
          courses={courses}
          selectedCourse={selectedCourse}
          courseLessons={courseLessons}
          showLessonForm={showLessonForm}
          lessonForm={lessonForm}
          setLessonForm={setLessonForm}
          editingLesson={editingLesson}
          isResubmitMode={isResubmitMode}
          resubmitChangeId={resubmitChangeId}
          openCreateLesson={openCreateLesson}
          openEditLesson={openEditLesson}
          submitLesson={submitLesson}
          deleteLesson={deleteLesson}
          onCancel={onCancelLessonForm || (() => { setShowLessonForm(false); setEditingLesson(null); })}
        />
      )}

      {selectedCourse && lessonMode === 'quizzes' && (
        <QuizzesPanel
          courseQuizzes={courseQuizzes}
          showQuizForm={showQuizForm}
          setShowQuizForm={setShowQuizForm}
          quizForm={quizForm}
          setQuizForm={setQuizForm}
          isQuizResubmitMode={isQuizResubmitMode}
          quizResubmitChangeId={quizResubmitChangeId}
          emptyQuizForm={emptyQuizForm}
          submitQuiz={submitQuiz}
          deleteQuiz={deleteQuiz}
          addQuestion={addQuestion}
          removeQuestion={removeQuestion}
          updateQuestion={updateQuestion}
          updateOption={updateOption}
        />
      )}

      {!selectedCourse && (
        <div className="ta-table-wrap ta-table-wrap--spaced">
          <div className="ta-empty">Hãy chọn một khóa học để quản lý nội dung</div>
        </div>
      )}
    </div>
  );
}

export function TeacherStudentsTab({
  courses,
  selectedStudentCourse,
  studentProgress,
  totalQuizzes,
  loadingStudents,
  loadStudentProgress,
}) {
  const completedCount = studentProgress.filter((student) => student.status === 'completed').length;

  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Tiến độ học viên</h3>
          <select
            className="ta-form-select ta-select-inline ta-select-filter--wide"
            value={selectedStudentCourse || ''}
            onChange={(e) => { if (e.target.value) loadStudentProgress(e.target.value); }}
          >
            <option value="">-- Chọn khóa học --</option>
            {courses.map((course) => <option key={course.course_id} value={course.course_id}>{course.course_name}</option>)}
          </select>
        </div>

        {!selectedStudentCourse && <div className="ta-empty">Chọn khóa học để xem tiến độ học viên</div>}
        {selectedStudentCourse && loadingStudents && <div className="ta-empty">Đang tải...</div>}

        {selectedStudentCourse && !loadingStudents && (
          studentProgress.length === 0 ? (
            <div className="ta-empty">Chưa có học viên nào đăng ký khóa học này</div>
          ) : (
            <>
              <div className="ta-student-summary">
                <span>Tổng học viên: <strong className="ta-summary-value">{studentProgress.length}</strong></span>
                <span>Đã hoàn thành: <strong className="ta-summary-value ta-summary-value--success">{completedCount}</strong></span>
                <span>Đang học: <strong className="ta-summary-value ta-summary-value--info">{studentProgress.length - completedCount}</strong></span>
                {totalQuizzes > 0 && <span>Tổng bài kiểm tra: <strong className="ta-summary-value ta-summary-value--primary">{totalQuizzes}</strong></span>}
              </div>
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Email</th>
                      <th>Tiến độ</th>
                      <th>Trạng thái</th>
                      {totalQuizzes > 0 && <th>Quiz đã qua</th>}
                      <th>Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentProgress.map((student) => (
                      <tr key={student.user_id}>
                        <td className="ta-text-bold">{student.fullname}</td>
                        <td className="ta-text-muted">{student.email}</td>
                        <td>
                          <div className="ta-progress-cell">
                            <div className="ta-progress-track">
                              <div className={`ta-progress-fill ${student.progress_percentage >= 100 ? 'ta-progress-fill--complete' : ''}`} style={{ width: `${student.progress_percentage || 0}%` }} />
                            </div>
                            <span className="ta-progress-label">{Math.round(student.progress_percentage || 0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`ta-badge ${student.status === 'completed' ? 'ta-badge--approved' : 'ta-badge--info'}`}>
                            {student.status === 'completed' ? 'Hoàn thành' : 'Đang học'}
                          </span>
                        </td>
                        {totalQuizzes > 0 && (
                          <td>
                            <span className={`ta-quiz-score ${student.quiz_passed_count >= totalQuizzes ? 'ta-quiz-score--complete' : ''}`}>
                              {student.quiz_passed_count}/{totalQuizzes}
                            </span>
                          </td>
                        )}
                        <td className="ta-text-muted">{student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString('vi-VN') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

function getChangeTypeGroup(changeType) {
  if (changeType?.includes('course')) return 'course';
  if (changeType?.includes('lesson')) return 'lesson';
  if (changeType?.includes('quiz')) return 'quiz';
  return 'other';
}

function summarizeChange(change) {
  const data = change?.change_data?.after ?? change?.change_data ?? {};
  if (change.change_type === 'create_course') return data.course_name || '-';
  if (change.change_type === 'create_lesson') return data.lesson_title || '-';
  if (change.change_type === 'update_course') return data.course_name || 'Cập nhật thông tin khóa học';
  if (change.change_type === 'update_lesson') return data.lesson_title || 'Cập nhật thông tin bài học';
  if (change.change_type === 'create_quiz') return data.quiz_title || 'Tạo bài kiểm tra';
  return '-';
}

export function TeacherChangesTab({ pendingChanges, onResubmitChange, onWithdrawChange, activeResubmitChangeId, onTabChange }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const statusCounts = useMemo(() => ({
    all: pendingChanges.length,
    pending: pendingChanges.filter((change) => change.status === 'pending').length,
    approved: pendingChanges.filter((change) => change.status === 'approved').length,
    rejected: pendingChanges.filter((change) => change.status === 'rejected').length,
  }), [pendingChanges]);

  const typeCounts = useMemo(() => ({
    all: pendingChanges.length,
    course: pendingChanges.filter((change) => getChangeTypeGroup(change.change_type) === 'course').length,
    lesson: pendingChanges.filter((change) => getChangeTypeGroup(change.change_type) === 'lesson').length,
    quiz: pendingChanges.filter((change) => getChangeTypeGroup(change.change_type) === 'quiz').length,
    other: pendingChanges.filter((change) => getChangeTypeGroup(change.change_type) === 'other').length,
  }), [pendingChanges]);

  const filteredChanges = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return pendingChanges.filter((change) => {
      const byStatus = statusFilter === 'all' || change.status === statusFilter;
      const byType = typeFilter === 'all' || getChangeTypeGroup(change.change_type) === typeFilter;
      if (!byStatus || !byType) return false;

      if (!normalizedKeyword) return true;
      const searchText = [
        String(change.change_id || ''),
        String(change.course_name || ''),
        String(change.course_id || ''),
        String(change.target_id || ''),
        String(change.change_type || ''),
        String(change.review_note || ''),
        String(summarizeChange(change) || ''),
      ]
        .join(' ')
        .toLowerCase();
      return searchText.includes(normalizedKeyword);
    });
  }, [pendingChanges, statusFilter, typeFilter, keyword]);

  const statusFilters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Đang chờ' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Cần sửa' },
  ];
  const typeFilters = [
    { key: 'all', label: 'Mọi loại' },
    { key: 'course', label: 'Khóa học' },
    { key: 'lesson', label: 'Bài học' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'other', label: 'Khác' },
  ];

  return (
    <div className="ta-table-wrap">
      <div className="ta-table-header">
        <h3 className="ta-table-title">Yêu cầu đã gửi ({filteredChanges.length}/{pendingChanges.length})</h3>
      </div>
      <div className="ta-status-filter">
        {statusFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`ta-btn ta-btn--sm ${statusFilter === filter.key ? 'ta-btn--primary' : 'ta-btn--outline'}`}
            onClick={() => setStatusFilter(filter.key)}
          >
            {filter.label} ({statusCounts[filter.key]})
          </button>
        ))}
      </div>
      <div className="ta-actions ta-mb-12">
        <select
          className="ta-form-select ta-select-inline"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {typeFilters.map((filter) => (
            <option key={filter.key} value={filter.key}>
              {filter.label} ({typeCounts[filter.key] || 0})
            </option>
          ))}
        </select>
        <input
          className="ta-form-input"
          placeholder="Tìm theo ID, tên khóa học, nội dung..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="ta-table-scroll">
        <table className="ta-table">
          <thead><tr><th>ID</th><th>Loại</th><th>Khóa học</th><th>Nội dung</th><th>Trạng thái</th><th>Ghi chú admin</th><th>Ngày</th><th>Hành động</th></tr></thead>
          <tbody>
            {filteredChanges.length === 0 ? (
              <tr><td colSpan="8"><div className="ta-empty">Không có yêu cầu phù hợp bộ lọc</div></td></tr>
            ) : filteredChanges.map((change) => (
              <tr key={change.change_id}>
                <td>{change.change_id}</td>
                <td><span className="ta-badge ta-badge--info">{CHANGE_TYPE_LABELS[change.change_type] || change.change_type}</span></td>
                <td className="ta-text-bold">{change.course_name || change.course_id || change.target_id || '-'}</td>
                <td>{summarizeChange(change)}</td>
                <td>
                  <span className={`ta-badge ${change.status === 'approved' ? 'ta-badge--approved' : change.status === 'rejected' ? 'ta-badge--rejected' : 'ta-badge--pending'}`}>
                    {change.status === 'approved' ? 'Đã duyệt' : change.status === 'rejected' ? 'Bị từ chối' : 'Đang chờ'}
                  </span>
                </td>
                <td>
                  {change.review_note
                    ? <span className="ta-review-note">"{change.review_note}"</span>
                    : <span className="ta-text-muted">-</span>}
                </td>
                <td className="ta-text-muted">{new Date(change.requested_at || change.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="ta-actions">
                    {activeResubmitChangeId === change.change_id && (
                      <span className="ta-badge ta-badge--pending">Đang sửa</span>
                    )}
                    {['create_course', 'create_lesson', 'update_course', 'update_lesson', 'create_quiz'].includes(change.change_type)
                      && ['pending', 'rejected'].includes(change.status) && (
                      <button
                        className="ta-btn ta-btn--sm ta-btn--primary"
                        onClick={() => onResubmitChange?.(change)}
                      >
                        {change.status === 'rejected' ? 'Sửa lại' : 'Sửa'}
                      </button>
                    )}
                    {activeResubmitChangeId === change.change_id && (
                      <button
                        className="ta-btn ta-btn--sm ta-btn--outline"
                        onClick={() => {
                          const openCourseTab = ['create_course', 'update_course'].includes(change.change_type);
                          onTabChange?.(openCourseTab ? 'courses' : 'lessons');
                        }}
                      >
                        Mở form sửa
                      </button>
                    )}
                    {['pending', 'rejected'].includes(change.status) && (
                      <button
                        className="ta-btn ta-btn--sm ta-btn--danger"
                        onClick={() => onWithdrawChange?.(change)}
                      >
                        Thu hồi
                      </button>
                    )}
                    {!['pending', 'rejected'].includes(change.status) && (
                      <span className="ta-text-muted">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TeacherLocksTab({
  showLockForm,
  setShowLockForm,
  lockForm,
  setLockForm,
  lockRequests,
  submitLockRequest,
}) {
  return (
    <div>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Yêu cầu khóa tài khoản</h3>
          <button className="ta-btn ta-btn--primary" onClick={() => setShowLockForm(!showLockForm)}>+ Tạo yêu cầu</button>
        </div>

        {showLockForm && (
          <div className="ta-panel-body">
            <div className="ta-form-card">
              <h3>Gửi yêu cầu khóa/mở khóa</h3>
              <form onSubmit={submitLockRequest}>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Email người dùng <span className="ta-required">*</span></label>
                    <input className="ta-form-input" type="email" placeholder="vd: student@gmail.com" value={lockForm.targetEmail} onChange={(e) => setLockForm({ ...lockForm, targetEmail: e.target.value })} required />
                  </div>
                  <div>
                    <label className="ta-form-label">Loại yêu cầu</label>
                    <select className="ta-form-select" value={lockForm.requestType} onChange={(e) => setLockForm({ ...lockForm, requestType: e.target.value })}>
                      <option value="lock">Khóa tài khoản</option>
                      <option value="unlock">Mở khóa tài khoản</option>
                    </select>
                  </div>
                </div>
                <div className="ta-form-row">
                  <label className="ta-form-label">Lý do <span className="ta-required">*</span></label>
                  <textarea className="ta-form-textarea" rows="2" value={lockForm.reason} onChange={(e) => setLockForm({ ...lockForm, reason: e.target.value })} required />
                </div>
                <div className="ta-form-actions">
                  <button type="submit" className="ta-btn ta-btn--primary">Gửi</button>
                  <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowLockForm(false)}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead><tr><th>ID</th><th>Người dùng</th><th>Loại</th><th>Lý do</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
            <tbody>
              {lockRequests.length === 0 ? (
                <tr><td colSpan="6"><div className="ta-empty">Chưa có yêu cầu</div></td></tr>
              ) : lockRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td className="ta-text-bold">{request.target_name || request.user_id}</td>
                  <td><span className={`ta-badge ${request.request_type === 'lock' ? 'ta-badge--danger' : 'ta-badge--success'}`}>{request.request_type === 'lock' ? 'Khóa' : 'Mở khóa'}</span></td>
                  <td>{request.reason}</td>
                  <td>
                    <span className={`ta-badge ${request.status === 'approved' ? 'ta-badge--approved' : request.status === 'rejected' ? 'ta-badge--rejected' : 'ta-badge--pending'}`}>
                      {request.status === 'approved' ? 'Đã duyệt' : request.status === 'rejected' ? 'Bị từ chối' : 'Đang chờ'}
                    </span>
                  </td>
                  <td className="ta-text-muted">{new Date(request.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TeacherReviewsTab({ courses }) {
  return (
    <div>
      <h2>Quản lý đánh giá</h2>
      <ReviewManager role="teacher" courses={courses} />
    </div>
  );
}

function LessonsPanel({
  courses,
  selectedCourse,
  courseLessons,
  showLessonForm,
  lessonForm,
  setLessonForm,
  editingLesson,
  isResubmitMode,
  resubmitChangeId,
  openCreateLesson,
  openEditLesson,
  submitLesson,
  deleteLesson,
  onCancel,
}) {
  return (
    <div className="ta-table-wrap ta-table-wrap--spaced">
      <div className="ta-table-header">
        <h4 className="ta-table-title">Bài học</h4>
        <button className="ta-btn ta-btn--primary" onClick={() => openCreateLesson(selectedCourse)}>+ Thêm bài học</button>
      </div>

      {showLessonForm && (
        <div className="ta-panel-body">
          <div className="ta-form-card">
            {isResubmitMode && (
              <div className="ta-mb-12">
                <span className="ta-badge ta-badge--pending">Đang sửa request #{resubmitChangeId}</span>
              </div>
            )}
            <h3>{editingLesson ? 'Cập nhật bài học' : 'Tạo bài học mới'}</h3>
            <form onSubmit={submitLesson}>
              <div className="ta-form-row">
                <label className="ta-form-label">Khóa học <span className="ta-required">*</span></label>
                <select className="ta-form-select" value={lessonForm.course_id} onChange={(e) => setLessonForm({ ...lessonForm, course_id: e.target.value })} required>
                  <option value="">-- Chọn --</option>
                  {courses.map((course) => <option key={course.course_id} value={course.course_id}>{course.course_name}</option>)}
                </select>
              </div>
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Tên bài học <span className="ta-required">*</span></label>
                  <input className="ta-form-input" value={lessonForm.lesson_title} onChange={(e) => setLessonForm({ ...lessonForm, lesson_title: e.target.value })} required />
                </div>
                <div className="ta-narrow-field">
                  <label className="ta-form-label">Thứ tự</label>
                  <input className="ta-form-input" type="number" value={lessonForm.lesson_order} onChange={(e) => setLessonForm({ ...lessonForm, lesson_order: e.target.value })} />
                </div>
              </div>
              <div className="ta-form-row">
                <label className="ta-form-label">Video URL (YouTube)</label>
                <input className="ta-form-input" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div className="ta-form-row">
                <label className="ta-form-label">Nội dung</label>
                <textarea className="ta-form-textarea" rows="3" value={lessonForm.lesson_content} onChange={(e) => setLessonForm({ ...lessonForm, lesson_content: e.target.value })} />
              </div>
              <div className="ta-form-actions">
                <button type="submit" className="ta-btn ta-btn--primary">
                  {isResubmitMode
                    ? 'Cập nhật yêu cầu hiện tại'
                    : editingLesson
                      ? 'Gửi yêu cầu cập nhật'
                      : 'Gửi yêu cầu tạo'}
                </button>
                <button type="button" className="ta-btn ta-btn--outline" onClick={onCancel}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="ta-table-scroll">
        <table className="ta-table">
          <thead><tr><th>#</th><th>Tên bài học</th><th>Video</th><th>Hành động</th></tr></thead>
          <tbody>
            {courseLessons.length === 0 ? (
              <tr><td colSpan="4"><div className="ta-empty">Chưa có bài học</div></td></tr>
            ) : courseLessons.map((lesson, idx) => (
              <tr key={lesson.lesson_id}>
                <td>{lesson.lesson_order || idx + 1}</td>
                <td className="ta-text-bold">{lesson.lesson_title}</td>
                <td>{lesson.video_url ? <span className="ta-badge ta-badge--success">Có</span> : <span className="ta-badge ta-badge--warning">Chưa có</span>}</td>
                <td>
                  <div className="ta-actions">
                    <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => openEditLesson(lesson)}>Sửa</button>
                    <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteLesson(lesson.lesson_id)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuizzesPanel({
  courseQuizzes,
  showQuizForm,
  setShowQuizForm,
  quizForm,
  setQuizForm,
  isQuizResubmitMode,
  quizResubmitChangeId,
  emptyQuizForm,
  submitQuiz,
  deleteQuiz,
  addQuestion,
  removeQuestion,
  updateQuestion,
  updateOption,
}) {
  return (
    <div className="ta-table-wrap ta-table-wrap--spaced">
      <div className="ta-table-header">
        <h4 className="ta-table-title">Bài kiểm tra</h4>
        <button
          className="ta-btn ta-btn--primary"
          onClick={() => {
            setShowQuizForm(true);
            setQuizForm(emptyQuizForm);
          }}
        >
          + Tạo bài kiểm tra
        </button>
      </div>

      {showQuizForm && (
        <div className="ta-panel-body">
          <div className="ta-form-card">
            {isQuizResubmitMode && (
              <div className="ta-mb-12">
                <span className="ta-badge ta-badge--pending">Đang sửa request #{quizResubmitChangeId}</span>
              </div>
            )}
            <h3>{isQuizResubmitMode ? 'Cập nhật yêu cầu tạo bài kiểm tra' : 'Tạo bài kiểm tra mới'}</h3>
            <form onSubmit={submitQuiz}>
              <div className="ta-form-grid">
                <div>
                  <label className="ta-form-label">Tên bài kiểm tra <span className="ta-required">*</span></label>
                  <input className="ta-form-input" value={quizForm.quiz_title} onChange={(e) => setQuizForm({ ...quizForm, quiz_title: e.target.value })} required placeholder="VD: Kiểm tra cuối chương 1" />
                </div>
                <div className="ta-narrow-field">
                  <label className="ta-form-label">Thứ tự</label>
                  <input className="ta-form-input" type="number" min="1" value={quizForm.lesson_order} onChange={(e) => setQuizForm({ ...quizForm, lesson_order: Number(e.target.value) })} />
                </div>
              </div>
              <div className="ta-form-row">
                <label className="ta-form-label">Mô tả (tuỳ chọn)</label>
                <textarea className="ta-form-textarea" rows="2" value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} placeholder="Mô tả ngắn về bài kiểm tra..." />
              </div>

              <div className="ta-question-section">
                <div className="ta-question-header">
                  <label className="ta-form-label">Câu hỏi ({quizForm.questions.length})</label>
                  <button type="button" className="ta-btn ta-btn--sm ta-btn--outline" onClick={addQuestion}>+ Thêm câu hỏi</button>
                </div>

                {quizForm.questions.map((question, qIdx) => (
                  <div key={qIdx} className="ta-form-card ta-question-card">
                    <div className="ta-question-header">
                      <label className="ta-form-label ta-question-title">Câu {qIdx + 1}</label>
                      {quizForm.questions.length > 1 && (
                        <button type="button" className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => removeQuestion(qIdx)}>Xóa câu</button>
                      )}
                    </div>
                    <textarea
                      rows="2"
                      className="ta-form-textarea ta-question-textarea"
                      placeholder="Nhập nội dung câu hỏi..."
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIdx, e.target.value)}
                      required
                    />

                    <div className="ta-options-block">
                      <div className="ta-option-hint">Chọn đáp án đúng</div>
                      {question.options.map((option, oIdx) => (
                        <div key={oIdx} className="ta-option-row">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={option.is_correct}
                            onChange={() => updateOption(qIdx, oIdx, 'is_correct', true)}
                            className="ta-radio"
                          />
                          <input
                            className="ta-form-input ta-option-input"
                            placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                            value={option.option_text}
                            onChange={(e) => updateOption(qIdx, oIdx, 'option_text', e.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ta-form-actions">
                <button type="submit" className="ta-btn ta-btn--primary">
                  {isQuizResubmitMode ? 'Cập nhật yêu cầu hiện tại' : 'Gửi yêu cầu tạo'}
                </button>
                <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowQuizForm(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="ta-table-scroll">
        <table className="ta-table">
          <thead><tr><th>#</th><th>Tên bài kiểm tra</th><th>Số câu hỏi</th><th>Hành động</th></tr></thead>
          <tbody>
            {courseQuizzes.length === 0 ? (
              <tr><td colSpan="4"><div className="ta-empty">Chưa có bài kiểm tra</div></td></tr>
            ) : courseQuizzes.map((quiz) => (
              <tr key={quiz.quiz_id}>
                <td>{quiz.lesson_order}</td>
                <td className="ta-text-bold">{quiz.quiz_title}</td>
                <td><span className="ta-badge ta-badge--info">{quiz.question_count} câu</span></td>
                <td>
                  <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteQuiz(quiz.quiz_id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBannerCard({ tone = 'info', title, value, meta, actionLabel, onAction, highlight = false }) {
  return (
    <div className={`ta-action-card ta-action-card--${tone} ${highlight ? 'ta-action-card--pulse' : ''}`}>
      <div className="ta-action-card-head">
        <div className="ta-action-card-title">{title}</div>
        <span className="ta-action-card-value">{value}</span>
      </div>
      <div className="ta-action-card-meta">{meta}</div>
      <button
        type="button"
        className="ta-btn ta-btn--sm ta-btn--outline"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function MetricCard({ iconClass, label, value, icon, trend, trendDown }) {
  return (
    <div className="ta-metric-card">
      <div className={`ta-metric-icon ${iconClass}`}>
        <MetricIcon type={icon} />
      </div>
      <div className="ta-metric-body">
        <div className="ta-metric-label">{label}</div>
        <div className="ta-metric-value">{value}</div>
        {trend && (
          <span className={`ta-metric-trend ${trendDown ? 'ta-metric-trend--down' : 'ta-metric-trend--up'}`}>
            <MetricIcon type={trendDown ? 'down' : 'up'} small />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function MetricIcon({ type, small = false }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: small ? 2.4 : 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  if (type === 'users') return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  if (type === 'money') return <svg {...props}><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H7" /></svg>;
  if (type === 'trend') return <svg {...props}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-7" /></svg>;
  if (type === 'clock') return <svg {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
  if (type === 'book') return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
  if (type === 'card') return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
  if (type === 'up') return <svg viewBox="0 0 14 14" fill="none"><path d="M7 10.5v-7M4.5 6L7 3.5 9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'down') return <svg viewBox="0 0 14 14" fill="none"><path d="M7 3.5v7M4.5 8L7 10.5 9.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
}

function resolveCoursePreview(thumbnail) {
  if (thumbnail.startsWith('/uploads/') || thumbnail.startsWith('http')) return thumbnail;
  return `/uploads/course-images/${encodeURIComponent(thumbnail)}`;
}
