const db = require('../config/database');

class Quiz {
  // ── Student-facing ──────────────────────────────────────────────────────

  /** All active quizzes for a course (no questions, used for sidebar) */
  static async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT q.quiz_id, q.course_id, q.lesson_id,
              COALESCE(l.section_id, q.section_id) AS section_id,
              COALESCE(l.lesson_order, q.lesson_order) AS lesson_order,
              q.quiz_title, q.description,
              l.lesson_title
       FROM quizzes q
       LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
       WHERE q.course_id = ? AND q.is_active = 1
       ORDER BY COALESCE(l.section_id, q.section_id), COALESCE(l.lesson_order, q.lesson_order), q.quiz_id`,
      [courseId]
    );
    return rows;
  }

  static async getCourseId(quizId) {
    const [rows] = await db.execute(
      'SELECT course_id FROM quizzes WHERE quiz_id = ? AND is_active = 1',
      [quizId]
    );
    return rows[0]?.course_id || null;
  }

  static async getById(quizId) {
    const [rows] = await db.execute(
      `SELECT quiz_id, course_id, lesson_id, quiz_title
       FROM quizzes
       WHERE quiz_id = ? AND is_active = 1`,
      [quizId]
    );
    return rows[0] || null;
  }

  /** Quiz with questions + options (correct answer hidden) */
  static async getWithQuestions(quizId) {
    const [quizRows] = await db.execute(
      `SELECT q.quiz_id, q.quiz_title, q.description, q.course_id, q.lesson_id,
              l.lesson_title
       FROM quizzes q
       LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
       WHERE q.quiz_id = ? AND q.is_active = 1`,
      [quizId]
    );
    if (!quizRows.length) return null;
    const quiz = quizRows[0];

    const [questions] = await db.execute(
      'SELECT question_id, question_text, question_order FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order',
      [quizId]
    );
    for (const q of questions) {
      const [options] = await db.execute(
        'SELECT option_id, option_text, option_order FROM quiz_options WHERE question_id = ? ORDER BY option_order',
        [q.question_id]
      );
      q.options = options;
    }
    quiz.questions = questions;
    return quiz;
  }

  /** Quiz with correct answers revealed (for review after passing) */
  static async getWithAnswers(quizId) {
    const [quizRows] = await db.execute(
      `SELECT q.quiz_id, q.quiz_title, q.description, q.course_id, q.lesson_id,
              l.lesson_title
       FROM quizzes q
       LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
       WHERE q.quiz_id = ? AND q.is_active = 1`,
      [quizId]
    );
    if (!quizRows.length) return null;
    const quiz = quizRows[0];

    const [questions] = await db.execute(
      'SELECT question_id, question_text, question_order FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order',
      [quizId]
    );
    for (const q of questions) {
      const [options] = await db.execute(
        'SELECT option_id, option_text, is_correct, option_order FROM quiz_options WHERE question_id = ? ORDER BY option_order',
        [q.question_id]
      );
      q.options = options;
    }
    quiz.questions = questions;
    return quiz;
  }

  /** Returns the passing attempt for a user, or null if not passed */
  static async getAttemptStatus(quizId, userId) {
    const [rows] = await db.execute(
      'SELECT passed, score, total, passed_at FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND passed = 1 LIMIT 1',
      [quizId, userId]
    );
    return rows[0] || null;
  }

  /**
   * Grade a submission.
   * answers: { [questionId]: optionId }
   * Returns { passed, score, total, results: { [questionId]: { selected, correct, is_correct } } }
   */
  static async submit(quizId, userId, answers) {
    const quiz = await Quiz.getWithAnswers(quizId);
    if (!quiz) throw new Error('Quiz không tồn tại');

    const total = quiz.questions.length;
    let score = 0;
    const results = {};

    for (const q of quiz.questions) {
      const selected = Number(answers[q.question_id]);
      const correctOption = q.options.find((o) => o.is_correct);
      const isCorrect = !!correctOption && selected === correctOption.option_id;
      if (isCorrect) score++;
      results[q.question_id] = {
        selected,
        correct: correctOption?.option_id ?? null,
        is_correct: isCorrect,
      };
    }

    const passed = score === total;
    await db.execute(
      'INSERT INTO quiz_attempts (quiz_id, user_id, passed, score, total, passed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [quizId, userId, passed ? 1 : 0, score, total, passed ? new Date() : null]
    );

    return { passed, score, total, results };
  }

  // ── Teacher / Admin ──────────────────────────────────────────────────────

  /** Full quiz list with question count (for teacher dashboard) */
  static async getByCourseForTeacher(courseId) {
    const [rows] = await db.execute(
      `SELECT q.quiz_id, q.quiz_title, q.description, q.lesson_id,
              COALESCE(l.section_id, q.section_id) AS section_id,
              COALESCE(l.lesson_order, q.lesson_order) AS lesson_order,
              l.lesson_title,
              COALESCE(qc.question_count, 0) AS question_count
       FROM quizzes q
       LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
       LEFT JOIN (
         SELECT quiz_id, COUNT(*) AS question_count
         FROM quiz_questions
         GROUP BY quiz_id
       ) qc ON qc.quiz_id = q.quiz_id
       WHERE q.course_id = ? AND q.is_active = 1
       ORDER BY COALESCE(l.section_id, q.section_id), COALESCE(l.lesson_order, q.lesson_order), q.quiz_id`,
      [courseId]
    );
    return rows;
  }

  static async getActiveByLesson(lessonId) {
    const [rows] = await db.execute(
      `SELECT quiz_id, course_id, lesson_id, quiz_title
       FROM quizzes
       WHERE lesson_id = ? AND is_active = 1
       LIMIT 1`,
      [lessonId]
    );
    return rows[0] || null;
  }

  /** Insert quiz rows using an existing connection (no transaction management). */
  static async createWithConn(conn, data) {
    let sectionId = Number(data.section_id || 1);
    let lessonOrder = Number(data.lesson_order || 99);

    if (data.lesson_id) {
      const [lessonRows] = await conn.execute(
        'SELECT lesson_id, course_id, section_id, lesson_order FROM lessons WHERE lesson_id = ? AND is_active = 1',
        [data.lesson_id]
      );
      const lesson = lessonRows[0];
      if (!lesson) throw new Error('Bài học không tồn tại');
      if (String(lesson.course_id) !== String(data.course_id)) {
        throw new Error('Bài học không thuộc khóa học đã chọn');
      }

      const [existing] = await conn.execute(
        'SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND is_active = 1 LIMIT 1',
        [data.lesson_id]
      );
      if (existing.length) {
        throw new Error('Bài học này đã có bài kiểm tra');
      }

      sectionId = Number(lesson.section_id || 1);
      lessonOrder = Number(lesson.lesson_order || 1);
    }

    const [result] = await conn.execute(
      'INSERT INTO quizzes (course_id, lesson_id, section_id, lesson_order, quiz_title, description) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.course_id,
        data.lesson_id || null,
        sectionId,
        lessonOrder,
        data.quiz_title,
        data.description || '',
      ]
    );
    const quizId = result.insertId;

    for (const [qIdx, q] of (data.questions || []).entries()) {
      const [qRes] = await conn.execute(
        'INSERT INTO quiz_questions (quiz_id, question_text, question_order) VALUES (?, ?, ?)',
        [quizId, q.question_text ?? '', Number(q.question_order ?? qIdx + 1)]
      );
      const questionId = qRes.insertId;

      for (const [oIdx, o] of (q.options || []).entries()) {
        await conn.execute(
          'INSERT INTO quiz_options (question_id, option_text, is_correct, option_order) VALUES (?, ?, ?, ?)',
          [questionId, o.option_text ?? '', o.is_correct ? 1 : 0, Number(o.option_order ?? oIdx + 1)]
        );
      }
    }

    return quizId;
  }

  /** Create quiz + questions + options atomically (standalone, own transaction). */
  static async create(data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const quizId = await Quiz.createWithConn(conn, data);
      await conn.commit();
      return quizId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async softDelete(quizId) {
    await db.execute('UPDATE quizzes SET is_active = 0 WHERE quiz_id = ?', [quizId]);
  }
}

module.exports = Quiz;
