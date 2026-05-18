const test = require('node:test');
const assert = require('node:assert/strict');
const CourseBundle = require('../src/models/CourseBundle');

test('allocateBundlePrice keeps item prices summing to bundle price', () => {
  const items = CourseBundle.allocateBundlePrice([
    { course_id: 'a', price: 300000 },
    { course_id: 'b', price: 700000 },
  ], 800000);

  assert.deepEqual(items.map((item) => item.bundle_item_price), [240000, 560000]);
  assert.equal(
    items.reduce((sum, item) => sum + item.bundle_item_price, 0),
    800000
  );
});

test('allocateBundlePrice splits zero-priced source items evenly', () => {
  const items = CourseBundle.allocateBundlePrice([
    { course_id: 'a', price: 0 },
    { course_id: 'b', price: 0 },
    { course_id: 'c', price: 0 },
  ], 100000);

  assert.deepEqual(items.map((item) => item.bundle_item_price), [33334, 33333, 33333]);
});
