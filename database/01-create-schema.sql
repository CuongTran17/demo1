-- ============================================================
-- PTIT Learning Database Schema
-- Import this file on a new MySQL database before running seed scripts.
-- Target: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS ptit_learning
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ptit_learning;

-- Users and authentication
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher', 'student') DEFAULT NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 1,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    locked_reason TEXT,
    locked_by INT NULL,
    locked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_locked (is_locked),
    CONSTRAINT fk_users_locked_by
      FOREIGN KEY (locked_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_otps (
    otp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose ENUM('register', 'reset_password') NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_purpose_created (email, purpose, created_at),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pending_registrations (
    pending_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pending_registrations_email (email),
    INDEX idx_pending_registrations_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course catalog
CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(50) PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(12, 0) NOT NULL DEFAULT 0,
    old_price DECIMAL(12, 0) DEFAULT NULL,
    duration VARCHAR(50),
    students_count INT NOT NULL DEFAULT 0,
    level VARCHAR(50) NOT NULL DEFAULT 'Co ban',
    thumbnail VARCHAR(500),
    is_new TINYINT(1) NOT NULL DEFAULT 0,
    discount_percentage INT NOT NULL DEFAULT 0,
    has_pending_changes TINYINT(1) NOT NULL DEFAULT 0,
    last_modified_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_courses_category (category),
    INDEX idx_courses_created (created_at),
    INDEX idx_courses_pending (has_pending_changes),
    CONSTRAINT fk_courses_last_modified_by
      FOREIGN KEY (last_modified_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
    lesson_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL,
    section_id INT NOT NULL DEFAULT 1,
    lesson_title VARCHAR(255) NOT NULL,
    lesson_content TEXT,
    video_url VARCHAR(500),
    duration INT NOT NULL DEFAULT 0,
    lesson_order INT NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lessons_course_order (course_id, section_id, lesson_order),
    CONSTRAINT fk_lessons_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_teacher_course (teacher_id, course_id),
    INDEX idx_teacher_courses_course (course_id),
    CONSTRAINT fk_teacher_courses_teacher
      FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_courses_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart, wishlist, bundles, and promotions
CREATE TABLE IF NOT EXISTS cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_user_course (user_id, course_id),
    INDEX idx_cart_course (course_id),
    CONSTRAINT fk_cart_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist_user_course (user_id, course_id),
    INDEX idx_wishlist_course (course_id),
    CONSTRAINT fk_wishlist_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_bundles (
    bundle_id INT AUTO_INCREMENT PRIMARY KEY,
    bundle_name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    bundle_price DECIMAL(12, 0) NOT NULL,
    original_price DECIMAL(12, 0) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_course_bundles_active (is_active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_bundle_items (
    bundle_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (bundle_id, course_id),
    INDEX idx_course_bundle_items_course (course_id),
    CONSTRAINT fk_course_bundle_items_bundle
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_bundle_items_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_bundles (
    cart_bundle_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_bundle_user_bundle (user_id, bundle_id),
    INDEX idx_cart_bundles_bundle (bundle_id),
    CONSTRAINT fk_cart_bundles_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_bundles_bundle
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_upsell_settings (
    setting_id INT PRIMARY KEY DEFAULT 1,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    bundle_discount_min INT NOT NULL DEFAULT 5,
    bundle_discount_max INT NOT NULL DEFAULT 10,
    course_discount_percent INT NOT NULL DEFAULT 5,
    max_suggestions INT NOT NULL DEFAULT 3,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_cart_upsell_bundle_min CHECK (bundle_discount_min BETWEEN 1 AND 90),
    CONSTRAINT chk_cart_upsell_bundle_max CHECK (bundle_discount_max BETWEEN 1 AND 90),
    CONSTRAINT chk_cart_upsell_course_discount CHECK (course_discount_percent BETWEEN 1 AND 90),
    CONSTRAINT chk_cart_upsell_max_suggestions CHECK (max_suggestions BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cart_upsell_settings
    (setting_id, is_enabled, bundle_discount_min, bundle_discount_max, course_discount_percent, max_suggestions)
VALUES (1, 1, 5, 10, 5, 3)
ON DUPLICATE KEY UPDATE setting_id = setting_id;

CREATE TABLE IF NOT EXISTS cart_upsell_discounts (
    user_id INT NOT NULL,
    item_type ENUM('course', 'bundle') NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    discount_percent INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_type, item_id),
    INDEX idx_cart_upsell_item (item_type, item_id),
    CONSTRAINT chk_cart_upsell_discount CHECK (discount_percent BETWEEN 1 AND 90),
    CONSTRAINT fk_cart_upsell_discounts_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discount_codes (
    discount_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(12, 2) NOT NULL,
    min_order_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(12, 0) DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT NOT NULL DEFAULT 0,
    starts_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_discount_codes_active (is_active, starts_at, expires_at),
    CONSTRAINT fk_discount_codes_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sales (
    flash_sale_id INT AUTO_INCREMENT PRIMARY KEY,
    target_type ENUM('all', 'category', 'courses') NOT NULL DEFAULT 'all',
    target_value VARCHAR(64) NULL,
    discount_percentage INT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_flash_sales_active_time (is_active, start_at, end_at),
    CONSTRAINT chk_flash_sale_discount CHECK (discount_percentage > 0 AND discount_percentage <= 90),
    CONSTRAINT fk_flash_sales_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sale_courses (
    flash_sale_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (flash_sale_id, course_id),
    INDEX idx_flash_sale_courses_course (course_id),
    CONSTRAINT fk_flash_sale_courses_sale
      FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(flash_sale_id) ON DELETE CASCADE,
    CONSTRAINT fk_flash_sale_courses_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders, enrollment, and learning progress
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subtotal_amount DECIMAL(12, 0) NOT NULL,
    discount_code VARCHAR(50) DEFAULT NULL,
    discount_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 0) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    order_note TEXT,
    status ENUM('pending', 'pending_payment', 'completed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_user_created (user_id, created_at),
    INDEX idx_orders_status_created (status, created_at),
    CONSTRAINT fk_orders_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_discount_code
      FOREIGN KEY (discount_code) REFERENCES discount_codes(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    price DECIMAL(12, 0) NOT NULL,
    INDEX idx_order_items_course (course_id),
    CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_courses (
    user_course_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enrolled_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_user_course (user_id, course_id),
    INDEX idx_user_courses_course (course_id),
    CONSTRAINT fk_user_courses_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_courses_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    progress_percentage INT NOT NULL DEFAULT 0,
    total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_course_progress (user_id, course_id),
    INDEX idx_course_progress_course (course_id),
    CONSTRAINT chk_course_progress_percentage CHECK (progress_percentage BETWEEN 0 AND 100),
    CONSTRAINT fk_course_progress_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_progress_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    lesson_id INT NOT NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL,
    video_watched_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    last_position DECIMAL(10, 2) NOT NULL DEFAULT 0,
    watched_segments JSON NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lesson_progress (user_id, course_id, lesson_id),
    INDEX idx_lesson_progress_lesson (lesson_id),
    CONSTRAINT chk_lesson_video_percent CHECK (video_watched_percent BETWEEN 0 AND 100),
    CONSTRAINT fk_lesson_progress_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_lesson_progress_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_lesson_progress_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificates (
    cert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cert_user_course (user_id, course_id),
    INDEX idx_certificates_course (course_id),
    CONSTRAINT fk_certificates_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_certificates_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL,
    lesson_id INT NULL,
    section_id INT NOT NULL DEFAULT 1,
    lesson_order INT NOT NULL DEFAULT 1,
    quiz_title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quizzes_course_order (course_id, section_id, lesson_order),
    INDEX idx_quizzes_lesson (lesson_id),
    CONSTRAINT fk_quizzes_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_quizzes_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_order INT NOT NULL DEFAULT 1,
    INDEX idx_quiz_questions_quiz_order (quiz_id, question_order),
    CONSTRAINT fk_quiz_questions_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    option_order INT NOT NULL DEFAULT 1,
    INDEX idx_quiz_options_question_order (question_id, option_order),
    CONSTRAINT fk_quiz_options_question
      FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    passed_at TIMESTAMP NULL,
    INDEX idx_quiz_attempts_user (user_id, attempted_at),
    CONSTRAINT fk_quiz_attempts_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_attempts_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews and content
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    rating TINYINT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    reply_content TEXT,
    reply_user_id INT DEFAULT NULL,
    reply_created_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_review_user_course (user_id, course_id),
    INDEX idx_reviews_course_created (course_id, created_at),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_replier
      FOREIGN KEY (reply_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bundle_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    rating TINYINT NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bundle_review_user_bundle (user_id, bundle_id),
    INDEX idx_bundle_reviews_bundle_created (bundle_id, created_at),
    CONSTRAINT chk_bundle_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_bundle_reviews_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bundle_reviews_bundle
      FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    CONSTRAINT fk_blogs_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_blogs_updated_by
      FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    CONSTRAINT fk_contact_messages_resolved_by
      FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications, analytics, and admin workflows
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
    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM(
        'course_click',
        'add_to_cart',
        'checkout_start',
        'payment_created',
        'payment_completed',
        'payment_cancelled',
        'payment_failed'
    ) NOT NULL,
    user_id INT NULL,
    anonymous_id VARCHAR(64) NULL,
    course_id VARCHAR(50) NULL,
    order_id INT NULL,
    metadata JSON NULL,
    page_url VARCHAR(1024) NULL,
    referrer VARCHAR(1024) NULL,
    user_agent VARCHAR(512) NULL,
    ip_hash CHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_event_time (event_type, created_at),
    INDEX idx_analytics_course_event_time (course_id, event_type, created_at),
    INDEX idx_analytics_user_time (user_id, created_at),
    INDEX idx_analytics_anon_time (anonymous_id, created_at),
    INDEX idx_analytics_order (order_id),
    CONSTRAINT fk_analytics_user
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_analytics_course
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL,
    CONSTRAINT fk_analytics_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pending_changes (
    change_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50),
    target_id VARCHAR(50),
    change_type VARCHAR(50) NOT NULL,
    change_data TEXT,
    requested_by INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_note TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_pending_changes_status_requested (status, requested_at),
    INDEX idx_pending_changes_requester (requested_by),
    CONSTRAINT fk_pending_changes_requested_by
      FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_pending_changes_reviewed_by
      FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_approval_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    admin_id INT NULL,
    action VARCHAR(20) NOT NULL,
    note TEXT,
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payment_approval_order (order_id),
    CONSTRAINT fk_payment_approval_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_approval_admin
      FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_lock_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    target_user_id INT NOT NULL,
    requester_id INT NOT NULL,
    reason TEXT,
    request_type ENUM('lock', 'unlock') NOT NULL DEFAULT 'lock',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_account_lock_status_created (status, created_at),
    CONSTRAINT fk_account_lock_target
      FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_lock_requester
      FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_lock_reviewer
      FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Views used by admin screens and older code paths
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
LEFT JOIN lessons l ON pc.table_name = 'lessons' AND pc.target_id = CAST(l.lesson_id AS CHAR)
LEFT JOIN quizzes q ON pc.table_name = 'quizzes' AND pc.target_id = CAST(q.quiz_id AS CHAR);

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
