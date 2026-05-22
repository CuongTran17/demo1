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
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
