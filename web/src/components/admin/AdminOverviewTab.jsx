import Chart from 'react-apexcharts';
import { formatPrice } from '../../utils/courseFormat';

const MEDAL = ['🥇', '🥈', '🥉'];

function MonthLabel(ym) {
  if (!ym) return '';
  const [y, m] = String(ym).split('-');
  const names = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
  return `${names[Number(m) - 1] || m}/${(y || '').slice(2)}`;
}

function safeNum(v) {
  const n = parseFloat(String(v));
  return isFinite(n) ? n : 0;
}

export default function AdminOverviewTab({ stats, revenue, analytics, pendingChanges, pendingOrders, lockRequests, onTabChange }) {
  const monthly = analytics?.monthlyRevenue || [];
  const categories = analytics?.categoryStats || [];
  const topCourses = (analytics?.courseRanking || []).slice(0, 5);
  const courseRequests = pendingChanges.filter((change) => change.change_type?.includes('course')).length;
  const contentRequests = pendingChanges.filter((change) => change.change_type?.includes('lesson') || change.change_type?.includes('quiz')).length;
  const pendingLockRequests = lockRequests.filter((request) => request.status === 'pending' || !request.status).length;

  return (
    <div>
      <h2>Tổng quan hệ thống</h2>

      <div className="ta-action-banners">
        <ActionBannerCard
          tone="danger"
          title="Đơn hàng chờ IPN"
          value={pendingOrders.length}
          meta="Theo dõi các giao dịch chưa nhận callback hoặc chưa hoàn tất trạng thái."
          actionLabel="Xem đơn hàng"
          onAction={() => onTabChange('orders')}
          highlight={pendingOrders.length > 0}
        />
        <ActionBannerCard
          tone="warning"
          title="Cần duyệt nội dung"
          value={pendingChanges.length}
          meta={`${courseRequests} yêu cầu khóa học, ${contentRequests} yêu cầu bài học hoặc quiz.`}
          actionLabel="Mở hàng đợi"
          onAction={() => onTabChange('changes')}
          highlight={pendingChanges.length > 0}
        />
        <ActionBannerCard
          tone="info"
          title="Yêu cầu khóa tài khoản"
          value={pendingLockRequests}
          meta="Các yêu cầu khóa hoặc mở khóa tài khoản cần admin phản hồi."
          actionLabel="Xử lý yêu cầu"
          onAction={() => onTabChange('locks')}
          highlight={pendingLockRequests > 0}
        />
      </div>

      <div className="ta-metrics-grid">
        <div className="ta-metric-card">
          <div className="ta-metric-icon ta-metric-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="ta-metric-body">
            <div className="ta-metric-label">Người dùng</div>
            <div className="ta-metric-value">{stats.totalUsers}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-icon ta-metric-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div className="ta-metric-body">
            <div className="ta-metric-label">Giảng viên</div>
            <div className="ta-metric-value">{stats.totalTeachers}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-icon ta-metric-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div className="ta-metric-body">
            <div className="ta-metric-label">Khóa học</div>
            <div className="ta-metric-value">{stats.totalCourses}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-icon ta-metric-icon--cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="ta-metric-body">
            <div className="ta-metric-label">Tổng doanh thu</div>
            <div className="ta-metric-value">{formatPrice(stats.totalRevenue)}</div>
            <span className="ta-metric-trend ta-metric-trend--up">
              <svg viewBox="0 0 14 14" fill="none"><path d="M7 10.5v-7M4.5 6L7 3.5 9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Doanh thu
            </span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className={`ta-chart-grid ${monthly.length > 0 ? 'ta-chart-grid--with-side' : ''}`}>

        {/* Monthly revenue area chart */}
        {monthly.length > 0 && (
          <div className="ta-chart-card">
            <div className="ta-chart-header">
              <h3 className="ta-chart-title">Doanh thu 6 tháng gần nhất</h3>
            </div>
            <Chart
              type="area"
              height={260}
              options={{
                chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false }, zoom: { enabled: false } },
                colors: ['#3b82f6'],
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
                stroke: { curve: 'smooth', width: 2 },
                xaxis: {
                  categories: monthly.map(d => MonthLabel(d.month)),
                  labels: { style: { colors: '#64748b', fontSize: '12px' } },
                },
                yaxis: {
                  labels: {
                    style: { colors: '#64748b', fontSize: '11px' },
                    formatter: (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v,
                  },
                },
                dataLabels: { enabled: false },
                grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                tooltip: { y: { formatter: (v) => formatPrice(v) } },
                markers: { size: 4, colors: ['#3b82f6'], strokeColors: '#fff', strokeWidth: 2 },
              }}
              series={[{ name: 'Doanh thu', data: monthly.map(d => safeNum(d.revenue)) }]}
            />
          </div>
        )}

        {/* Category donut */}
        {categories.length > 0 && (
          <div className="ta-chart-card">
            <div className="ta-chart-header">
              <h3 className="ta-chart-title">Học viên theo danh mục</h3>
            </div>
            <Chart
              type="donut"
              height={260}
              options={{
                chart: { fontFamily: 'Be Vietnam Pro, sans-serif' },
                labels: categories.map(c => c.category || 'Khác'),
                colors: ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'],
                legend: { position: 'bottom', fontSize: '12px', fontFamily: 'Be Vietnam Pro, sans-serif' },
                dataLabels: { enabled: false },
                plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Học viên', formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0) } } } } },
                tooltip: { y: { formatter: (v) => `${v} học viên` } },
              }}
              series={categories.map(c => safeNum(c.student_count))}
            />
          </div>
        )}
      </div>

      {/* Top 5 courses mini-table */}
      {topCourses.length > 0 && (
        <div className="ta-table-wrap ta-table-wrap--spaced-lg">
          <div className="ta-chart-header ta-chart-header--in-table">
            <h3 className="ta-chart-title">Top 5 khóa học phổ biến</h3>
          </div>
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>#</th><th>Tên khóa học</th><th>Danh mục</th><th>Học viên</th><th>Đánh giá</th><th>Doanh thu</th></tr>
              </thead>
              <tbody>
                {topCourses.map((c, i) => (
                  <tr key={c.course_id}>
                    <td className="ta-rank-cell--top">{MEDAL[i] || i + 1}</td>
                    <td className="ta-text-bold">{c.course_name}</td>
                    <td><span className="ta-badge ta-badge--info">{c.category || 'Khác'}</span></td>
                    <td>{Number(c.enrollment_count) || 0}</td>
                    <td>
                      {Number(c.average_rating) > 0
                        ? <span className="ta-rating-text">★ {c.average_rating}</span>
                        : <span className="ta-text-muted">-</span>}
                    </td>
                    <td className="ta-text-bold">{formatPrice(c.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy user spend chart */}
      {revenue?.details?.length > 0 && (
        <div className="ta-chart-card ta-chart-card--spaced-lg">
          <div className="ta-chart-header">
            <h3 className="ta-chart-title">Top học viên chi tiêu nhiều nhất</h3>
          </div>
          <Chart
            type="bar"
            height={260}
            options={{
              chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
              colors: ['#22c55e'],
              plotOptions: { bar: { borderRadius: 5, columnWidth: '50%' } },
              xaxis: {
                categories: revenue.details.slice(0, 8).map(d => (d.fullname || d.email || '').split(' ').pop()),
                labels: { style: { colors: '#64748b', fontSize: '12px' } },
              },
              yaxis: {
                labels: {
                  style: { colors: '#64748b', fontSize: '11px' },
                  formatter: (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v,
                },
              },
              dataLabels: { enabled: false },
              grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
              tooltip: { y: { formatter: (v) => formatPrice(v) } },
            }}
            series={[{ name: 'Chi tiêu', data: revenue.details.slice(0, 8).map(d => safeNum(d.total_spent)) }]}
          />
        </div>
      )}
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
