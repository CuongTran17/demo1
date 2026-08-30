const test = require('node:test');
const assert = require('node:assert/strict');

const AdminReport = require('../src/models/AdminReport');

test('buildEnrollmentRange uses a quick range when custom dates are absent', () => {
  assert.deepEqual(AdminReport.buildEnrollmentRange({ range: 'week' }), {
    key: 'week',
    label: '7 ngày gần nhất',
    where: 'uc.purchased_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    params: [],
    startDate: null,
    endDate: null,
  });
});

test('buildEnrollmentRange prioritizes and validates a custom date range', () => {
  assert.deepEqual(AdminReport.buildEnrollmentRange({
    range: 'month',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
  }), {
    key: 'custom',
    label: '01/05/2026 - 31/05/2026',
    where: 'uc.purchased_at >= ? AND uc.purchased_at < DATE_ADD(?, INTERVAL 1 DAY)',
    params: ['2026-05-01', '2026-05-31'],
    startDate: '2026-05-01',
    endDate: '2026-05-31',
  });

  assert.throws(
    () => AdminReport.buildEnrollmentRange({ startDate: '2026-06-01', endDate: '2026-05-01' }),
    /Ngày bắt đầu không được sau ngày kết thúc/
  );
});
