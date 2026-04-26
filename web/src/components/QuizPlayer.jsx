import { useState, useEffect } from 'react';
import { quizzesAPI } from '../api';

/**
 * Renders a quiz inline within LearningPage.
 *
 * Props:
 *   quizItem   — the sidebar quiz object (quiz_id, quiz_title, …)
 *   isPassed   — boolean, true if user has already passed
 *   onPassed   — callback(quizId) after the user passes for the first time
 */
export default function QuizPlayer({ quizItem, isPassed, onPassed }) {
  const [phase, setPhase] = useState(isPassed ? 'passed' : 'loading');
  // 'loading' | 'taking' | 'result' | 'passed' | 'review'

  const [quiz, setQuiz] = useState(null);           // questions without answers
  const [reviewQuiz, setReviewQuiz] = useState(null); // questions with correct answers
  const [answers, setAnswers] = useState({});        // { [questionId]: optionId }
  const [result, setResult] = useState(null);        // { passed, score, total, results }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPassed) {
      setPhase('passed');
    } else {
      loadQuiz();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizItem.quiz_id, isPassed]);

  const loadQuiz = async () => {
    setPhase('loading');
    try {
      const res = await quizzesAPI.getById(quizItem.quiz_id);
      setQuiz(res.data);
      setAnswers({});
      setResult(null);
      setPhase('taking');
    } catch {
      setPhase('error');
    }
  };

  const loadReview = async () => {
    try {
      const res = await quizzesAPI.getReview(quizItem.quiz_id);
      setReviewQuiz(res.data);
      setPhase('review');
    } catch {
      // fallback: no review data
    }
  };

  const handleSelect = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const allAnswered = quiz
    ? quiz.questions.every((q) => answers[q.question_id] !== undefined)
    : false;

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      const res = await quizzesAPI.submit(quizItem.quiz_id, answers);
      setResult(res.data);
      if (res.data.passed) {
        setPhase('justPassed');
        onPassed?.(quizItem.quiz_id);
      } else {
        setPhase('result');
      }
    } catch {
      // stay in taking phase
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setPhase('taking');
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="quiz-player quiz-player--loading">
        <div className="quiz-loading-dot" /><div className="quiz-loading-dot" /><div className="quiz-loading-dot" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="quiz-player quiz-player--error">
        <p>Không thể tải bài kiểm tra.</p>
        <button className="btn btn-outline" onClick={loadQuiz}>Thử lại</button>
      </div>
    );
  }

  if (phase === 'passed') {
    return (
      <div className="quiz-player quiz-player--passed">
        <div className="quiz-passed-icon">✅</div>
        <h2>Đã hoàn thành bài kiểm tra</h2>
        <p className="quiz-passed-sub">Bạn đã trả lời đúng tất cả câu hỏi.</p>
        <button className="btn btn-outline" onClick={loadReview}>
          Xem lại đáp án
        </button>
      </div>
    );
  }

  if (phase === 'justPassed') {
    return (
      <div className="quiz-player quiz-player--just-passed">
        <div className="quiz-passed-icon quiz-passed-icon--anim">✅</div>
        <h2>Xuất sắc! Bạn đã vượt qua bài kiểm tra!</h2>
        <p className="quiz-passed-sub">
          Trả lời đúng {result?.score}/{result?.total} câu — hoàn thành 100%
        </p>
        <button className="btn btn-outline" onClick={loadReview}>
          Xem lại đáp án
        </button>
      </div>
    );
  }

  if (phase === 'review' && reviewQuiz) {
    return (
      <div className="quiz-player">
        <div className="quiz-header">
          <span className="quiz-badge">📝 Bài kiểm tra</span>
          <h2 className="quiz-title">{reviewQuiz.quiz_title}</h2>
          <p className="quiz-desc">Chế độ xem lại — đáp án đúng được tô xanh.</p>
        </div>

        <div className="quiz-questions">
          {reviewQuiz.questions.map((q, idx) => (
            <div key={q.question_id} className="quiz-question">
              <div className="quiz-question-text">
                <span className="quiz-q-num">Câu {idx + 1}</span>
                {q.question_text}
              </div>
              <div className="quiz-options">
                {q.options.map((o) => (
                  <div
                    key={o.option_id}
                    className={`quiz-option quiz-option--review ${o.is_correct ? 'quiz-option--correct' : ''}`}
                  >
                    <span className="quiz-option-indicator">
                      {o.is_correct ? '✓' : '○'}
                    </span>
                    {o.option_text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-footer">
          <button className="btn btn-outline" onClick={() => setPhase(isPassed ? 'passed' : 'taking')}>
            ← Đóng xem lại
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result && quiz) {
    // Failed — show which answers were wrong
    return (
      <div className="quiz-player">
        <div className="quiz-header">
          <span className="quiz-badge">📝 Bài kiểm tra</span>
          <h2 className="quiz-title">{quiz.quiz_title}</h2>
          <div className="quiz-result-banner quiz-result-banner--fail">
            Sai {result.total - result.score}/{result.total} câu — cần đúng 100% để qua
          </div>
        </div>

        <div className="quiz-questions">
          {quiz.questions.map((q, idx) => {
            const qResult = result.results[q.question_id];
            return (
              <div key={q.question_id} className="quiz-question">
                <div className="quiz-question-text">
                  <span className="quiz-q-num">Câu {idx + 1}</span>
                  {q.question_text}
                </div>
                <div className="quiz-options">
                  {q.options.map((o) => {
                    const isSelected = qResult?.selected === o.option_id;
                    const isCorrect  = qResult?.correct  === o.option_id;
                    let cls = 'quiz-option';
                    if (isCorrect) cls += ' quiz-option--correct';
                    else if (isSelected && !qResult?.is_correct) cls += ' quiz-option--wrong';
                    return (
                      <div key={o.option_id} className={cls}>
                        <span className="quiz-option-indicator">
                          {isCorrect ? '✓' : isSelected ? '✗' : '○'}
                        </span>
                        {o.option_text}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="quiz-footer">
          <button className="btn btn-primary" onClick={handleRetry}>
            Làm lại
          </button>
        </div>
      </div>
    );
  }

  // phase === 'taking'
  if (!quiz) return null;
  return (
    <div className="quiz-player">
      <div className="quiz-header">
        <span className="quiz-badge">📝 Bài kiểm tra</span>
        <h2 className="quiz-title">{quiz.quiz_title}</h2>
        {quiz.description && <p className="quiz-desc">{quiz.description}</p>}
        <div className="quiz-progress-line">
          {Object.keys(answers).length}/{quiz.questions.length} câu đã trả lời
        </div>
      </div>

      <div className="quiz-questions">
        {quiz.questions.map((q, idx) => (
          <div key={q.question_id} className="quiz-question">
            <div className="quiz-question-text">
              <span className="quiz-q-num">Câu {idx + 1}/{quiz.questions.length}</span>
              {q.question_text}
            </div>
            <div className="quiz-options">
              {q.options.map((o) => {
                const selected = answers[q.question_id] === o.option_id;
                return (
                  <button
                    key={o.option_id}
                    className={`quiz-option quiz-option--btn ${selected ? 'quiz-option--selected' : ''}`}
                    onClick={() => handleSelect(q.question_id, o.option_id)}
                  >
                    <span className="quiz-option-indicator">{selected ? '●' : '○'}</span>
                    {o.option_text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="quiz-footer">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
        >
          {submitting ? 'Đang chấm...' : 'Nộp bài'}
        </button>
        {!allAnswered && (
          <span className="quiz-hint">Trả lời tất cả câu hỏi trước khi nộp bài</span>
        )}
      </div>
    </div>
  );
}
