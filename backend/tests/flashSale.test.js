const test = require('node:test');
const assert = require('node:assert/strict');

const FlashSale = require('../src/models/FlashSale');

const now = new Date('2026-06-03T10:00:00.000Z');

test('getRuntimeStatus returns active only inside the configured window', () => {
  assert.equal(FlashSale.getRuntimeStatus({
    is_active: true,
    start_at: '2026-06-03T09:00:00.000Z',
    end_at: '2026-06-03T11:00:00.000Z',
  }, now), 'active');
});

test('getRuntimeStatus distinguishes scheduled expired and inactive sales', () => {
  assert.equal(FlashSale.getRuntimeStatus({
    is_active: true,
    start_at: '2026-06-03T11:00:00.000Z',
    end_at: '2026-06-03T12:00:00.000Z',
  }, now), 'scheduled');

  assert.equal(FlashSale.getRuntimeStatus({
    is_active: true,
    start_at: '2026-06-03T08:00:00.000Z',
    end_at: '2026-06-03T09:00:00.000Z',
  }, now), 'expired');

  assert.equal(FlashSale.getRuntimeStatus({
    is_active: false,
    start_at: '2026-06-03T09:00:00.000Z',
    end_at: '2026-06-03T11:00:00.000Z',
  }, now), 'inactive');
});

test('applyToItem returns the discounted price and original price for an eligible course', () => {
  const course = {
    course_id: 'course-1',
    category: 'python',
    price: 1000000,
  };
  const sale = {
    target_type: 'courses',
    course_ids: ['course-1'],
    discount_percentage: 25,
  };

  assert.deepEqual(FlashSale.applyToItem(course, sale), {
    ...course,
    original_price: 1000000,
    price: 750000,
    flash_sale_discount: 25,
  });
});
