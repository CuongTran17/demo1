import { useState } from 'react';
import Chart from 'react-apexcharts';
import { formatPrice } from '../../utils/courseFormat';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

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

const SORT_OPTIONS = [
  { key: 'enrollment_count', label: 'Học viên' },
  { key: 'total_revenue', label: 'Doanh thu' },
  { key: 'average_rating', label: 'Đánh giá' },
];

export default function AdminRevenueTab({ revenue, analytics }) {
  const [sortBy, setSortBy] = useState('enrollment_count');
  const monthly = analytics?.monthlyRevenue || [];
  const allCourses = analytics?.courseRanking || [];

  const sorted = [...allCourses].sort((a, b) => safeNum(b[sortBy]) - safeNum(a[sortBy]));
  const chartTop = sorted.slice(0, 8);

  const totalOrders = monthly.reduce((s, d) => s + safeNum(d.orders), 0);

  const handleExportExcel = () => {
    const exportData = sorted.map((c, i) => ({
      'STT': i + 1,
      'Tên khóa học': c.course_name,
      'Danh mục': c.category || 'Khác',
      'Học viên': Number(c.enrollment_count) || 0,
      'Doanh thu (VNĐ)': Number(c.total_revenue) || 0,
      'Đánh giá': Number(c.average_rating) || 0,
      'Giá niêm yết (VNĐ)': Number(c.price) || 0
    }));
    exportToExcel(exportData, 'BaoCaoDoanhThu_KhoaHoc');
  };

  const handleExportPDF = () => {
    const exportData = sorted.map((c, i) => ({
      'STT': i + 1,
      'Tên khóa học': c.course_name,
      'Danh mục': c.category || 'Khác',
      'Học viên': Number(c.enrollment_count) || 0,
      'Doanh thu (VNĐ)': Number(c.total_revenue).toLocaleString('vi-VN'),
      'Đánh giá': Number(c.average_rating) || 0,
      'Giá niêm yết (VNĐ)': Number(c.price).toLocaleString('vi-VN')
    }));
    exportToPDF(exportData, 'BaoCaoDoanhThu_KhoaHoc', 'BÁO CÁO DOANH THU THEO KHÓA HỌC');
  };

  return (
    <div>
      <h2>Báo cáo doanh thu</h2>

      {/* Stat cards */}
      <div className="ta-metrics-grid">
        <div className="ta-metric-card">
          <div className="ta-metric-icon ta-metric-icon--cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="ta-metric-body">
            <div className="ta-metric-label">Tổng doanh thu</div>
            <div className="ta-metric-value">{formatPrice(revenue?.total || 0)}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-icon ta-metric-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="ta-metric-body">
            <div className="ta-metric-label">Giao dịch thành công</div>
            <div className="ta-metric-value">{revenue?.details?.length || 0}</div>
          </div>
        </div>
        {totalOrders > 0 && (
          <div className="ta-metric-card">
            <div className="ta-metric-icon ta-metric-icon--purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-7"/></svg>
            </div>
            <div className="ta-metric-body">
              <div className="ta-metric-label">Đơn (6 tháng)</div>
              <div className="ta-metric-value">{totalOrders}</div>
            </div>
          </div>
        )}
        {sorted[0]?.enrollment_count > 0 && (
          <div className="ta-metric-card">
            <div className="ta-metric-icon ta-metric-icon--orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div className="ta-metric-body">
              <div className="ta-metric-label">Khoá học phổ biến nhất</div>
              <div className="ta-metric-note">{sorted[0]?.course_name || '-'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly trend chart */}
      {monthly.length > 0 && (
        <div className="ta-chart-card ta-chart-card--spaced-lg">
          <div className="ta-chart-header">
            <h3 className="ta-chart-title">Xu hướng doanh thu theo tháng</h3>
          </div>
          <Chart
            type="area"
            height={280}
            options={{
              chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false }, zoom: { enabled: false } },
              colors: ['#3b82f6'],
              fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
              stroke: { curve: 'smooth', width: 2.5 },
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
              tooltip: {
                y: { formatter: (v) => formatPrice(v) },
                shared: true,
              },
              markers: { size: 5, colors: ['#3b82f6'], strokeColors: '#fff', strokeWidth: 2 },
            }}
            series={[{ name: 'Doanh thu', data: monthly.map(d => safeNum(d.revenue)) }]}
          />
        </div>
      )}

      {/* Course ranking bar chart */}
      {chartTop.length > 0 && (
        <div className="ta-chart-card ta-chart-card--spaced">
          <div className="ta-chart-header ta-chart-header--spread">
            <h3 className="ta-chart-title">Biểu đồ khóa học — {SORT_OPTIONS.find(o => o.key === sortBy)?.label}</h3>
            <div className="ta-sort-group">
              {SORT_OPTIONS.map(o => (
                <button key={o.key} className={`ta-btn ta-btn--sm ${sortBy === o.key ? 'ta-btn--primary' : 'ta-btn--outline'}`} onClick={() => setSortBy(o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <Chart
            type="bar"
            height={280}
            options={{
              chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
              colors: ['#8b5cf6'],
              plotOptions: { bar: { borderRadius: 5, horizontal: true, barHeight: '60%' } },
              xaxis: {
                categories: chartTop.map(c => c.course_name.length > 28 ? c.course_name.slice(0, 26) + '…' : c.course_name),
                labels: { style: { colors: '#64748b', fontSize: '11px' },
                  formatter: (v) => sortBy === 'total_revenue'
                    ? (v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v)
                    : v,
                },
              },
              yaxis: { labels: { style: { colors: '#475569', fontSize: '12px' } } },
              dataLabels: { enabled: false },
              grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
              tooltip: {
                y: {
                  formatter: (v) => sortBy === 'total_revenue'
                    ? formatPrice(v)
                    : sortBy === 'average_rating'
                    ? `★ ${v}`
                    : `${v} học viên`,
                },
              },
            }}
            series={[{
              name: SORT_OPTIONS.find(o => o.key === sortBy)?.label,
              data: chartTop.map(c => safeNum(c[sortBy])),
            }]}
          />
        </div>
      )}

      {/* Course ranking table */}
      {allCourses.length > 0 && (
        <div className="ta-table-wrap ta-table-wrap--spaced">
          <div className="ta-table-header ta-table-header--spread">
            <h3 className="ta-chart-title">Bảng xếp hạng khóa học</h3>
            <div className="ta-sort-group">
              <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportExcel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Xuất Excel
              </button>
              <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportPDF}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Xuất PDF
              </button>
              <div style={{width: 8}}></div>
              <span className="ta-sort-label">Sắp xếp theo:</span>
              {SORT_OPTIONS.map(o => (
                <button key={o.key} className={`ta-btn ta-btn--sm ${sortBy === o.key ? 'ta-btn--primary' : 'ta-btn--outline'}`} onClick={() => setSortBy(o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr>
                  <th className="ta-col-rank">#</th>
                  <th>Tên khóa học</th>
                  <th>Danh mục</th>
                  <th
                    className={`ta-sort-th ${sortBy === 'enrollment_count' ? 'ta-sort-th--active' : ''}`}
                    onClick={() => setSortBy('enrollment_count')}
                  >Học viên {sortBy === 'enrollment_count' && <span className="ta-sort-indicator">v</span>}</th>
                  <th
                    className={`ta-sort-th ${sortBy === 'total_revenue' ? 'ta-sort-th--active' : ''}`}
                    onClick={() => setSortBy('total_revenue')}
                  >Doanh thu {sortBy === 'total_revenue' && <span className="ta-sort-indicator">v</span>}</th>
                  <th
                    className={`ta-sort-th ${sortBy === 'average_rating' ? 'ta-sort-th--active' : ''}`}
                    onClick={() => setSortBy('average_rating')}
                  >Đánh giá {sortBy === 'average_rating' && <span className="ta-sort-indicator">v</span>}</th>
                  <th>Giá niêm yết</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => (
                  <tr key={c.course_id}>
                    <td className={`ta-rank-cell ${i < 3 ? 'ta-rank-cell--top' : ''}`}>
                      {i + 1}
                    </td>
                    <td className="ta-text-bold">{c.course_name}</td>
                    <td><span className="ta-badge ta-badge--info">{c.category || 'Khác'}</span></td>
                    <td>{Number(c.enrollment_count) || 0}</td>
                    <td className="ta-text-bold">{formatPrice(c.total_revenue)}</td>
                    <td>
                      {Number(c.average_rating) > 0
                        ? <span className="ta-rating-text">★ {c.average_rating} <span className="ta-rating-count">({c.review_count})</span></span>
                        : <span className="ta-text-muted">Chưa có</span>}
                    </td>
                    <td>{formatPrice(c.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User spending table */}
      {revenue?.details?.length > 0 && (
        <div className="ta-table-wrap ta-table-wrap--spaced">
          <div className="ta-table-header">
            <h3 className="ta-table-title">Chi tiết theo học viên</h3>
          </div>
          <div className="ta-table-scroll">
            <table className="ta-table">
              <thead>
                <tr><th>#</th><th>Người dùng</th><th>Số đơn</th><th>Tổng chi</th></tr>
              </thead>
              <tbody>
                {revenue.details.map((d, i) => (
                  <tr key={i}>
                    <td className="ta-text-muted">{i + 1}</td>
                    <td className="ta-text-bold">{d.fullname || d.email}</td>
                    <td>{d.order_count}</td>
                    <td className="ta-text-bold">{formatPrice(d.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
