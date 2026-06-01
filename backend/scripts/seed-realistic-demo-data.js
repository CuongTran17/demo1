require('dotenv').config();

const mysql = require('mysql2/promise');

const SEED_MARKER = 'DEMO_REALISTIC_SEED';
const LOW_DATA_LIMIT = 3;
const COURSE_LOW_DATA_LIMIT = 12;

const NEVER_WRITE_TABLES = Object.freeze([
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

const ENSURE_TABLE_SQL = Object.freeze({
  courses: `
    CREATE TABLE IF NOT EXISTS courses (
      course_id VARCHAR(50) PRIMARY KEY,
      course_name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT,
      price DECIMAL(12, 0) DEFAULT 0,
      old_price DECIMAL(12, 0),
      duration VARCHAR(50),
      students_count INT DEFAULT 0,
      level VARCHAR(50) DEFAULT 'Co ban',
      thumbnail VARCHAR(500),
      is_new TINYINT(1) DEFAULT 0,
      discount_percentage INT DEFAULT 0,
      has_pending_changes TINYINT(1) DEFAULT 0,
      last_modified_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  blogs: `
    CREATE TABLE IF NOT EXISTS blogs (
      blog_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(180) NOT NULL UNIQUE,
      excerpt TEXT,
      content LONGTEXT NOT NULL,
      cover_image VARCHAR(500),
      author_name VARCHAR(120) NOT NULL DEFAULT 'PTIT Learning Team',
      status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      created_by INT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_blogs_status_published (status, published_at),
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  contact_messages: `
    CREATE TABLE IF NOT EXISTS contact_messages (
      message_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL,
      subject VARCHAR(80),
      message TEXT NOT NULL,
      is_resolved TINYINT(1) NOT NULL DEFAULT 0,
      resolved_by INT NULL,
      resolved_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_contact_messages_resolved_created (is_resolved, created_at),
      FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  wishlist: `
    CREATE TABLE IF NOT EXISTS wishlist (
      wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wishlist_user_course (user_id, course_id),
      INDEX idx_wishlist_user_created (user_id, created_at),
      INDEX idx_wishlist_course (course_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  reviews: `
    CREATE TABLE IF NOT EXISTS reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      rating TINYINT NOT NULL,
      title VARCHAR(255),
      content TEXT,
      reply_content TEXT,
      reply_user_id INT DEFAULT NULL,
      reply_created_at TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_course (user_id, course_id),
      CHECK (rating BETWEEN 1 AND 5),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
      FOREIGN KEY (reply_user_id) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      action_url VARCHAR(255) DEFAULT NULL,
      dedupe_key VARCHAR(255) DEFAULT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP NULL,
      UNIQUE KEY uq_notifications_dedupe (user_id, dedupe_key),
      INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  bundle_reviews: `
    CREATE TABLE IF NOT EXISTS bundle_reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bundle_id INT NOT NULL,
      rating TINYINT NOT NULL,
      title VARCHAR(255),
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_bundle_review (user_id, bundle_id),
      CHECK (rating BETWEEN 1 AND 5),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  cart_bundles: `
    CREATE TABLE IF NOT EXISTS cart_bundles (
      cart_bundle_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bundle_id INT NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cart_bundle_user_bundle (user_id, bundle_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  cart_upsell_discounts: `
    CREATE TABLE IF NOT EXISTS cart_upsell_discounts (
      user_id INT NOT NULL,
      item_type ENUM('course', 'bundle') NOT NULL,
      item_id VARCHAR(50) NOT NULL,
      discount_percent INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, item_type, item_id),
      INDEX idx_cart_upsell_item (item_type, item_id),
      CHECK (discount_percent BETWEEN 1 AND 90),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  flash_sale_courses: `
    CREATE TABLE IF NOT EXISTS flash_sale_courses (
      flash_sale_id INT NOT NULL,
      course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (flash_sale_id, course_id),
      FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(flash_sale_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
});

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes('--apply'),
    includeCourses: argv.includes('--include-courses'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function shouldTopUp(count, minimum = LOW_DATA_LIMIT) {
  return Number(count || 0) < minimum;
}

function hasData(counts, table) {
  return Number(counts[table] || 0) > 0;
}

function buildSeedPlan(counts, options = {}) {
  const plan = [];
  const add = (table, reason) => {
    if (!NEVER_WRITE_TABLES.includes(table)) {
      plan.push({ table, reason });
    }
  };

  if (options.includeCourses && shouldTopUp(counts.courses, COURSE_LOW_DATA_LIMIT)) {
    add('courses', 'bo sung course mau bi thieu bang INSERT IGNORE');
  }

  if (shouldTopUp(counts.blogs)) {
    add('blogs', 'bai viet dang trong hoac qua it');
  }
  if (shouldTopUp(counts.contact_messages)) {
    add('contact_messages', 'lien he dang trong hoac qua it');
  }

  const hasCoursesForDependentSeeds = hasData(counts, 'courses') || options.includeCourses;

  if (hasData(counts, 'users') && hasCoursesForDependentSeeds) {
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

  if (hasCoursesForDependentSeeds && hasData(counts, 'flash_sales')) {
    if (shouldTopUp(counts.flash_sale_courses)) {
      add('flash_sale_courses', 'can lien ket flash sale voi khoa hoc san co');
    }
  }

  return plan;
}

function getEnsureTableSql(table) {
  if (NEVER_WRITE_TABLES.includes(table)) return null;
  return ENSURE_TABLE_SQL[table] || null;
}

async function ensurePlannedTables(conn, plan) {
  for (const item of plan) {
    const sql = getEnsureTableSql(item.table);
    if (sql) {
      await conn.query(sql);
    }
  }
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

async function seedCourses(conn) {
  const courses = [
    ['web-frontend-foundation', 'Nen tang Frontend Web', 'Lap trinh', 'Hoc HTML, CSS, JavaScript va cach xay dung giao dien web co ban.', 799000, 1199000, '24 gio', 420, 'Co ban', null, 1, 33],
    ['react-practical', 'React thuc chien', 'Lap trinh', 'Xay dung ung dung React voi component, router, state va goi API.', 1299000, 1899000, '32 gio', 360, 'Trung cap', null, 1, 32],
    ['node-express-api', 'Node.js Express API', 'Lap trinh', 'Thiet ke REST API, auth JWT, middleware va ket noi MySQL bang Node.js.', 1399000, 1999000, '30 gio', 310, 'Trung cap', null, 0, 30],
    ['mysql-database-basic', 'MySQL cho ung dung web', 'Du lieu', 'Thiet ke bang, khoa ngoai, truy van SELECT/JOIN va toi uu co ban cho MySQL.', 899000, 1299000, '20 gio', 280, 'Co ban', null, 0, 31],
    ['python-data-analysis', 'Python phan tich du lieu', 'Du lieu', 'Lam sach du lieu, truc quan hoa va phan tich bang Python cho nguoi moi.', 1199000, 1699000, '28 gio', 340, 'Co ban', null, 1, 29],
    ['excel-business', 'Excel ung dung van phong', 'Van phong', 'Cong thuc, PivotTable, dashboard va bao cao cong viec bang Excel.', 699000, 999000, '18 gio', 510, 'Co ban', null, 0, 30],
    ['digital-marketing-foundation', 'Digital Marketing nen tang', 'Marketing', 'Nam cac kenh SEO, content, social va do luong chien dich marketing.', 1099000, 1599000, '26 gio', 260, 'Co ban', null, 1, 31],
    ['facebook-ads-practical', 'Facebook Ads thuc chien', 'Marketing', 'Lap ke hoach, cau truc chien dich va doc chi so quang cao Facebook.', 999000, 1499000, '22 gio', 230, 'Trung cap', null, 0, 33],
    ['personal-finance-foundation', 'Tai chinh ca nhan', 'Tai chinh', 'Quan ly thu chi, quy du phong, muc tieu tai chinh va dau tu co ban.', 799000, 1199000, '16 gio', 300, 'Co ban', null, 0, 33],
    ['investment-starter', 'Dau tu cho nguoi moi', 'Tai chinh', 'Hieu rui ro, phan bo tai san va cach doc thong tin dau tu nen tang.', 1299000, 1899000, '25 gio', 210, 'Co ban', null, 1, 32],
    ['accounting-basic-practice', 'Ke toan co ban thuc hanh', 'Ke toan', 'Nguyen ly ke toan, chung tu, dinh khoan va lap bao cao don gian.', 899000, 1399000, '24 gio', 240, 'Co ban', null, 0, 36],
    ['office-productivity', 'Ky nang lam viec hieu qua', 'Ky nang', 'Quan ly thoi gian, giao tiep cong viec va to chuc cong viec ca nhan.', 599000, 899000, '14 gio', 390, 'Co ban', null, 1, 33],
  ];

  let affected = 0;
  for (const course of courses) {
    const [result] = await conn.execute(
      `INSERT IGNORE INTO courses
       (course_id, course_name, category, description, price, old_price, duration,
        students_count, level, thumbnail, is_new, discount_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      course
    );
    affected += result.affectedRows;
  }
  return affected;
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
  courses: seedCourses,
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
  node scripts/seed-realistic-demo-data.js                            # dry-run, no database writes
  node scripts/seed-realistic-demo-data.js --apply                    # insert support demo rows
  node scripts/seed-realistic-demo-data.js --apply --include-courses  # also insert missing sample courses

This script reads the current MySQL database, reports table counts, and tops up
empty or low-data tables. Courses are inserted only with --include-courses and
only through INSERT IGNORE. It never writes to: ${NEVER_WRITE_TABLES.join(', ')}.`);
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
    const plan = buildSeedPlan(beforeCounts, args);

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
      if (!args.includeCourses) {
        console.log('Add --include-courses if this database is missing sample course catalog rows.');
      }
      return;
    }

    await conn.beginTransaction();
    await ensurePlannedTables(conn, plan);
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
  getEnsureTableSql,
  parseArgs,
  shouldTopUp,
};
