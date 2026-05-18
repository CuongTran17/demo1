const test = require('node:test');
const assert = require('node:assert/strict');
const Notification = require('../src/models/Notification');

test('buildAbandonedCartDedupeKey is stable for the same user and cart course set', () => {
  const first = Notification.buildAbandonedCartDedupeKey(12, [
    { course_id: 'react-basic' },
    { course_id: 'node-api' },
  ]);
  const second = Notification.buildAbandonedCartDedupeKey(12, [
    { course_id: 'node-api' },
    { course_id: 'react-basic' },
  ]);

  assert.equal(first, 'abandoned_cart:12:node-api,react-basic');
  assert.equal(second, first);
});

test('buildAbandonedCartMessage includes item count and cart total', () => {
  const message = Notification.buildAbandonedCartMessage([
    { course_name: 'React co ban', price: 300000 },
    { course_name: 'Node API', price: 450000 },
  ]);

  assert.equal(
    message,
    'Ban con 2 khoa hoc trong gio hang voi tong gia tri 750.000 VND. Quay lai gio hang de hoan tat dang ky.'
  );
});
