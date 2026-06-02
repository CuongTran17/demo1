const test = require('node:test');
const assert = require('node:assert/strict');

const PendingChange = require('../src/models/PendingChange');

test('normalizeCourseSqlValue stores blank optional decimal values as null', () => {
  assert.equal(PendingChange._normalizeCourseSqlValue(''), null);
  assert.equal(PendingChange._normalizeCourseSqlValue('   '), null);
  assert.equal(PendingChange._normalizeCourseSqlValue(undefined), null);
  assert.equal(PendingChange._normalizeCourseSqlValue(null), null);
});

test('normalizeCourseSqlValue preserves non-blank values and custom fallback', () => {
  assert.equal(PendingChange._normalizeCourseSqlValue('100000'), '100000');
  assert.equal(PendingChange._normalizeCourseSqlValue(0), 0);
  assert.equal(PendingChange._normalizeCourseSqlValue(undefined, ''), '');
});
