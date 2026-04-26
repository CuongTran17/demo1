import { Fragment, useState } from 'react';
import { certificatesAPI } from '../../api';

export default function AdminCertificatesTab({ certSummary }) {
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [drillData, setDrillData] = useState({});
  const [drillLoading, setDrillLoading] = useState(null);

  const toggleCourse = async (courseId) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }

    setExpandedCourseId(courseId);

    if (drillData[courseId]) return;

    setDrillLoading(courseId);
    try {
      const res = await certificatesAPI.adminByCourse(courseId);
      setDrillData((prev) => ({ ...prev, [courseId]: res.data?.certificates || [] }));
    } catch {
      setDrillData((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setDrillLoading(null);
    }
  };

  if (certSummary.length === 0) {
    return (
      <div>
        <h2>Thống kê chứng chỉ</h2>
        <div className="ta-empty-state">
          <div className="ta-empty-icon">🏆</div>
          <h3>Chưa có chứng chỉ nào được cấp</h3>
          <p>Khi học viên hoàn thành 100% khóa học, chứng chỉ sẽ tự động được cấp.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Thống kê chứng chỉ</h2>
      <div className="ta-table-wrap">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Khóa học đã cấp chứng chỉ</h3>
          <span className="ta-text-muted">Nhấn vào hàng để xem danh sách học viên</span>
        </div>
        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead>
              <tr>
                <th className="ta-col-icon"></th>
                <th>Khóa học</th>
                <th>Danh mục</th>
                <th className="ta-cell-center">Số chứng chỉ đã cấp</th>
              </tr>
            </thead>
            <tbody>
              {certSummary.map((row) => {
                const isExpanded = expandedCourseId === row.course_id;
                const isLoading = drillLoading === row.course_id;
                const students = drillData[row.course_id];

                return (
                  <Fragment key={row.course_id}>
                    <tr
                      key={row.course_id}
                      className="ta-row-clickable"
                      onClick={() => toggleCourse(row.course_id)}
                    >
                      <td className="ta-expand-cell">
                        {isLoading ? (
                          <span className="ta-text-xs">...</span>
                        ) : (
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            width="14"
                            height="14"
                            className={`ta-expand-icon ${isExpanded ? 'ta-expand-icon--open' : ''}`}
                          >
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </td>
                      <td className="ta-text-bold">{row.course_name}</td>
                      <td><span className="ta-badge ta-badge--info">{row.category}</span></td>
                      <td className="ta-cell-center">
                        <span className="ta-badge ta-badge--success">{row.cert_count}</span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="ta-drill-cell">
                          <div className="ta-drill-content">
                            {isLoading || !students ? (
                              <p className="ta-text-muted ta-text-compact">Đang tải...</p>
                            ) : students.length === 0 ? (
                              <p className="ta-text-muted ta-text-compact">Không có dữ liệu học viên.</p>
                            ) : (
                              <table className="ta-table ta-table--nested">
                                <thead>
                                  <tr>
                                    <th>Học viên</th>
                                    <th>Email</th>
                                    <th>Ngày cấp</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {students.map((s) => (
                                    <tr key={s.cert_id}>
                                      <td className="ta-text-bold">{s.fullname}</td>
                                      <td>{s.email}</td>
                                      <td className="ta-text-muted">
                                        {s.issued_at ? new Date(s.issued_at).toLocaleDateString('vi-VN') : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
