import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lessonsAPI, coursesAPI, quizzesAPI } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import QuizPlayer from '../components/QuizPlayer';

/* ── Load YouTube IFrame API once ── */
let ytApiReady = false;
let ytApiCallbacks = [];
function loadYTApi() {
  if (ytApiReady) return Promise.resolve();
  return new Promise((resolve) => {
    ytApiCallbacks.push(resolve);
    if (document.getElementById('yt-iframe-api')) return;
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      ytApiCallbacks.forEach((cb) => cb());
      ytApiCallbacks = [];
    };
  });
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
}

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export default function LearningPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [progress, setProgress] = useState({});        // { lessonId: true }
  const [quizPassed, setQuizPassed] = useState({});    // { quizId: true }
  const [videoProgress, setVideoProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 992px)').matches
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState(() => localStorage.getItem(`notes-${courseId}`) || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [toast, setToast] = useState(null);

  const playerRef = useRef(null);
  const trackerRef = useRef(null);
  const flushTimerRef = useRef(null);
  const videoProgressRef = useRef({});

  useEffect(() => {
    videoProgressRef.current = videoProgress;
  }, [videoProgress]);

  const lastTimeRef = useRef(0);
  const segStartRef = useRef(null);
  const pendingSegsRef = useRef([]);

  /* ── Merged, sorted list of lessons + quizzes ── */
  const allItems = useMemo(() => {
    const ls = lessons.map((l) => ({ ...l, type: 'lesson' }));
    const qs = quizzes.map((q) => ({ ...q, type: 'quiz' }));
    return [...ls, ...qs].sort((a, b) => {
      const sa = a.section_id || 1;
      const sb = b.section_id || 1;
      if (sa !== sb) return sa - sb;
      return (a.lesson_order || 1) - (b.lesson_order || 1);
    });
  }, [lessons, quizzes]);

  const loadCourse = useCallback(async () => {
    try {
      setAccessDenied(false);
      const courseRes = await coursesAPI.getById(courseId);
      const courseData = courseRes.data.course || courseRes.data;
      setCourse(courseData);

      if (courseData && courseData.hasPurchased === false) {
        setAccessDenied(true);
        setLessons([]);
        setQuizzes([]);
        return;
      }

      const [lessonsRes, quizzesRes] = await Promise.all([
        lessonsAPI.getByCourse(courseId),
        quizzesAPI.getByCourse(courseId).catch((err) => { console.warn('[LearningPage] Quiz load failed:', err?.response?.data || err?.message); return { data: [] }; }),
      ]);
      const lessonsList = lessonsRes.data.lessons || lessonsRes.data || [];
      const quizList = Array.isArray(quizzesRes.data) ? quizzesRes.data : [];

      setLessons(lessonsList);
      setQuizzes(quizList);

      /* lesson completion */
      let progMap = {};
      try {
        const progRes = await lessonsAPI.getProgress(courseId);
        (progRes.data || []).forEach((id) => { progMap[id] = true; });
      } catch { /* non-fatal */ }
      setProgress(progMap);

      /* quiz passed status */
      let qPassed = {};
      await Promise.all(
        quizList.map(async (q) => {
          try {
            const r = await quizzesAPI.getStatus(q.quiz_id);
            if (r.data?.passed) qPassed[q.quiz_id] = true;
          } catch { /* non-fatal */ }
        })
      );
      setQuizPassed(qPassed);

      /* video tracking progress */
      let vpMap = {};
      try {
        const vpRes = await lessonsAPI.getVideoProgress(courseId);
        (vpRes.data || []).forEach((v) => {
          vpMap[v.lesson_id] = {
            watchedPercent: v.video_watched_percent || 0,
            lastPosition: v.last_position || 0,
          };
        });
      } catch { /* non-fatal */ }
      setVideoProgress(vpMap);

      // Pick the first unlocked incomplete item to start on
      const merged = [
        ...lessonsList.map((l) => ({ ...l, type: 'lesson' })),
        ...quizList.map((q) => ({ ...q, type: 'quiz' })),
      ].sort((a, b) => {
        const sa = a.section_id || 1, sb = b.section_id || 1;
        if (sa !== sb) return sa - sb;
        return (a.lesson_order || 1) - (b.lesson_order || 1);
      });

      let startItem = merged[0] || null;
      for (let i = 0; i < merged.length; i++) {
        const item = merged[i];
        const done = item.type === 'lesson' ? progMap[item.lesson_id] : qPassed[item.quiz_id];
        if (!done) {
          if (i === 0 || item.type === 'quiz') { startItem = item; break; }
          const prev = merged[i - 1];
          const prevDone = prev.type === 'lesson' ? progMap[prev.lesson_id] : qPassed[prev.quiz_id];
          if (prevDone) { startItem = item; break; }
          break; // locked, stay on first
        }
      }

      if (startItem?.type === 'quiz') {
        setCurrentQuiz(startItem);
        setCurrentLesson(null);
      } else {
        setCurrentLesson(startItem);
        setCurrentQuiz(null);
      }
    } catch {
      setToast({ message: 'Không thể tải khóa học', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
    return () => {
      clearInterval(trackerRef.current);
      clearInterval(flushTimerRef.current);
    };
  }, [loadCourse]);

  /** True if the item at allItems[idx] is locked */
  const isItemLocked = useCallback((item) => {
    // Quizzes are always accessible — they gate themselves via submission scoring
    if (item.type === 'quiz') return false;
    const idx = allItems.findIndex((i) =>
      i.type === 'lesson' && i.lesson_id === item.lesson_id
    );
    if (idx <= 0) return false;
    const prev = allItems[idx - 1];
    return prev.type === 'lesson' ? !progress[prev.lesson_id] : !quizPassed[prev.quiz_id];
  }, [allItems, progress, quizPassed]);

  const selectItem = useCallback((item) => {
    if (isItemLocked(item)) {
      const idx = allItems.findIndex((i) =>
        item.type === 'lesson'
          ? i.type === 'lesson' && i.lesson_id === item.lesson_id
          : i.type === 'quiz' && i.quiz_id === item.quiz_id
      );
      const prev = allItems[idx - 1];
      const prevName = prev.type === 'lesson' ? prev.lesson_title : prev.quiz_title;
      setToast({ message: `🔒 Hoàn thành "${prevName}" trước khi mở bài này`, type: 'error' });
      return;
    }
    if (item.type === 'quiz') {
      setCurrentQuiz(item);
      setCurrentLesson(null);
    } else {
      setCurrentLesson(item);
      setCurrentQuiz(null);
    }
    if (window.matchMedia('(max-width: 992px)').matches) {
      setSidebarCollapsed(true);
    }
    setActiveTab('overview');
    window.scrollTo(0, 0);
  }, [isItemLocked, allItems]);

  /* ── YouTube Player ── */
  const destroyPlayer = useCallback(() => {
    clearInterval(trackerRef.current);
    trackerRef.current = null;
    clearInterval(flushTimerRef.current);
    flushTimerRef.current = null;
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    }
  }, []);

  const closeSegment = useCallback(() => {
    if (segStartRef.current != null && lastTimeRef.current > segStartRef.current) {
      pendingSegsRef.current.push([
        Math.round(segStartRef.current),
        Math.round(lastTimeRef.current),
      ]);
    }
    segStartRef.current = null;
  }, []);

  const flushSegments = useCallback(async () => {
    const p = playerRef.current;
    if (!p || !currentLesson) return;
    try {
      const duration = p.getDuration();
      const current = p.getCurrentTime();
      if (!duration || duration <= 0) return;

      const diff = current - lastTimeRef.current;
      if (diff < -0.5 || diff > 3.5) {
        closeSegment();
      } else {
        lastTimeRef.current = current;
        closeSegment();
      }
      lastTimeRef.current = current;
      segStartRef.current = current;

      if (pendingSegsRef.current.length === 0) return;
      const segs = pendingSegsRef.current.splice(0);

      try {
        const res = await lessonsAPI.updateVideoProgress(
          courseId, currentLesson.lesson_id, segs, Math.round(duration), Math.round(current)
        );
        setVideoProgress((prev) => ({
          ...prev,
          [currentLesson.lesson_id]: {
            watchedPercent: res.data.videoWatchedPercent ?? 0,
            lastPosition: Math.round(current),
          },
        }));
        if (res.data.autoCompleted) {
          setProgress((prev) => ({ ...prev, [currentLesson.lesson_id]: true }));
          setToast({ message: '🎉 Đã xem hết video — bài học tự động hoàn thành!', type: 'success' });
          const idx = allItems.findIndex((i) => i.type === 'lesson' && i.lesson_id === currentLesson.lesson_id);
          if (idx >= 0 && idx < allItems.length - 1) {
            setTimeout(() => selectItem(allItems[idx + 1]), 1500);
          }
        }
      } catch (err) {
        pendingSegsRef.current.unshift(...segs);
        console.warn('Failed to flush video segments, will retry:', err);
      }
    } catch { /* player destroyed */ }
  }, [closeSegment, courseId, currentLesson, allItems, selectItem]);

  const pollTracker = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const current = p.getCurrentTime();
    const diff = current - lastTimeRef.current;
    if (diff < -0.5 || diff > 3.5) {
      closeSegment();
      segStartRef.current = current;
    } else if (segStartRef.current == null) {
      segStartRef.current = current;
    }
    lastTimeRef.current = current;
  }, [closeSegment]);

  useEffect(() => {
    if (!currentLesson) { destroyPlayer(); return; }
    const ytId = getYouTubeId(currentLesson.video_url);
    if (!ytId) { destroyPlayer(); return; }

    lastTimeRef.current = 0;
    segStartRef.current = null;
    pendingSegsRef.current = [];

    let cancelled = false;
    loadYTApi().then(() => {
      if (cancelled) return;
      destroyPlayer();
      const startAt = videoProgressRef.current[currentLesson.lesson_id]?.lastPosition || 0;
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: ytId,
        playerVars: { rel: 0, start: startAt, autoplay: 0, modestbranding: 1 },
        events: {
          onReady: () => { lastTimeRef.current = startAt; },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              const cur = playerRef.current.getCurrentTime();
              segStartRef.current = cur;
              lastTimeRef.current = cur;
              if (!trackerRef.current) trackerRef.current = setInterval(pollTracker, 2000);
              if (!flushTimerRef.current) flushTimerRef.current = setInterval(flushSegments, 10000);
            } else if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              const cur = playerRef.current?.getCurrentTime?.() ?? lastTimeRef.current;
              const diff = cur - lastTimeRef.current;
              if (diff < -0.5 || diff > 3.5) closeSegment();
              else { lastTimeRef.current = cur; closeSegment(); }
              lastTimeRef.current = cur;
              clearInterval(trackerRef.current); trackerRef.current = null;
              clearInterval(flushTimerRef.current); flushTimerRef.current = null;
              flushSegments();
            }
          },
        },
      });
    });
    return () => { cancelled = true; destroyPlayer(); };
  }, [closeSegment, currentLesson, destroyPlayer, flushSegments, pollTracker]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setToast({ message: 'Đã sao chép đường dẫn!', type: 'success' });
  };

  /* ── Progress counts ── */
  const completedLessons = Object.values(progress).filter(Boolean).length;
  const passedQuizCount  = Object.values(quizPassed).filter(Boolean).length;
  const completedCount   = completedLessons + passedQuizCount;
  const totalCount       = allItems.length;
  const progressPercent  = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /* ── Group allItems by section for sidebar ── */
  const sections = {};
  allItems.forEach((item) => {
    const sid = item.section_id || 1;
    if (!sections[sid]) sections[sid] = [];
    sections[sid].push(item);
  });
  const sectionKeys = Object.keys(sections).sort((a, b) => a - b);

  /* ── Current item index in allItems ── */
  const currentItemIdx = allItems.findIndex((i) =>
    currentLesson
      ? i.type === 'lesson' && i.lesson_id === currentLesson.lesson_id
      : currentQuiz
        ? i.type === 'quiz' && i.quiz_id === currentQuiz.quiz_id
        : false
  );

  if (loading) return <LoadingSpinner />;

  if (!course) {
    return (
      <main className="container text-center" style={{ padding: '80px 0' }}>
        <h2>Không tìm thấy khóa học</h2>
        <Link to="/account" className="btn btn-primary" style={{ marginTop: '16px' }}>Quay lại</Link>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="container text-center" style={{ padding: '80px 0' }}>
        <h2>Bạn chưa mua khóa học này</h2>
        <p style={{ color: '#64748b', marginTop: 8 }}>
          Vui lòng mua khóa học trước khi truy cập nội dung bài học và bài kiểm tra.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <Link to={`/course/${courseId}`} className="btn btn-primary">Xem chi tiết khóa học</Link>
          <Link to="/search" className="btn btn-outline">Tìm khóa học khác</Link>
        </div>
      </main>
    );
  }

  const ytId = currentLesson ? getYouTubeId(currentLesson.video_url) : null;

  return (
    <>
      {/* ====== Header ====== */}
      <header className="learning-header">
        <div className="container learning-nav">
          <div className="learning-nav-left">
            <button className="btn-toggle-sidebar" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar" aria-expanded={!sidebarCollapsed}>
              <span /><span /><span />
            </button>
            <Link className="brand" to="/">PTIT <strong>LEARNING</strong></Link>
          </div>
          <div className="learning-nav-right">
            <button className="btn-share" onClick={copyLink}>📋 Chia sẻ</button>
            <Link to="/account" className="btn-back-learn">← Quay lại</Link>
          </div>
        </div>
      </header>

      {/* ====== Layout ====== */}
      <div className="learning-layout">
        <div className={`learning-backdrop ${sidebarCollapsed ? '' : 'show'}`} onClick={() => setSidebarCollapsed(true)} />

        {/* ---- Sidebar ---- */}
        <aside className={`learning-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h2 className="course-title">{course.course_name}</h2>
            <div className="course-progress">
              <div className="progress-info">
                <span>✓ Đã hoàn thành {completedCount}/{totalCount}</span>
                <span className="progress-percent">{progressPercent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="sidebar-content">
            {sectionKeys.map((sectionId) => (
              <div className="lesson-section" key={sectionId}>
                {sectionKeys.length > 1 && <div className="section-title">Phần {sectionId}</div>}
                <div className="section-lessons">
                  {sections[sectionId].map((item) => {
                    const isLesson    = item.type === 'lesson';
                    const isActive    = isLesson
                      ? currentLesson?.lesson_id === item.lesson_id
                      : currentQuiz?.quiz_id === item.quiz_id;
                    const isCompleted = isLesson ? progress[item.lesson_id] : quizPassed[item.quiz_id];
                    const locked      = isItemLocked(item);

                    return (
                      <div
                        key={isLesson ? `l-${item.lesson_id}` : `q-${item.quiz_id}`}
                        className={`lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${locked ? 'locked' : ''}`}
                        onClick={() => selectItem(item)}
                        title={locked ? 'Hoàn thành bài trước để mở khóa' : ''}
                      >
                        <span className="lesson-icon">
                          {locked ? '🔒' : isCompleted ? '✅' : isActive ? (isLesson ? '▶️' : '📝') : (isLesson ? '📄' : '📝')}
                        </span>
                        <div className="lesson-name-wrap">
                          <span className="lesson-name">{isLesson ? item.lesson_title : item.quiz_title}</span>
                          {!isLesson && (
                            <span className="lesson-type-label">Bài kiểm tra</span>
                          )}
                          {isLesson && videoProgress[item.lesson_id]?.watchedPercent > 0 && (
                            <div className="video-progress-mini">
                              <div className="video-progress-bar">
                                <div className="video-progress-fill" style={{ width: `${videoProgress[item.lesson_id].watchedPercent}%` }} />
                              </div>
                              <span className="video-progress-text">{videoProgress[item.lesson_id].watchedPercent}%</span>
                            </div>
                          )}
                        </div>
                        <span className="status-icon">{isLesson ? (item.duration || '') : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <main className="learning-main">

          {/* ── Quiz view ── */}
          {currentQuiz && (
            <div className="quiz-main-wrap">
              <QuizPlayer
                quizItem={currentQuiz}
                isPassed={!!quizPassed[currentQuiz.quiz_id]}
                onPassed={(quizId) => {
                  setQuizPassed((prev) => ({ ...prev, [quizId]: true }));
                  setToast({ message: '🎉 Hoàn thành bài kiểm tra!', type: 'success' });
                  // auto-advance to next item
                  const idx = allItems.findIndex((i) => i.type === 'quiz' && i.quiz_id === quizId);
                  if (idx >= 0 && idx < allItems.length - 1) {
                    setTimeout(() => selectItem(allItems[idx + 1]), 1800);
                  }
                }}
              />
              {/* Prev / Next navigation */}
              <div className="learning-nav-actions">
                {currentItemIdx > 0 && (
                  <button className="btn-back-learn" onClick={() => selectItem(allItems[currentItemIdx - 1])}>
                    ← Trước
                  </button>
                )}
                {currentItemIdx < allItems.length - 1 && (
                  <button
                    className="btn-back-learn"
                    onClick={() => selectItem(allItems[currentItemIdx + 1])}
                    disabled={isItemLocked(allItems[currentItemIdx + 1])}
                  >
                    {isItemLocked(allItems[currentItemIdx + 1]) ? '🔒 Tiếp' : 'Tiếp →'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Lesson view ── */}
          {currentLesson && (
            <>
              <div className="video-container">
                <div className="video-wrapper">
                  {ytId ? (
                    <div id="yt-player" style={{ width: '100%', height: '100%' }} />
                  ) : currentLesson.video_url ? (
                    <video controls src={currentLesson.video_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }}>
                      Trình duyệt không hỗ trợ video
                    </video>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexDirection: 'column', gap: 12 }}>
                      <span style={{ fontSize: 48 }}>📹</span>
                      <p style={{ fontSize: 16 }}>Bài học này chưa có video</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lesson-info">
                <div className="lesson-header">
                  <div className="lesson-badge">{currentItemIdx + 1}</div>
                  <div className="lesson-details">
                    <h1 className="lesson-title">{currentLesson.lesson_title}</h1>
                    <div className="lesson-action-row">
                      <button className="btn-copy" onClick={copyLink}>📋 Sao chép đường dẫn</button>
                      {(() => {
                        const vp = videoProgress[currentLesson.lesson_id];
                        const watched = vp?.watchedPercent || 0;
                        const done = progress[currentLesson.lesson_id];
                        if (done) return <span className="learning-status-chip learning-status-chip--done">✓ Đã hoàn thành</span>;
                        if (watched > 0) return <span className="learning-status-chip">🎬 Đã xem {watched}%</span>;
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="lesson-tabs">
                  {['overview', 'notes', 'qa'].map((tab) => (
                    <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                      {tab === 'overview' ? 'Tổng quan' : tab === 'notes' ? 'Ghi chú' : 'Hỏi đáp'}
                    </button>
                  ))}
                </div>

                <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
                  <div className="lesson-description">
                    <h3>Mô tả bài học</h3>
                    {currentLesson.lesson_content ? (
                      <div dangerouslySetInnerHTML={{ __html: escapeHtml(currentLesson.lesson_content) }} />
                    ) : (
                      <p>Nội dung bài học sẽ được cập nhật sớm.</p>
                    )}
                    <div className="learning-nav-actions learning-nav-actions--content">
                      {currentItemIdx > 0 && (
                        <button className="btn-back-learn" onClick={() => selectItem(allItems[currentItemIdx - 1])}>
                          ← Bài trước
                        </button>
                      )}
                      {currentItemIdx < allItems.length - 1 && (
                        <button
                          className="btn-back-learn"
                          onClick={() => selectItem(allItems[currentItemIdx + 1])}
                          disabled={isItemLocked(allItems[currentItemIdx + 1])}
                        >
                          {isItemLocked(allItems[currentItemIdx + 1]) ? '🔒 Bài tiếp' : 'Bài tiếp →'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`tab-content ${activeTab === 'notes' ? 'active' : ''}`}>
                  <div className="notes-section">
                    <h3>Ghi chú của tôi</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Ghi chú được lưu trên trình duyệt này.</p>
                    <textarea
                      className="notes-textarea"
                      placeholder="Nhập ghi chú của bạn tại đây..."
                      rows="10"
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                    />
                    <div className="notes-actions">
                      <button className="btn-save-notes" onClick={() => { localStorage.setItem(`notes-${courseId}`, notes); setNotesSaved(true); }}>
                        💾 Lưu ghi chú
                      </button>
                      {notesSaved && <span className="notes-saved">✓ Đã lưu</span>}
                    </div>
                  </div>
                </div>

                <div className={`tab-content ${activeTab === 'qa' ? 'active' : ''}`}>
                  <div className="qa-section">
                    <h3>Hỏi đáp</h3>
                    <div className="learning-empty-panel">
                      <div className="learning-empty-icon">🚧</div>
                      <p className="learning-empty-title">Tính năng đang phát triển</p>
                      <p className="learning-empty-text">Chức năng hỏi đáp sẽ sớm ra mắt. Trong thời gian chờ đợi, hãy liên hệ giảng viên qua trang <a href="/contact">Liên hệ</a>.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!currentLesson && !currentQuiz && (
            <div className="learning-empty-panel learning-empty-panel--page"><p className="learning-empty-title">Khóa học chưa có bài học nào</p></div>
          )}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
