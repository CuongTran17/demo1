-- ============================================================
-- PTIT Learning Database Schema (Compatible with Node.js backend)
-- Same schema as the original Java project
-- ============================================================

CREATE DATABASE IF NOT EXISTS ptit_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ptit_learning;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_locked TINYINT(1) DEFAULT 0,
    locked_reason TEXT,
    locked_by INT,
    locked_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email OTPs (register/forgot password)
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

-- Pending Registrations (email verified but not fully created user)
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

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(50) PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(12, 0) DEFAULT 0,
    old_price DECIMAL(12, 0),
    duration VARCHAR(50),
    students_count INT DEFAULT 0,
    level VARCHAR(50) DEFAULT 'Cơ bản',
    thumbnail VARCHAR(500),
    is_new TINYINT(1) DEFAULT 0,
    discount_percentage INT DEFAULT 0,
    has_pending_changes TINYINT(1) DEFAULT 0,
    last_modified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart
CREATE TABLE IF NOT EXISTS cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cart_item (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Discount Codes
CREATE TABLE IF NOT EXISTS discount_codes (
    discount_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(12, 2) NOT NULL,
    min_order_amount DECIMAL(12, 0) DEFAULT 0,
    max_discount_amount DECIMAL(12, 0) DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    starts_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subtotal_amount DECIMAL(12, 0) NOT NULL,
    discount_code VARCHAR(50) DEFAULT NULL,
    discount_amount DECIMAL(12, 0) DEFAULT 0,
    total_amount DECIMAL(12, 0) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    order_note TEXT,
    status ENUM('pending', 'pending_payment', 'completed', 'rejected', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (discount_code) REFERENCES discount_codes(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    price DECIMAL(12, 0) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Courses (purchased courses)
CREATE TABLE IF NOT EXISTS user_courses (
    user_course_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_course (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Course Progress
CREATE TABLE IF NOT EXISTS course_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    progress_percentage INT DEFAULT 0,
    total_hours DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_progress (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
    lesson_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL,
    section_id INT DEFAULT 1,
    lesson_title VARCHAR(255) NOT NULL,
    lesson_content TEXT,
    video_url VARCHAR(500),
    duration INT DEFAULT 0,
    lesson_order INT DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lesson Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    lesson_id INT NOT NULL,
    completed TINYINT(1) DEFAULT 0,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY unique_lesson_progress (user_id, course_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Teacher Courses (assignment)
CREATE TABLE IF NOT EXISTS teacher_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_teacher_course (teacher_id, course_id),
    FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pending Changes (approval workflow)
CREATE TABLE IF NOT EXISTS pending_changes (
    change_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50),
    target_id VARCHAR(50),
    change_type VARCHAR(50) NOT NULL,
    change_data TEXT,
    requested_by INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT,
    review_note TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Approval History
CREATE TABLE IF NOT EXISTS payment_approval_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    admin_id INT,
    action VARCHAR(20) NOT NULL,
    note TEXT,
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Account Lock Requests
CREATE TABLE IF NOT EXISTS account_lock_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    target_user_id INT NOT NULL,
    requester_id INT NOT NULL,
    reason TEXT,
    request_type ENUM('lock', 'unlock') DEFAULT 'lock',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Flash Sales
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
    CONSTRAINT chk_flash_sale_discount CHECK (discount_percentage > 0 AND discount_percentage <= 90)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Flash Sale Courses Mapping (for target_type='courses')
CREATE TABLE IF NOT EXISTS flash_sale_courses (
    flash_sale_id INT NOT NULL,
    course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (flash_sale_id, course_id),
    FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(flash_sale_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Compatibility migration for existing databases
-- (safe to keep in this unified file: no-op when columns already exist)
-- ============================================================

-- Add subtotal_amount column if not exists
SET @col1 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'subtotal_amount');
SET @sql1 := IF(@col1 = 0, 'ALTER TABLE orders ADD COLUMN subtotal_amount DECIMAL(12, 0) NOT NULL DEFAULT 0 AFTER user_id', 'SELECT 1');
PREPARE stmt FROM @sql1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add discount_code column if not exists
SET @col2 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_code');
SET @sql2 := IF(@col2 = 0, 'ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50) DEFAULT NULL AFTER subtotal_amount', 'SELECT 1');
PREPARE stmt FROM @sql2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add discount_amount column if not exists
SET @col3 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_amount');
SET @sql3 := IF(@col3 = 0, 'ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12, 0) NOT NULL DEFAULT 0 AFTER discount_code', 'SELECT 1');
PREPARE stmt FROM @sql3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill old orders so existing reports continue to work
SET SQL_SAFE_UPDATES = 0;
UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount = 0;
SET SQL_SAFE_UPDATES = 1;

-- Extend flash sale target types for old databases
ALTER TABLE flash_sales
    MODIFY COLUMN target_type ENUM('all', 'category', 'courses') NOT NULL DEFAULT 'all';

-- Ensure flash_sale_courses exists for old databases
CREATE TABLE IF NOT EXISTS flash_sale_courses (
    flash_sale_id INT NOT NULL,
    course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (flash_sale_id, course_id),
    FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(flash_sale_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
