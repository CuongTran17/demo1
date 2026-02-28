import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lessonsAPI, coursesAPI } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function LearningPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const [courseRes, lessonsRes] = await Promise.all([
        coursesAPI.getById(courseId),
        lessonsAPI.getByCourse(courseId),
      ]);
      const courseData = courseRes.data.course || courseRes.data;
      const lessonsList = lessonsRes.data.lessons || lessonsRes.data || [];

      setCourse(courseData);
      setLessons(lessonsList);

      // Load progress - API returns array of completed lesson_ids
      let progMap = {};
      try {
        const progRes = await lessonsAPI.getProgress(courseId);
        const progData = progRes.data || [];
        progData.forEach((lessonId) => {
          progMap[lessonId] = true;
        });
      } catch {}
      setProgress(progMap);

      // Select first incomplete lesson or first lesson
      const firstIncomplete = lessonsList.find((l) => !progMap[l.lesson_id]);
      setCurrentLesson(firstIncomplete || lessonsList[0] || null);
    } catch {
      setToast({ message: 'Không thể tải khóa học', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectLesson = (lesson) => {
    setCurrentLesson(lesson);
    window.scrollTo(0, 0);
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  const toggleComplete = async (lessonId) => {
    const isCompleted = progress[lessonId];
    try {
      if (isCompleted) {
        await lessonsAPI.resetProgress(courseId, lessonId);
        setProgress((prev) => ({ ...prev, [lessonId]: false }));
        setToast({ message: 'Đã đánh dấu chưa hoàn thành', type: 'info' });
      } else {
        await lessonsAPI.markComplete(courseId, lessonId);
        setProgress((prev) => ({ ...prev, [lessonId]: true }));
        setToast({ message: 'Đã hoàn thành bài học!', type: 'success' });

        // Auto-next
        const idx = lessons.findIndex((l) => l.lesson_id === lessonId);
        if (idx < lessons.length - 1) {
          setTimeout(() => selectLesson(lessons[idx + 1]), 1000);
        }
      }
    } catch {
      setToast({ message: 'Lỗi cập nhật tiến độ', type: 'error' });
    }
  };

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) return <LoadingSpinner />;

  if (!course) {
    return (
      <main className="container text-center" style={{ padding: '80px 0' }}>
        <h2>Không tìm thấy khóa học</h2>
        <Link to="/account" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Quay lại
        </Link>
      </main>
    );
  }

  const ytId = currentLesson ? getYouTubeId(currentLesson.video_url) : null;

  return (
    <div className="learning-layout">
      {/* Sidebar */}
      <aside className={`learning-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>{course.course_name}</h3>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <div className="progress-section">
          <div className="progress-info">
            <span>Tiến độ: {completedCount}/{totalCount}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="lesson-list">
          {lessons.map((lesson, idx) => (
            <button
              key={lesson.lesson_id}
              className={`lesson-item ${currentLesson?.lesson_id === lesson.lesson_id ? 'active' : ''} ${progress[lesson.lesson_id] ? 'completed' : ''}`}
              onClick={() => selectLesson(lesson)}
            >
              <span className="lesson-number">{idx + 1}</span>
              <span className="lesson-name">{lesson.lesson_title}</span>
              {progress[lesson.lesson_id] && <span className="lesson-check">✓</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="learning-main">
        {!sidebarOpen && (
          <button className="sidebar-floating-toggle" onClick={() => setSidebarOpen(true)}>
            ☰ Danh sách bài học
          </button>
        )}

        {currentLesson ? (
          <>
            <div className="video-container" ref={playerRef}>
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                  title={currentLesson.lesson_title}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              ) : currentLesson.video_url ? (
                <video controls src={currentLesson.video_url}>
                  Trình duyệt không hỗ trợ video
                </video>
              ) : (
                <div className="no-video">
                  <span>📹</span>
                  <p>Bài học này chưa có video</p>
                </div>
              )}
            </div>

            <div className="lesson-content-section">
              <div className="lesson-header">
                <h2>{currentLesson.lesson_title}</h2>
                <button
                  className={`btn ${progress[currentLesson.lesson_id] ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => toggleComplete(currentLesson.lesson_id)}
                >
                  {progress[currentLesson.lesson_id] ? '↩ Đánh dấu chưa hoàn thành' : '✓ Hoàn thành bài học'}
                </button>
              </div>

              {currentLesson.lesson_content && (
                <div className="lesson-text-content">
                  <p>{currentLesson.lesson_content}</p>
                </div>
              )}

              <div className="lesson-nav">
                {lessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id) > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      selectLesson(
                        lessons[lessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id) - 1]
                      )
                    }
                  >
                    ← Bài trước
                  </button>
                )}
                {lessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id) < lessons.length - 1 && (
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      selectLesson(
                        lessons[lessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id) + 1]
                      )
                    }
                  >
                    Bài tiếp →
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center" style={{ padding: '80px' }}>
            <p style={{ color: '#666' }}>Khóa học chưa có bài học nào</p>
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
