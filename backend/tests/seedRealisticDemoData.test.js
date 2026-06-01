const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NEVER_WRITE_TABLES,
  buildSeedPlan,
  getEnsureTableSql,
  parseArgs,
} = require('../scripts/seed-realistic-demo-data');

test('parseArgs defaults to dry run and requires --apply for writes', () => {
  assert.equal(parseArgs([]).apply, false);
  assert.equal(parseArgs(['--apply']).apply, true);
  assert.equal(parseArgs([]).includeCourses, false);
  assert.equal(parseArgs(['--include-courses']).includeCourses, true);
});

test('buildSeedPlan never targets course ownership or progress tables', () => {
  const counts = {
    courses: 0,
    lessons: 0,
    teacher_courses: 0,
    user_courses: 0,
    course_progress: 0,
    lesson_progress: 0,
    blogs: 0,
    contact_messages: 0,
  };

  const plan = buildSeedPlan(counts);
  const plannedTables = plan.map((item) => item.table);

  for (const table of NEVER_WRITE_TABLES) {
    assert.equal(plannedTables.includes(table), false);
  }
  assert.equal(plannedTables.includes('blogs'), true);
  assert.equal(plannedTables.includes('contact_messages'), true);
});

test('buildSeedPlan only targets courses when includeCourses is enabled', () => {
  const counts = {
    courses: 0,
    blogs: 3,
    contact_messages: 3,
  };

  assert.equal(buildSeedPlan(counts).some((item) => item.table === 'courses'), false);
  assert.equal(
    buildSeedPlan(counts, { includeCourses: true }).some((item) => item.table === 'courses'),
    true
  );
});

test('buildSeedPlan skips optional dependent tables when prerequisites are missing', () => {
  const plan = buildSeedPlan({
    users: 0,
    courses: 0,
    course_bundles: 0,
    reviews: 0,
    wishlist: 0,
    bundle_reviews: 0,
    cart_bundles: 0,
    cart_upsell_discounts: 0,
    flash_sales: 0,
    flash_sale_courses: 0,
  });

  const dependentTables = [
    'wishlist',
    'reviews',
    'bundle_reviews',
    'cart_bundles',
    'cart_upsell_discounts',
    'flash_sale_courses',
  ];
  const plannedTables = plan.map((item) => item.table);

  for (const table of dependentTables) {
    assert.equal(plannedTables.includes(table), false);
  }
});

test('getEnsureTableSql can create support tables but not protected course tables', () => {
  assert.match(getEnsureTableSql('blogs'), /CREATE TABLE IF NOT EXISTS blogs/);
  assert.match(getEnsureTableSql('wishlist'), /CREATE TABLE IF NOT EXISTS wishlist/);

  for (const table of NEVER_WRITE_TABLES) {
    assert.equal(getEnsureTableSql(table), null);
  }
});
