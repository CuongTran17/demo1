require('dotenv').config();

const mysql = require('mysql2/promise');

const SEED_MARKER = 'DEMO_REALISTIC_SEED';
const LOW_DATA_LIMIT = 3;

const NEVER_WRITE_TABLES = Object.freeze([
  'courses',
  'lessons',
  'teacher_courses',
  'user_courses',
  'course_progress',
  'lesson_progress',
  'order_items',
  'orders',
  'certificates',
]);

const TABLES_TO_COUNT = Object.freeze([
  'users',
  'courses',
  'blogs',
  'contact_messages',
  'wishlist',
  'reviews',
  'notifications',
  'course_bundles',
  'bundle_reviews',
  'cart_bundles',
  'cart_upsell_discounts',
  'flash_sales',
  'flash_sale_courses',
]);

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes('--apply'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function shouldTopUp(count, minimum = LOW_DATA_LIMIT) {
  return Number(count || 0) < minimum;
}

function hasData(counts, table) {
  return Number(counts[table] || 0) > 0;
}

function buildSeedPlan(counts) {
  const plan = [];
  const add = (table, reason) => {
    if (!NEVER_WRITE_TABLES.includes(table)) {
      plan.push({ table, reason });
    }
  };

  if (shouldTopUp(counts.blogs)) {
    add('blogs', 'bai viet dang trong hoac qua it');
  }
  if (shouldTopUp(counts.contact_messages)) {
    add('contact_messages', 'lien he dang trong hoac qua it');
  }

  if (hasData(counts, 'users') && hasData(counts, 'courses')) {
    if (shouldTopUp(counts.wishlist)) add('wishlist', 'can du lieu yeu thich khoa hoc');
    if (shouldTopUp(counts.reviews)) add('reviews', 'can danh gia khoa hoc mau');
    if (shouldTopUp(counts.cart_upsell_discounts)) {
      add('cart_upsell_discounts', 'can uu dai goi y gio hang');
    }
  }

  if (hasData(counts, 'users')) {
    if (shouldTopUp(counts.notifications)) add('notifications', 'can thong bao mau cho nguoi dung');
  }

  if (hasData(counts, 'users') && hasData(counts, 'course_bundles')) {
    if (shouldTopUp(counts.bundle_reviews)) add('bundle_reviews', 'can danh gia combo khoa hoc');
    if (shouldTopUp(counts.cart_bundles)) add('cart_bundles', 'can gio hang combo mau');
  }

  if (hasData(counts, 'courses') && hasData(counts, 'flash_sales')) {
    if (shouldTopUp(counts.flash_sale_courses)) {
      add('flash_sale_courses', 'can lien ket flash sale voi khoa hoc san co');
    }
  }

  return plan;
}

function getConnectionConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ptit_learning',
    charset: 'utf8mb4',
  };
}

async function getExistingTables(conn) {
  const [rows] = await conn.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
  );
  return new Set(rows.map((row) => row.TABLE_NAME));
}

