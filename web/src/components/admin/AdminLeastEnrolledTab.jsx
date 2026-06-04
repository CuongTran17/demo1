import { useState } from 'react';
import Chart from 'react-apexcharts';
import { formatPrice } from '../../utils/courseFormat';

const RANGE_OPTIONS = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
  { key: 'all', label: 'Tất cả' },
];

function RangeLabel(range) {
  return RANGE_OPTIONS.find((option) => option.key === range)?.label || 'Tháng';
}

export default function AdminLeastEnrolledTab({ analytics, range = 'month', onRangeChange }) {
  const leastEnrolled = analytics?.leastEnrolled || [];

  return (
    <div>
      <div className="ta-table-header ta-table-header--spread">
        <h2>Top 5 khóa học có ít người đăng ký nhất</h2>
        <div className="ta-sort-group">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`ta-btn ta-btn--sm ${range === option.key ? 'ta-btn--primary' : 'ta-btn--outline'}`}
              onClick={() => onRangeChange?.(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {leastEnrolled.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 20 }}>
          <p style={{ color: '#64748b' }}>Không có dữ liệu khóa học trong khoảng thời gian này.</p>
        </div>
      ) : (
        <>
          {/* Column Chart */}
          <div className="ta-chart-card ta-chart-card--spaced-lg" style={{ marginTop: 24 }}>
            <div className="ta-chart-header">
              <h3 className="ta-chart-title">Biểu đồ cột số lượng đăng ký — {RangeLabel(range)}</h3>
            </div>
            <Chart
              type="bar"
              height={320}
              options={{
                chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
                colors: ['#ef4444'], // Red accent color for unpopular courses
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    horizontal: false, // Vertical column chart
                    columnWidth: '45%',
                    dataLabels: { position: 'top' }
                  }
                },
                xaxis: {
                  categories: leastEnrolled.map(c => c.course_name.length > 25 ? c.course_name.slice(0, 23) + '…' : c.course_name),
                  labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 } },
                },
                yaxis: {
                  labels: {
                    style: { colors: '#64748b', fontSize: '11px' },
                    formatter: (v) => Math.round(v),
                  },
                  tickAmount: Math.max(1, Math.max(...leastEnrolled.map(c => Number(c.enrollment_count)))),
                },
                dataLabels: {
                  enabled: true,
                  formatter: (v) => `${v} học viên`,
                  offsetY: -20,
                  style: { fontSize: '11px', colors: ['#475569'], fontWeight: 700 }
                },
                grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                tooltip: {
                  y: {
                    formatter: (v) => `${v} học viên đăng ký`,
                  },
                },
              }}
              series={[{
                name: 'Số lượng đăng ký',
                data: leastEnrolled.map(c => Number(c.enrollment_count || 0)),
              }]}
            />
          </div>

          {/* List/Table */}
          <div className="ta-table-wrap ta-table-wrap--spaced" style={{ marginTop: 24 }}>
            <div className="ta-table-header">
              <h3 className="ta-table-title">Danh sách chi tiết</h3>
            </div>
            <div className="ta-table-scroll">
              <table className="ta-table">
                <thead>
                  <tr>
                    <th className="ta-col-rank">Thứ hạng</th>
                    <th>Tên khóa học</th>
                    <th>Danh mục</th>
                    <th>Số học viên đăng ký</th>
                    <th>Giá bán</th>
                  </tr>
                </thead>
                <tbody>
                  {leastEnrolled.map((c, i) => (
                    <tr key={c.course_id}>
                      <td className="ta-rank-cell ta-rank-cell--top" style={{ background: '#fee2e2', color: '#ef4444' }}>
                        {i + 1}
                      </td>
                      <td className="ta-text-bold">{c.course_name}</td>
                      <td><span className="ta-badge ta-badge--info">{c.category || 'Khác'}</span></td>
                      <td className="ta-text-bold" style={{ color: '#ef4444' }}>{Number(c.enrollment_count) || 0} học viên</td>
                      <td>{formatPrice(c.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
