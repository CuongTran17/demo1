import Chart from 'react-apexcharts';
import { formatPrice } from '../../utils/courseFormat';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const RANGE_OPTIONS = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'all', label: 'Tất cả' },
];

function RangeLabel(range) {
  return RANGE_OPTIONS.find((option) => option.key === range)?.label || 'Tháng';
}

function numberValue(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function percent(part, total) {
  const p = numberValue(part);
  const t = numberValue(total);
  return t > 0 ? `${Math.round((p / t) * 100)}%` : '0%';
}

function eventSummary(summary, eventType, field = 'total_events') {
  return numberValue(summary?.find((row) => row.event_type === eventType)?.[field]);
}

export default function AdminCustomerBehaviorTab({ data, range, onRangeChange }) {
  const summary = data?.summary || [];
  const courses = data?.courses || [];
  const interestClicks = eventSummary(summary, 'course_click');
  const uniqueInterested = eventSummary(summary, 'course_click', 'unique_people');
  const addToCart = eventSummary(summary, 'add_to_cart');
  const checkoutStart = eventSummary(summary, 'checkout_start');
  const completed = courses.reduce((sum, course) => sum + numberValue(course.completed_orders), 0);

  const funnelLabels = ['Quan tâm', 'Thêm giỏ', 'Checkout', 'Thanh toán'];
  const funnelValues = [interestClicks, addToCart, checkoutStart, completed];
  const exportRows = courses.map((course, index) => ({
    STT: index + 1,
    'Khoảng thời gian': RangeLabel(range),
    'Khóa học': course.course_name,
    'Quan tâm': numberValue(course.interest_clicks),
    'Người duy nhất': numberValue(course.unique_interested),
    'Thêm giỏ': numberValue(course.add_to_cart_count),
    Checkout: numberValue(course.checkout_start_count),
    'Thanh toán': numberValue(course.completed_orders),
    'Tỷ lệ quan tâm - giỏ': percent(course.add_to_cart_count, course.interest_clicks),
    'Tỷ lệ quan tâm - thanh toán': percent(course.completed_orders, course.interest_clicks),
    'Doanh thu (VNĐ)': numberValue(course.revenue),
  }));

  const handleExportExcel = () => {
    exportToExcel(exportRows, `BaoCaoHanhViKhachHang_${range}`);
  };

  const handleExportPDF = () => {
    exportToPDF(exportRows, `BaoCaoHanhViKhachHang_${range}`, `BÁO CÁO HÀNH VI KHÁCH HÀNG - ${RangeLabel(range)}`);
  };

  return (
    <div>
      <div className="ta-table-header ta-table-header--spread">
        <h2>Hành vi khách hàng</h2>
        <div className="ta-sort-group">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`ta-btn ta-btn--sm ${range === option.key ? 'ta-btn--primary' : 'ta-btn--outline'}`}
              onClick={() => onRangeChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ta-metrics-grid">
        <div className="ta-metric-card">
          <div className="ta-metric-body">
            <div className="ta-metric-label">Tổng lượt quan tâm</div>
            <div className="ta-metric-value">{interestClicks}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-body">
            <div className="ta-metric-label">Người quan tâm duy nhất</div>
            <div className="ta-metric-value">{uniqueInterested}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-body">
            <div className="ta-metric-label">Thêm vào giỏ</div>
            <div className="ta-metric-value">{addToCart}</div>
          </div>
        </div>
        <div className="ta-metric-card">
          <div className="ta-metric-body">
            <div className="ta-metric-label">Tỷ lệ thanh toán</div>
            <div className="ta-metric-value">{percent(completed, interestClicks)}</div>
          </div>
        </div>
      </div>

      <div className="ta-chart-card ta-chart-card--spaced">
        <div className="ta-chart-header">
          <h3 className="ta-chart-title">Funnel chuyển đổi</h3>
        </div>
        <Chart
          type="bar"
          height={280}
          options={{
            chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
            colors: ['#0ea5e9'],
            plotOptions: { bar: { borderRadius: 5, horizontal: true, barHeight: '54%' } },
            xaxis: { categories: funnelLabels },
            dataLabels: { enabled: true },
          }}
          series={[{ name: 'Số lượng', data: funnelValues }]}
        />
      </div>

      <div className="ta-table-wrap ta-table-wrap--spaced">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Theo khóa học</h3>
          <div className="ta-sort-group">
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportExcel} disabled={exportRows.length === 0}>
              Xuất Excel
            </button>
            <button className="ta-btn ta-btn--sm ta-btn--outline" onClick={handleExportPDF} disabled={exportRows.length === 0}>
              Xuất PDF
            </button>
          </div>
        </div>
        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Quan tâm</th>
                <th>Duy nhất</th>
                <th>Thêm giỏ</th>
                <th>Checkout</th>
                <th>Thanh toán</th>
                <th>Quan tâm - giỏ</th>
                <th>Quan tâm - thanh toán</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.course_id}>
                  <td className="ta-text-bold">{course.course_name}</td>
                  <td>{numberValue(course.interest_clicks)}</td>
                  <td>{numberValue(course.unique_interested)}</td>
                  <td>{numberValue(course.add_to_cart_count)}</td>
                  <td>{numberValue(course.checkout_start_count)}</td>
                  <td>{numberValue(course.completed_orders)}</td>
                  <td>{percent(course.add_to_cart_count, course.interest_clicks)}</td>
                  <td>{percent(course.completed_orders, course.interest_clicks)}</td>
                  <td className="ta-text-bold">{formatPrice(course.revenue)}</td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan="9" className="ta-text-muted">Chưa có dữ liệu trong khoảng thời gian này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
