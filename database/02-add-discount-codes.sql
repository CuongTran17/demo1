-- ============================================================
-- Add discount code support for checkout and SePay payments
-- Run this file for existing databases.
-- ============================================================

USE ptit_learning;

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

-- Backfill old orders so existing reports continue to work.
SET SQL_SAFE_UPDATES = 0;
UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount = 0;
SET SQL_SAFE_UPDATES = 1;

-- (FK between orders.discount_code and discount_codes.code is handled at application level)
