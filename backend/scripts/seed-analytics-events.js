require('dotenv').config();
const db = require('../src/config/database');

const DEMO_PAGE_URL = 'seed://customer-behavior';
const DEMO_ORDER_NOTE = 'DEMO_ANALYTICS_SEED';

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function eventRowsForCourse(course, index, users) {
  const rows = [];
  const clickCount = Math.max(8, 36 - index * 6);
  const cartCount = Math.max(3, 18 - index * 4);
  const checkoutCount = Math.max(1, 10 - index * 2);

  for (let i = 0; i < clickCount; i += 1) {
    const user = users[i % Math.max(users.length, 1)];
    rows.push([
      'course_click',
      user?.user_id || null,
      user ? null : `demo-guest-${index}-${i % 9}`,
      course.course_id,
      null,
      JSON.stringify({ seed: true, source: 'demo_course_card' }),
      DEMO_PAGE_URL,
      'seed://admin-demo',
      'analytics-seed',
      daysAgo((i + index) % 7),
    ]);
  }

  for (let i = 0; i < cartCount; i += 1) {
    const user = users[(i + 1) % Math.max(users.length, 1)];
    rows.push([
      'add_to_cart',
      user?.user_id || null,
      user ? null : `demo-cart-guest-${index}-${i % 5}`,
      course.course_id,
      null,
      JSON.stringify({ seed: true, source: 'demo_course_detail' }),
      DEMO_PAGE_URL,
      'seed://admin-demo',
      'analytics-seed',
      daysAgo((i + index) % 7),
    ]);
  }

  for (let i = 0; i < checkoutCount; i += 1) {
    const user = users[(i + 2) % Math.max(users.length, 1)];
    rows.push([
      'checkout_start',
      user?.user_id || null,
      user ? null : `demo-checkout-guest-${index}-${i % 4}`,
      course.course_id,
      null,
      JSON.stringify({ seed: true, cartSize: 1 + (i % 3) }),
      DEMO_PAGE_URL,
      'seed://admin-demo',
      'analytics-seed',
      daysAgo((i + index) % 7),
    ]);
  }

  return rows;
}

async function resetDemoData(conn) {
  const [orders] = await conn.execute(
    'SELECT order_id FROM orders WHERE order_note = ?',
    [DEMO_ORDER_NOTE]
  );
  const orderIds = orders.map((row) => row.order_id);

  await conn.execute('DELETE FROM analytics_events WHERE page_url = ?', [DEMO_PAGE_URL]);

  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    await conn.execute(`DELETE FROM payment_approval_history WHERE order_id IN (${placeholders})`, orderIds);
    await conn.execute(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, orderIds);
    await conn.execute(`DELETE FROM orders WHERE order_id IN (${placeholders})`, orderIds);
  }
}

async function seedDemoOrders(conn, courses, users) {
  if (users.length === 0) return 0;

  let created = 0;
  const maxCourses = Math.min(courses.length, 4);

  for (let i = 0; i < maxCourses; i += 1) {
    const course = courses[i];
    const user = users[i % users.length];
    const orderTotal = Math.round(Number(course.price || 0)) || 100000;
    const [result] = await conn.execute(
      `INSERT INTO orders
       (user_id, subtotal_amount, discount_amount, total_amount, payment_method, order_note, status, created_at)
       VALUES (?, ?, 0, ?, 'sepay', ?, 'completed', ?)`,
      [user.user_id, orderTotal, orderTotal, DEMO_ORDER_NOTE, daysAgo(i)]
    );
    const orderId = result.insertId;
    await conn.execute(
      'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)',
      [orderId, course.course_id, orderTotal]
    );
    await conn.execute(
      `INSERT INTO analytics_events
       (event_type, user_id, course_id, order_id, metadata, page_url, referrer, user_agent, created_at)
       VALUES ('payment_completed', ?, ?, ?, ?, ?, 'seed://admin-demo', 'analytics-seed', ?)`,
      [
        user.user_id,
        course.course_id,
        orderId,
        JSON.stringify({ seed: true, source: 'demo_completed_order' }),
        DEMO_PAGE_URL,
        daysAgo(i),
      ]
    );
    created += 1;
  }

  return created;
}

async function main() {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await resetDemoData(conn);

    const [courses] = await conn.execute(
      `SELECT course_id, course_name, price
       FROM courses
       ORDER BY students_count DESC, created_at DESC
       LIMIT 5`
    );
    const [users] = await conn.execute(
      `SELECT user_id
       FROM users
       WHERE COALESCE(is_locked, 0) = 0
       ORDER BY user_id ASC
       LIMIT 8`
    );

    if (courses.length === 0) {
      throw new Error('No courses found. Add courses before seeding analytics.');
    }

    const eventRows = courses.flatMap((course, index) => eventRowsForCourse(course, index, users));
    await conn.query(
      `INSERT INTO analytics_events
       (event_type, user_id, anonymous_id, course_id, order_id, metadata, page_url, referrer, user_agent, created_at)
       VALUES ?`,
      [eventRows]
    );

    const orderCount = await seedDemoOrders(conn, courses, users);
    await conn.commit();

    console.log(`Seeded ${eventRows.length} demo analytics events for ${courses.length} courses.`);
    console.log(`Seeded ${orderCount} demo completed orders.`);
    console.log('Open Admin > Hành vi khách hàng and choose 7d or 30d.');
  } catch (err) {
    await conn.rollback();
    console.error('Seed analytics failed:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await db.end();
  }
}

main();
