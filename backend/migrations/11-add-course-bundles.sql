CREATE TABLE IF NOT EXISTS course_bundles (
    bundle_id INT AUTO_INCREMENT PRIMARY KEY,
    bundle_name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    bundle_price DECIMAL(12, 0) NOT NULL,
    original_price DECIMAL(12, 0) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_bundle_items (
    bundle_id INT NOT NULL,
    course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (bundle_id, course_id),
    INDEX idx_course_bundle_items_course (course_id),
    FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_bundles (
    cart_bundle_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_bundle_user_bundle (user_id, bundle_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
