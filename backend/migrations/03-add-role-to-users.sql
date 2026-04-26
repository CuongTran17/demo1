USE ptit_learning;

ALTER TABLE users
    ADD COLUMN role ENUM('admin', 'teacher', 'student') DEFAULT NULL;