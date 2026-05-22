CREATE TABLE IF NOT EXISTS bundle_reviews (
    review_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    bundle_id   INT NOT NULL,
    rating      TINYINT NOT NULL,
    title       VARCHAR(255),
    content     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY  uq_user_bundle_review (user_id, bundle_id),
    CONSTRAINT  chk_bundle_review_rating CHECK (rating BETWEEN 1 AND 5),
    FOREIGN KEY (user_id)   REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bundle_id) REFERENCES course_bundles(bundle_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
