-- ============================================================
-- PTIT Learning Database Schema (PostgreSQL / Supabase)
-- Target: PostgreSQL 15+ / Supabase
-- Instructions: Copy and run this script directly in the Supabase SQL Editor.
-- ============================================================

-- Enable UUID extension if needed in future
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function to automatically update `updated_at` timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE otp_purpose AS ENUM ('register', 'reset_password');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type_enum AS ENUM ('percentage', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flash_sale_target AS ENUM ('all', 'category', 'courses');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('pending', 'pending_payment', 'completed', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blog_status_enum AS ENUM ('draft', 'published');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE analytics_event_type_enum AS ENUM (
        'course_click',
        'add_to_cart',
        'checkout_start',
        'payment_created',
        'payment_completed',
        'payment_cancelled',
        'payment_failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lock_request_type_enum AS ENUM ('lock', 'unlock');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_type_enum AS ENUM ('course', 'bundle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    role user_role DEFAULT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_reason TEXT,
    locked_by INT NULL,
    locked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_locked_by
      FOREIGN KEY (locked_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_locked ON users (is_locked);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS email_otps (
    otp_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose otp_purpose NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_purpose_created ON email_otps (email, purpose, created_at);
CREATE INDEX IF NOT EXISTS idx_expires_at ON email_otps (expires_at);

DROP TRIGGER IF EXISTS trg_email_otps_updated_at ON email_otps;
CREATE TRIGGER trg_email_otps_updated_at
BEFORE UPDATE ON email_otps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS pending_registrations (
    pending_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_phone ON pending_registrations (phone);

DROP TRIGGER IF EXISTS trg_pending_reg_updated_at ON pending_registrations;
CREATE TRIGGER trg_pending_reg_updated_at
BEFORE UPDATE ON pending_registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. COURSE CATALOG & LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(50) PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    old_price NUMERIC(12, 0) DEFAULT NULL,
    duration VARCHAR(50),
    students_count INT NOT NULL DEFAULT 0,
    level VARCHAR(50) NOT NULL DEFAULT 'Co ban',
    thumbnail VARCHAR(500),
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    discount_percentage INT NOT NULL DEFAULT 0,
    has_pending_changes BOOLEAN NOT NULL DEFAULT FALSE,
    last_modified_by INT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_last_modified_by
      FOREIGN KEY (last_modified_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_created ON courses (created_at);
CREATE INDEX IF NOT EXISTS idx_courses_pending ON courses (has_pending_changes);

CREATE TABLE IF NOT EXISTS lessons (
    lesson_id SERIAL PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL,
    section_id INT NOT NULL DEFAULT 1,
    lesson_title VARCHAR(255) NOT NULL,
    lesson_content TEXT,
    video_url VARCHAR(500),
    duration INT NOT NULL DEFAULT 0,
    lesson_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lessons_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_order ON lessons (course_id, section_id, lesson_order);

DROP TRIGGER IF EXISTS trg_lessons_updated_at ON lessons;
CREATE TRIGGER trg_lessons_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS teacher_courses (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teacher_course UNIQUE (teacher_id, course_id),
    CONSTRAINT fk_teacher_courses_teacher
      FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_courses_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teacher_courses_course ON teacher_courses (course_id);

-- ============================================================
-- 3. CART, WISHLIST, BUNDLES & PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cart_user_course UNIQUE (user_id, course_id),
    CONSTRAINT fk_cart_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cart_course ON cart (course_id);

CREATE TABLE IF NOT EXISTS wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wishlist_user_course UNIQUE (user_id, course_id),
    CONSTRAINT fk_wishlist_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wishlist_course ON wishlist (course_id);

CREATE TABLE IF NOT EXISTS course_bundles (
    bundle_id SERIAL PRIMARY KEY,
    bundle_name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    bundle_price NUMERIC(12, 0) NOT NULL,
    original_price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_bundles_active ON course_bundles (is_active, created_at);

DROP TRIGGER IF EXISTS trg_course_bundles_updated_at ON course_bundles;
CREATE TRIGGER trg_course_bundles_updated_at
BEFORE UPDATE ON course_bundles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS course_bundle_items (
    bundle_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (bundle_id, course_id),
    CONSTRAINT fk_course_bundle_items_bundle
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_bundle_items_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_bundle_items_course ON course_bundle_items (course_id);

CREATE TABLE IF NOT EXISTS cart_bundles (
    cart_bundle_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cart_bundle_user_bundle UNIQUE (user_id, bundle_id),
    CONSTRAINT fk_cart_bundles_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_bundles_bundle
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cart_bundles_bundle ON cart_bundles (bundle_id);

CREATE TABLE IF NOT EXISTS cart_upsell_settings (
    setting_id INT PRIMARY KEY DEFAULT 1,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bundle_discount_min INT NOT NULL DEFAULT 5,
    bundle_discount_max INT NOT NULL DEFAULT 10,
    course_discount_percent INT NOT NULL DEFAULT 5,
    max_suggestions INT NOT NULL DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cart_upsell_bundle_min CHECK (bundle_discount_min BETWEEN 1 AND 90),
    CONSTRAINT chk_cart_upsell_bundle_max CHECK (bundle_discount_max BETWEEN 1 AND 90),
    CONSTRAINT chk_cart_upsell_course_discount CHECK (course_discount_percent BETWEEN 1 AND 90),
    CONSTRAINT chk_cart_upsell_max_suggestions CHECK (max_suggestions BETWEEN 1 AND 12)
);

INSERT INTO cart_upsell_settings
    (setting_id, is_enabled, bundle_discount_min, bundle_discount_max, course_discount_percent, max_suggestions)
VALUES (1, TRUE, 5, 10, 5, 3)
ON CONFLICT (setting_id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_cart_upsell_settings_updated_at ON cart_upsell_settings;
CREATE TRIGGER trg_cart_upsell_settings_updated_at
BEFORE UPDATE ON cart_upsell_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS cart_upsell_discounts (
    user_id INT NOT NULL,
    item_type item_type_enum NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    discount_percent INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_type, item_id),
    CONSTRAINT chk_cart_upsell_discount CHECK (discount_percent BETWEEN 1 AND 90),
    CONSTRAINT fk_cart_upsell_discounts_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cart_upsell_item ON cart_upsell_discounts (item_type, item_id);

CREATE TABLE IF NOT EXISTS discount_codes (
    discount_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type discount_type_enum NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    max_discount_amount NUMERIC(12, 0) DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_discount_codes_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes (is_active, starts_at, expires_at);

DROP TRIGGER IF EXISTS trg_discount_codes_updated_at ON discount_codes;
CREATE TRIGGER trg_discount_codes_updated_at
BEFORE UPDATE ON discount_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS flash_sales (
    flash_sale_id SERIAL PRIMARY KEY,
    target_type flash_sale_target NOT NULL DEFAULT 'all',
    target_value VARCHAR(64) NULL,
    discount_percentage INT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_flash_sale_discount CHECK (discount_percentage > 0 AND discount_percentage <= 90),
    CONSTRAINT fk_flash_sales_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_active_time ON flash_sales (is_active, start_at, end_at);

DROP TRIGGER IF EXISTS trg_flash_sales_updated_at ON flash_sales;
CREATE TRIGGER trg_flash_sales_updated_at
BEFORE UPDATE ON flash_sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS flash_sale_courses (
    flash_sale_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (flash_sale_id, course_id),
    CONSTRAINT fk_flash_sale_courses_sale
      FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(flash_sale_id) ON DELETE CASCADE,
    CONSTRAINT fk_flash_sale_courses_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flash_sale_courses_course ON flash_sale_courses (course_id);

-- ============================================================
-- 4. ORDERS & PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    subtotal_amount NUMERIC(12, 0) NOT NULL,
    discount_code VARCHAR(50) DEFAULT NULL,
    discount_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 0) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    order_note TEXT,
    status order_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_discount_code
      FOREIGN KEY (discount_code) REFERENCES discount_codes(code) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    price NUMERIC(12, 0) NOT NULL,
    CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_course ON order_items (course_id);

CREATE TABLE IF NOT EXISTS user_courses (
    user_course_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    enrolled_at TIMESTAMPTZ NULL DEFAULT NULL,
    CONSTRAINT uq_user_course UNIQUE (user_id, course_id),
    CONSTRAINT fk_user_courses_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_courses_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_courses_course ON user_courses (course_id);

CREATE TABLE IF NOT EXISTS course_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    progress_percentage INT NOT NULL DEFAULT 0,
    total_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_progress UNIQUE (user_id, course_id),
    CONSTRAINT chk_course_progress_percentage CHECK (progress_percentage BETWEEN 0 AND 100),
    CONSTRAINT fk_course_progress_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_progress_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_progress_course ON course_progress (course_id);

DROP TRIGGER IF EXISTS trg_course_progress_updated_at ON course_progress;
CREATE TRIGGER trg_course_progress_updated_at
BEFORE UPDATE ON course_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    lesson_id INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    video_watched_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    last_position NUMERIC(10, 2) NOT NULL DEFAULT 0,
    watched_segments JSONB NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lesson_progress UNIQUE (user_id, course_id, lesson_id),
    CONSTRAINT chk_lesson_video_percent CHECK (video_watched_percent BETWEEN 0 AND 100),
    CONSTRAINT fk_lesson_progress_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_lesson_progress_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_lesson_progress_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress (lesson_id);

DROP TRIGGER IF EXISTS trg_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated_at
BEFORE UPDATE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS certificates (
    cert_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cert_user_course UNIQUE (user_id, course_id),
    CONSTRAINT fk_certificates_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_certificates_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates (course_id);

-- ============================================================
-- 5. QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id SERIAL PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL,
    lesson_id INT NULL,
    section_id INT NOT NULL DEFAULT 1,
    lesson_order INT NOT NULL DEFAULT 1,
    quiz_title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quizzes_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_quizzes_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_order ON quizzes (course_id, section_id, lesson_order);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes (lesson_id);

DROP TRIGGER IF EXISTS trg_quizzes_updated_at ON quizzes;
CREATE TRIGGER trg_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS quiz_questions (
    question_id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_order INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_quiz_questions_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order ON quiz_questions (quiz_id, question_order);

CREATE TABLE IF NOT EXISTS quiz_options (
    option_id SERIAL PRIMARY KEY,
    question_id INT NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    option_order INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_quiz_options_question
      FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question_order ON quiz_options (question_id, option_order);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    passed_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_quiz_attempts_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_attempts_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts (user_id, attempted_at);

-- ============================================================
-- 6. REVIEWS, BLOGS & CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    rating SMALLINT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    reply_content TEXT,
    reply_user_id INT DEFAULT NULL,
    reply_created_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_review_user_course UNIQUE (user_id, course_id),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_replier
      FOREIGN KEY (reply_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_course_created ON reviews (course_id, created_at);

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS bundle_reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    rating SMALLINT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_bundle_review_user_bundle UNIQUE (user_id, bundle_id),
    CONSTRAINT chk_bundle_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_bundle_reviews_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bundle_reviews_bundle
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bundle_reviews_bundle_created ON bundle_reviews (bundle_id, created_at);

DROP TRIGGER IF EXISTS trg_bundle_reviews_updated_at ON bundle_reviews;
CREATE TRIGGER trg_bundle_reviews_updated_at
BEFORE UPDATE ON bundle_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS blogs (
    blog_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image VARCHAR(500),
    author_name VARCHAR(120) NOT NULL DEFAULT 'PTIT Learning Team',
    status blog_status_enum NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ NULL,
    created_by INT NULL,
    updated_by INT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_blogs_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_blogs_updated_by
      FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blogs_status_published ON blogs (status, published_at);

DROP TRIGGER IF EXISTS trg_blogs_updated_at ON blogs;
CREATE TRIGGER trg_blogs_updated_at
BEFORE UPDATE ON blogs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS contact_messages (
    message_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    subject VARCHAR(80),
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by INT NULL,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contact_messages_resolved_by
      FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_resolved_created ON contact_messages (is_resolved, created_at);

DROP TRIGGER IF EXISTS trg_contact_messages_updated_at ON contact_messages;
CREATE TRIGGER trg_contact_messages_updated_at
BEFORE UPDATE ON contact_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. NOTIFICATIONS, ANALYTICS & ADMIN APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(255) DEFAULT NULL,
    dedupe_key VARCHAR(255) DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_notifications_dedupe UNIQUE (user_id, dedupe_key),
    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications (user_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS analytics_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type analytics_event_type_enum NOT NULL,
    user_id INT NULL,
    anonymous_id VARCHAR(64) NULL,
    course_id VARCHAR(50) NULL,
    order_id INT NULL,
    metadata JSONB NULL,
    page_url VARCHAR(1024) NULL,
    referrer VARCHAR(1024) NULL,
    user_agent VARCHAR(512) NULL,
    ip_hash CHAR(64) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analytics_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_analytics_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL,
    CONSTRAINT fk_analytics_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_time ON analytics_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_course_event_time ON analytics_events (course_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_time ON analytics_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_anon_time ON analytics_events (anonymous_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_order ON analytics_events (order_id);

CREATE TABLE IF NOT EXISTS pending_changes (
    change_id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    target_id VARCHAR(50),
    change_type VARCHAR(50) NOT NULL,
    change_data TEXT,
    requested_by INT NOT NULL,
    status approval_status_enum NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_note TEXT,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_pending_changes_requested_by
      FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_pending_changes_reviewed_by
      FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_changes_status_requested ON pending_changes (status, requested_at);
CREATE INDEX IF NOT EXISTS idx_pending_changes_requester ON pending_changes (requested_by);

CREATE TABLE IF NOT EXISTS payment_approval_history (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    admin_id INT NULL,
    action VARCHAR(20) NOT NULL,
    note TEXT,
    action_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_approval_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_approval_admin
      FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_approval_order ON payment_approval_history (order_id);

CREATE TABLE IF NOT EXISTS account_lock_requests (
    request_id SERIAL PRIMARY KEY,
    target_user_id INT NOT NULL,
    requester_id INT NOT NULL,
    reason TEXT,
    request_type lock_request_type_enum NOT NULL DEFAULT 'lock',
    status approval_status_enum NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_account_lock_target
      FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_lock_requester
      FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_lock_reviewer
      FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_account_lock_status_created ON account_lock_requests (status, created_at);

-- ============================================================
-- 8. VIEWS
-- ============================================================
CREATE OR REPLACE VIEW pending_changes_view AS
SELECT
    pc.change_id,
    pc.table_name,
    pc.target_id,
    pc.change_type,
    pc.change_data,
    pc.status,
    pc.requested_at,
    pc.requested_at AS created_at,
    pc.reviewed_at,
    pc.review_note,
    pc.requested_by AS teacher_id,
    pc.reviewed_by,
    u1.user_id AS requester_id,
    u1.fullname AS requester_name,
    u1.fullname AS teacher_name,
    u1.email AS requester_email,
    u1.email AS teacher_email,
    u2.fullname AS reviewer_name,
    u2.email AS reviewer_email,
    CASE
      WHEN pc.table_name = 'courses' THEN c.course_name
      WHEN pc.table_name = 'lessons' THEN l.lesson_title
      WHEN pc.table_name = 'quizzes' THEN q.quiz_title
      ELSE NULL
    END AS item_name
FROM pending_changes pc
LEFT JOIN users u1 ON pc.requested_by = u1.user_id
LEFT JOIN users u2 ON pc.reviewed_by = u2.user_id
LEFT JOIN courses c ON pc.table_name = 'courses' AND pc.target_id = c.course_id
LEFT JOIN lessons l ON pc.table_name = 'lessons' AND pc.target_id = CAST(l.lesson_id AS TEXT)
LEFT JOIN quizzes q ON pc.table_name = 'quizzes' AND pc.target_id = CAST(q.quiz_id AS TEXT);

CREATE OR REPLACE VIEW account_lock_requests_view AS
SELECT
    alr.request_id,
    alr.target_user_id,
    alr.requester_id,
    alr.reason,
    alr.request_type,
    alr.status,
    alr.created_at,
    alr.reviewed_by,
    alr.reviewed_at,
    alr.review_note,
    target.fullname AS target_fullname,
    target.email AS target_email,
    target.phone AS target_phone,
    target.is_locked AS target_is_locked,
    requester.fullname AS requester_fullname,
    requester.email AS requester_email,
    reviewer.fullname AS reviewer_fullname,
    reviewer.email AS reviewer_email
FROM account_lock_requests alr
LEFT JOIN users target ON alr.target_user_id = target.user_id
LEFT JOIN users requester ON alr.requester_id = requester.user_id
LEFT JOIN users reviewer ON alr.reviewed_by = reviewer.user_id;
