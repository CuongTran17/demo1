const db = require('../config/database');

function parseDate(value) {
  const normalized = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized;
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

class AdminReport {
  static buildEnrollmentRange({ range = 'month', startDate, endDate } = {}) {
    const normalizedStart = parseDate(startDate);
    const normalizedEnd = parseDate(endDate);

    if (startDate || endDate) {
      if (!normalizedStart || !normalizedEnd) {
        throw Object.assign(new Error('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc'), { status: 400 });
      }
      if (normalizedStart > normalizedEnd) {
        throw Object.assign(new Error('Ngày bắt đầu không được sau ngày kết thúc'), { status: 400 });
      }
      return {
        key: 'custom',
        label: `${formatDate(normalizedStart)} - ${formatDate(normalizedEnd)}`,
        where: 'uc.purchased_at >= ? AND uc.purchased_at < DATE_ADD(?, INTERVAL 1 DAY)',
        params: [normalizedStart, normalizedEnd],
        startDate: normalizedStart,
        endDate: normalizedEnd,
      };
    }

    const ranges = {
      day: {
        label: 'Hôm nay',
        where: 'DATE(uc.purchased_at) = CURDATE()',
      },
      week: {
        label: '7 ngày gần nhất',
        where: 'uc.purchased_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      },
      month: {
        label: '30 ngày gần nhất',
        where: 'uc.purchased_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      },
      quarter: {
        label: '90 ngày gần nhất',
        where: 'uc.purchased_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)',
      },
      all: {
        label: 'Tất cả thời gian',
        where: '1=1',
      },
    };
    const key = ranges[range] ? range : 'month';

    return {
      key,
      label: ranges[key].label,
      where: ranges[key].where,
      params: [],
      startDate: null,
      endDate: null,
    };
  }

  static async getLeastEnrolledCourses(filters = {}) {
    const range = this.buildEnrollmentRange(filters);
    const [courses] = await db.execute(
      `SELECT c.course_id,
              c.course_name,
              c.category,
              COUNT(DISTINCT uc.user_id) AS enrollment_count,
              MAX(uc.purchased_at) AS latest_enrollment_at
       FROM courses c
       LEFT JOIN user_courses uc
         ON uc.course_id = c.course_id
        AND ${range.where}
       GROUP BY c.course_id, c.course_name, c.category
       ORDER BY enrollment_count ASC, c.course_name ASC
       LIMIT 5`,
      range.params
    );

    return { range, courses };
  }
}

module.exports = AdminReport;
