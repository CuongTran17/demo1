    USE ptit_learning;

    CREATE TABLE IF NOT EXISTS quizzes (
        quiz_id     INT AUTO_INCREMENT PRIMARY KEY,
        course_id   VARCHAR(50) NOT NULL,
        section_id  INT DEFAULT 1,
        lesson_order INT DEFAULT 1,
        quiz_title  VARCHAR(255) NOT NULL,
        description TEXT,
        is_active   TINYINT(1) DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS quiz_questions (
        question_id   INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id       INT NOT NULL,
        question_text TEXT NOT NULL,
        question_order INT DEFAULT 1,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS quiz_options (
        option_id    INT AUTO_INCREMENT PRIMARY KEY,
        question_id  INT NOT NULL,
        option_text  VARCHAR(500) NOT NULL,
        is_correct   TINYINT(1) DEFAULT 0,
        option_order INT DEFAULT 1,
        FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS quiz_attempts (
        attempt_id   INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id      INT NOT NULL,
        user_id      INT NOT NULL,
        passed       TINYINT(1) DEFAULT 0,
        score        INT DEFAULT 0,
        total        INT DEFAULT 0,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        passed_at    TIMESTAMP NULL,
        FOREIGN KEY (quiz_id)  REFERENCES quizzes(quiz_id)  ON DELETE CASCADE,
        FOREIGN KEY (user_id)  REFERENCES users(user_id)    ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