async function getTableCounts(conn, tables = TABLES_TO_COUNT) {
  const existingTables = await getExistingTables(conn);
  const counts = {};

  for (const table of tables) {
    if (!existingTables.has(table)) {
      counts[table] = 0;
      continue;
    }
    const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM ${mysql.escapeId(table)}`);
    counts[table] = Number(rows[0]?.count || 0);
  }

  return counts;
}

async function getAdminUserId(conn) {
  const [rows] = await conn.execute(
    `SELECT user_id
     FROM users
     WHERE role = 'admin' OR email LIKE 'admin%'
     ORDER BY user_id ASC
     LIMIT 1`
  );
  return rows[0]?.user_id || null;
}

async function getUsers(conn, limit = 8) {
  const [rows] = await conn.execute(
    `SELECT user_id, fullname, email
     FROM users
     WHERE COALESCE(is_locked, 0) = 0
     ORDER BY user_id ASC
     LIMIT ${Number(limit)}`
  );
  return rows;
}

async function getCourses(conn, limit = 8) {
  const [rows] = await conn.execute(
    `SELECT course_id, course_name, category, price
     FROM courses
     ORDER BY students_count DESC, created_at DESC
     LIMIT ${Number(limit)}`
  );
  return rows;
}

async function getBundles(conn, limit = 4) {
  const [rows] = await conn.execute(
    `SELECT bundle_id, bundle_name
     FROM course_bundles
     WHERE is_active = 1
     ORDER BY bundle_id ASC
     LIMIT ${Number(limit)}`
  );
  return rows;
}

async function seedBlogs(conn) {
  const adminId = await getAdminUserId(conn);
  const blogs = [
    {
      title: 'Lo trinh hoc truc tuyen hieu qua cho nguoi moi',
      slug: 'lo-trinh-hoc-truc-tuyen-hieu-qua',
      excerpt: 'Cach sap xep muc tieu, thoi gian va bai tap de hoc online deu dan hon.',
      content: `${SEED_MARKER}\n\nHoc truc tuyen hieu qua bat dau tu viec chia nho muc tieu theo tung tuan, ghi lai tien do va uu tien thuc hanh sau moi bai hoc.`,
    },
    {
      title: 'Cach chon khoa hoc phu hop voi muc tieu nghe nghiep',
      slug: 'cach-chon-khoa-hoc-phu-hop',
      excerpt: 'Mot vai tieu chi giup hoc vien doc danh muc khoa hoc nhanh va dung nhu cau.',
      content: `${SEED_MARKER}\n\nHay bat dau tu ky nang can dat duoc, muc do hien tai, thoi luong co the dau tu moi tuan va san pham thuc hanh sau khoa hoc.`,
    },
    {
      title: 'Vi sao nen on tap bang quiz va du an nho',
      slug: 'on-tap-bang-quiz-va-du-an-nho',
      excerpt: 'Quiz va du an nho giup bien kien thuc thanh ky nang co the dung lai.',
      content: `${SEED_MARKER}\n\nNguoi hoc nen lam quiz sau tung chuong va tong hop kien thuc bang mot bai thuc hanh nho de phat hien phan con yeu.`,
    },
  ];

  let affected = 0;
  for (const blog of blogs) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO blogs
       (title, slug, excerpt, content, author_name, status, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, 'PTIT Learning Team', 'published', DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?)`,
      [blog.title, blog.slug, blog.excerpt, blog.content, affected, adminId, adminId]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedContactMessages(conn) {
  const messages = [
    ['Nguyen Minh Anh', 'minhanh.demo@example.com', 'Tu van khoa hoc', 'Toi muon duoc tu van lo trinh hoc phu hop voi nguoi moi bat dau.'],
    ['Tran Quoc Bao', 'quocbao.demo@example.com', 'Thanh toan', 'Minh can xac nhan lai cach thanh toan va kich hoat khoa hoc sau khi chuyen khoan.'],
    ['Le Phuong Linh', 'linh.demo@example.com', 'Chung chi', 'Sau khi hoan thanh khoa hoc thi chung chi duoc cap trong bao lau?'],
    ['Pham Gia Huy', 'giahuy.demo@example.com', 'Tai khoan', 'Minh muon doi email dang nhap nhung van giu tien do hoc tap hien tai.'],
  ];

  let affected = 0;
  for (const row of messages) {
    const [existing] = await conn.execute(
      'SELECT message_id FROM contact_messages WHERE email = ? AND message LIKE ? LIMIT 1',
      [row[1], `%${SEED_MARKER}%`]
    );
    if (existing.length) continue;

    const [result] = await conn.execute(
      `INSERT INTO contact_messages (name, email, subject, message, is_resolved, created_at)
       VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [row[0], row[1], row[2], `${SEED_MARKER}\n${row[3]}`, affected % 2, affected + 1]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedWishlist(conn) {
  const users = await getUsers(conn);
  const courses = await getCourses(conn);
  let affected = 0;

  for (let i = 0; i < Math.min(6, users.length * courses.length); i += 1) {
    const user = users[i % users.length];
    const course = courses[(i + 1) % courses.length];
    const [result] = await conn.execute(
      'INSERT IGNORE INTO wishlist (user_id, course_id, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
      [user.user_id, course.course_id, i + 1]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedReviews(conn) {
  const users = await getUsers(conn);
  const courses = await getCourses(conn);
  const titles = ['Noi dung de theo doi', 'Khoa hoc thuc te', 'Dang tien de tiep tuc hoc'];
  const contents = [
    'Bai hoc chia nho hop ly, phu hop de hoc sau gio lam.',
    'Vi du thuc hanh gan voi nhu cau cong viec, de ap dung lai.',
    'Nen bo sung them bai tap nang cao, nhung phan nen tang rat on.',
  ];
  let affected = 0;

  for (let i = 0; i < Math.min(5, users.length, courses.length); i += 1) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO reviews (user_id, course_id, rating, title, content, created_at)
       VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [
        users[i].user_id,
        courses[i].course_id,
        5 - (i % 2),
        titles[i % titles.length],
        `${SEED_MARKER}\n${contents[i % contents.length]}`,
        i + 1,
      ]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedNotifications(conn) {
  const users = await getUsers(conn, 5);
  let affected = 0;

  for (const user of users) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO notifications
       (user_id, type, title, message, action_url, dedupe_key, is_read, created_at)
       VALUES (?, 'demo_setup', 'Goi y hoc tap moi', ?, '/courses', ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [
        user.user_id,
        `${SEED_MARKER}\nChon mot khoa hoc phu hop va them vao danh sach yeu thich de quay lai sau.`,
        `demo_setup:${SEED_MARKER}:${user.user_id}`,
        affected % 2,
        affected + 1,
      ]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedBundleReviews(conn) {
  const users = await getUsers(conn);
  const bundles = await getBundles(conn);
  let affected = 0;

  for (let i = 0; i < Math.min(4, users.length * bundles.length); i += 1) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO bundle_reviews (user_id, bundle_id, rating, title, content, created_at)
       VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [
        users[i % users.length].user_id,
        bundles[i % bundles.length].bundle_id,
        5,
        'Combo tiet kiem va de hoc theo lo trinh',
        `${SEED_MARKER}\nCac khoa hoc trong combo bo tro nhau tot, phu hop de hoc theo mot mach.`,
        i + 1,
      ]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedCartBundles(conn) {
  const users = await getUsers(conn);
  const bundles = await getBundles(conn);
  let affected = 0;

  for (let i = 0; i < Math.min(3, users.length * bundles.length); i += 1) {
    const [result] = await conn.execute(
      'INSERT IGNORE INTO cart_bundles (user_id, bundle_id, added_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))',
      [users[i % users.length].user_id, bundles[i % bundles.length].bundle_id, 26 + i]
    );
    affected += result.affectedRows;
  }
  return affected;
}

async function seedCartUpsellDiscounts(conn) {
  const users = await getUsers(conn);
  const courses = await getCourses(conn);
  const bundles = await getBundles(conn);
  let affected = 0;

  for (let i = 0; i < Math.min(4, users.length, courses.length); i += 1) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO cart_upsell_discounts
       (user_id, item_type, item_id, discount_percent, created_at)
       VALUES (?, 'course', ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [users[i].user_id, courses[i].course_id, 5 + (i % 3), i + 1]
    );
    affected += result.affectedRows;
  }

  for (let i = 0; i < Math.min(2, users.length, bundles.length); i += 1) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO cart_upsell_discounts
       (user_id, item_type, item_id, discount_percent, created_at)
       VALUES (?, 'bundle', ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [users[i].user_id, String(bundles[i].bundle_id), 8 + i, i + 1]
    );
    affected += result.affectedRows;
  }

  return affected;
}

async function seedFlashSaleCourses(conn) {
  const [sales] = await conn.execute(
    `SELECT flash_sale_id
     FROM flash_sales
     WHERE target_type = 'courses'
     ORDER BY flash_sale_id ASC
     LIMIT 2`
  );
  if (!sales.length) return 0;

  const courses = await getCourses(conn, 6);
  let affected = 0;
  for (let i = 0; i < Math.min(6, courses.length); i += 1) {
    const [result] = await conn.execute(
      'INSERT IGNORE INTO flash_sale_courses (flash_sale_id, course_id) VALUES (?, ?)',
      [sales[i % sales.length].flash_sale_id, courses[i].course_id]
    );
    affected += result.affectedRows;
  }
  return affected;
}

const SEEDERS = Object.freeze({
  blogs: seedBlogs,
  contact_messages: seedContactMessages,
  wishlist: seedWishlist,
  reviews: seedReviews,
  notifications: seedNotifications,
  bundle_reviews: seedBundleReviews,
  cart_bundles: seedCartBundles,
  cart_upsell_discounts: seedCartUpsellDiscounts,
  flash_sale_courses: seedFlashSaleCourses,
});

function printHelp() {
  console.log(`Usage:
  node scripts/seed-realistic-demo-data.js          # dry-run, no database writes
  node scripts/seed-realistic-demo-data.js --apply  # insert demo rows

This script reads the current MySQL database, reports table counts, and tops up
empty or low-data support tables. It never writes to: ${NEVER_WRITE_TABLES.join(', ')}.`);
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    printHelp();
    return;
  }

  const conn = await mysql.createConnection(getConnectionConfig());
  try {
    const beforeCounts = await getTableCounts(conn);
    const plan = buildSeedPlan(beforeCounts);

    console.log('Current table counts:');
    for (const table of Object.keys(beforeCounts).sort()) {
      console.log(`- ${table}: ${beforeCounts[table]}`);
    }

    if (!plan.length) {
      console.log('No seed work needed for the configured support tables.');
      return;
    }

    console.log('\nSeed plan:');
    for (const item of plan) {
      console.log(`- ${item.table}: ${item.reason}`);
    }

    if (!args.apply) {
      console.log('\nDry-run only. Re-run with --apply on the new machine to insert data.');
      return;
    }

    await conn.beginTransaction();
    const results = [];
    for (const item of plan) {
      const seed = SEEDERS[item.table];
      if (!seed) continue;
      const inserted = await seed(conn);
      results.push({ table: item.table, inserted });
    }
    await conn.commit();

    console.log('\nInserted rows:');
    for (const result of results) {
      console.log(`- ${result.table}: ${result.inserted}`);
    }
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      if (rollbackErr && rollbackErr.fatal) throw rollbackErr;
    }
    throw err;
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed realistic demo data failed:', err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  NEVER_WRITE_TABLES,
  buildSeedPlan,
  parseArgs,
  shouldTopUp,
};
