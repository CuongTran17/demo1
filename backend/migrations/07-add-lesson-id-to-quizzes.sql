USE ptit_learning;

ALTER TABLE quizzes
  ADD COLUMN lesson_id INT NULL AFTER course_id,
  ADD INDEX idx_quizzes_lesson_id (lesson_id),
  ADD CONSTRAINT fk_quizzes_lesson
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE SET NULL;

