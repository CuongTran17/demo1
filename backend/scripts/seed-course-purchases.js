require('dotenv').config();

const db = require('../src/config/database');

const APPLY = process.argv.includes('--apply');
const MARKER = 'DEMO_COURSE_PURCHASE_SEED';

function daysAgo(index) {
  return Math.max(1, (index % 27) + 1);
}

async function loadState(executor = db) {
  const [courses] = await executor.execute(
    `SELECT c.course_id, c.course_name, c.price,
            COUNT(DISTINCT CASE
              WHEN o.status = 'completed' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              THEN o.user_id
            END) AS buyer_count
     FROM courses c
     LEFT JOIN order_items oi ON oi.course_id = c.course_id
     LEFT JOIN orders o ON o.order_id = oi.order_id
     GROUP BY c.course_id, c.course_name, c.price
     ORDER BY buyer_count ASC, c.course_name ASC`
  );
  const [students] = await executor.execute(
    `SELECT user_id, fullname, email
     FROM users
     WHERE role = 'student'
        OR (role IS NULL AND email <> 'admin@ptit.edu.vn' AND email NOT REGEXP '^teacher[0-9]*@ptit\\\\.edu\\\\.vn$')
     ORDER BY user_id`
  );
  const [completedPurchases] = await executor.execute(
    `SELECT DISTINCT o.user_id, oi.course_id
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.order_id
     WHERE o.status = 'completed'
       AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );

  return { courses, students, completedPurchases };
}

function buildPlan({ courses, students, completedPurchases }) {
  if (!courses.length) throw new Error('Database chưa có khóa học');
  if (!students.length) throw new Error('Database chưa có tài khoản học viên');

  const excluded = courses.find((course) => Number(course.buyer_count) === 0);
  if (!excluded) {
    throw new Error('Không có khóa học nào đang ở mức 0 lượt mua để giữ làm khóa ngoại lệ');
  }

  const purchased = new Set(completedPurchases.map((row) => `${row.user_id}:${row.course_id}`));
  const purchases = [];

  courses
    .filter((course) => course.course_id !== excluded.course_id)
    .forEach((course, courseIndex) => {
      const targetBuyers = 1;
      const currentBuyers = Number(course.buyer_count || 0);
      const needed = Math.max(0, targetBuyers - currentBuyers);

      for (let offset = 0; offset < students.length && purchases.filter((item) => item.courseId === course.course_id).length < needed; offset += 1) {
        const student = students[(courseIndex + offset) % students.length];
        const key = `${student.user_id}:${course.course_id}`;
        if (purchased.has(key)) continue;

        purchased.add(key);
        purchases.push({
          userId: student.user_id,
          email: student.email,
          courseId: course.course_id,
          courseName: course.course_name,
          price: Math.max(0, Math.round(Number(course.price || 0))),
          daysAgo: daysAgo(courseIndex + offset),
        });
      }
    });

  return { excluded, purchases };
}

async function applyPlan(plan) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const purchase of plan.purchases) {
      const [orderResult] = await conn.execute(
        `INSERT INTO orders (
           user_id, subtotal_amount, discount_amount, total_amount,
           payment_method, order_note, status, created_at
         ) VALUES (?, ?, 0, ?, 'bank_transfer', ?, 'completed', DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [purchase.userId, purchase.price, purchase.price, MARKER, purchase.daysAgo]
      );

      await conn.execute(
        'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)',
        [orderResult.insertId, purchase.courseId, purchase.price]
      );
      await conn.execute(
        `INSERT INTO user_courses (user_id, course_id, purchased_at)
         VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
         ON DUPLICATE KEY UPDATE purchased_at = VALUES(purchased_at)`,
        [purchase.userId, purchase.courseId, purchase.daysAgo]
      );
      await conn.execute(
        `INSERT IGNORE INTO course_progress
           (user_id, course_id, progress_percentage, total_hours, status)
         VALUES (?, ?, 0, 0, 'in_progress')`,
        [purchase.userId, purchase.courseId]
      );
    }

    await conn.execute(
      `UPDATE user_courses uc
       JOIN (
         SELECT o.user_id, oi.course_id, MAX(o.created_at) AS purchased_at
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.order_id
         WHERE o.status = 'completed' AND o.order_note = ?
         GROUP BY o.user_id, oi.course_id
       ) seeded ON seeded.user_id = uc.user_id AND seeded.course_id = uc.course_id
       SET uc.purchased_at = seeded.purchased_at`,
      [MARKER]
    );

    await conn.execute(
      `UPDATE courses c
       SET students_count = (
         SELECT COUNT(*) FROM user_courses uc WHERE uc.course_id = c.course_id
       )`
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function main() {
  const state = await loadState();
  const plan = buildPlan(state);

  console.log(`Khóa giữ ở mức 0 lượt mua: ${plan.excluded.course_name} (${plan.excluded.course_id})`);
  console.log(`Số lượt mua sẽ bổ sung: ${plan.purchases.length}`);

  const summary = new Map();
  for (const purchase of plan.purchases) {
    summary.set(purchase.courseName, (summary.get(purchase.courseName) || 0) + 1);
  }
  console.table([...summary].map(([course, purchases]) => ({ course, purchases })));

  if (!APPLY) {
    console.log('Dry-run hoàn tất. Chạy lại với --apply để ghi dữ liệu.');
    return;
  }

  await applyPlan(plan);
  console.log('Đã thêm dữ liệu mua hàng thành công.');
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(() => db.end());
