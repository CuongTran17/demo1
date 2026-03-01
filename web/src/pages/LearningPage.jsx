import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lessonsAPI, coursesAPI } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

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

export default function LearningPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState({});
  const [videoProgress, setVideoProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState(null);

  const playerRef = useRef(null);
  const trackerRef = useRef(null);
  const flushTimerRef = useRef(null);
  const playerContainerRef = useRef(null);

  /* ── Segment-based tracking state (refs to avoid stale closures) ── */
  const lastTimeRef = useRef(0);       // last known player time
  const segStartRef = useRef(null);    // start of current playing segment
  const pendingSegsRef = useRef([]);   // segments not yet sent to server

  useEffect(() => {
    loadCourse();
    return () => {
      clearInterval(trackerRef.current);
      clearInterval(flushTimerRef.current);
    };
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

      /* completion progress */
      let progMap = {};
      try {
        const progRes = await lessonsAPI.getProgress(courseId);
        const progData = progRes.data || [];
        progData.forEach((lessonId) => { progMap[lessonId] = true; });
      } catch {}
      setProgress(progMap);

      /* video tracking progress */
      let vpMap = {};
      try {
        const vpRes = await lessonsAPI.getVideoProgress(courseId);
        const vpData = vpRes.data || [];
        vpData.forEach((v) => {
          vpMap[v.lesson_id] = {
            watchedPercent: v.video_watched_percent || 0,
            lastPosition: v.last_position || 0,
          };
        });
      } catch {}
      setVideoProgress(vpMap);

      // Pick first unlocked incomplete lesson
      let startLesson = lessonsList[0] || null;
      for (let i = 0; i < lessonsList.length; i++) {
        if (!progMap[lessonsList[i].lesson_id]) {
          // This is incomplete — check if it's unlocked (first OR previous completed)
          if (i === 0 || progMap[lessonsList[i - 1].lesson_id]) {
            startLesson = lessonsList[i];
          }
          break;
        }
      }
      setCurrentLesson(startLesson);
    } catch {
      setToast({ message: 'Không thể tải khóa học', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  /** Check if a lesson is locked (previous lesson must be completed first) */
  const isLessonLocked = useCallback((lesson) => {
    const idx = lessons.findIndex((l) => l.lesson_id === lesson.lesson_id);
    if (idx <= 0) return false; // first lesson is always unlocked
    const prevLesson = lessons[idx - 1];
    return !progress[prevLesson.lesson_id];
  }, [lessons, progress]);

  const selectLesson = (lesson) => {
    if (isLessonLocked(lesson)) {
      const idx = lessons.findIndex((l) => l.lesson_id === lesson.lesson_id);
      const prevLesson = lessons[idx - 1];
      setToast({
        message: `🔒 Bạn cần hoàn thành bài "${prevLesson.lesson_title}" trước khi mở bài này`,
        type: 'error',
      });
      return;
    }
    setCurrentLesson(lesson);
    setActiveTab('overview');
    window.scrollTo(0, 0);
  };

  /* ── YouTube Player creation & tracking ── */
  const destroyPlayer = useCallback(() => {
    clearInterval(trackerRef.current);
    trackerRef.current = null;
    clearInterval(flushTimerRef.current);
    flushTimerRef.current = null;
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
  }, []);

  /** Close the current playing segment and push it to pendingSegs */
  const closeSegment = useCallback(() => {
    if (segStartRef.current != null && lastTimeRef.current > segStartRef.current) {
      pendingSegsRef.current.push([
        Math.round(segStartRef.current),
        Math.round(lastTimeRef.current),
      ]);
    }
    segStartRef.current = null;
  }, []);

  /** Send accumulated segments to backend */
  const flushSegments = useCallback(async () => {
    const p = playerRef.current;
    if (!p || !currentLesson) return;
    try {
      const duration = p.getDuration();
      const current = p.getCurrentTime();
      if (!duration || duration <= 0) return;

      // Close the active segment — but detect seek first
      const diff = current - lastTimeRef.current;
      if (diff < -0.5 || diff > 3.5) {
        // Seek happened since last poll — close at old position
        closeSegment();
      } else {
        lastTimeRef.current = current;
        closeSegment();
      }
      lastTimeRef.current = current;
      segStartRef.current = current; // reopen for continued playback

      const segs = pendingSegsRef.current.splice(0); // take & clear
      if (segs.length === 0) return;

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
        // Auto-advance to next lesson after 1.5s
        const idx = lessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id);
        if (idx >= 0 && idx < lessons.length - 1) {
          setTimeout(() => {
            setCurrentLesson(lessons[idx + 1]);
            setActiveTab('overview');
            window.scrollTo(0, 0);
          }, 1500);
        }
      }
    } catch {}
  }, [courseId, currentLesson]);

  /** Called every ~2s while video plays — detects seek */
  const pollTracker = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const current = p.getCurrentTime();
    const diff = current - lastTimeRef.current;

    // Normal playback: diff is roughly 0–3s (poll interval).
    // Seek detected if jumped forward/backward by >3.5s
    if (diff < -0.5 || diff > 3.5) {
      // Seek happened — close previous segment, start new one
      closeSegment();
      segStartRef.current = current;
    } else if (segStartRef.current == null) {
      segStartRef.current = current;
    }
    lastTimeRef.current = current;
  }, [closeSegment]);

  useEffect(() => {
    if (!currentLesson) return;
    const ytId = getYouTubeId(currentLesson.video_url);
    if (!ytId) { destroyPlayer(); return; }

    // Reset segment tracking for new lesson
    lastTimeRef.current = 0;
    segStartRef.current = null;
    pendingSegsRef.current = [];

    let cancelled = false;
    loadYTApi().then(() => {
      if (cancelled) return;
      destroyPlayer();
      const startAt = videoProgress[currentLesson.lesson_id]?.lastPosition || 0;
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: ytId,
        playerVars: { rel: 0, start: startAt, autoplay: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            lastTimeRef.current = startAt;
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              // Start a new segment
              const cur = playerRef.current.getCurrentTime();
              segStartRef.current = cur;
              lastTimeRef.current = cur;
              if (!trackerRef.current) {
                trackerRef.current = setInterval(() => {
                  pollTracker();
                }, 2000);
              }
              // Auto-flush every 10s while playing
              if (!flushTimerRef.current) {
                flushTimerRef.current = setInterval(() => {
                  flushSegments();
                }, 10000);
              }
            } else if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              const cur = playerRef.current?.getCurrentTime?.() ?? lastTimeRef.current;
              const diff = cur - lastTimeRef.current;

              // Seek detected — close segment at the LAST KNOWN position (before seek)
              if (diff < -0.5 || diff > 3.5) {
                closeSegment(); // uses old lastTimeRef → correct end
              } else {
                lastTimeRef.current = cur; // small natural advance
                closeSegment();
              }
              lastTimeRef.current = cur; // update for next usage
              clearInterval(trackerRef.current);
              trackerRef.current = null;
              clearInterval(flushTimerRef.current);
              flushTimerRef.current = null;
              flushSegments();
            }
          },
        },
      });
    });

    return () => { cancelled = true; destroyPlayer(); };
  }, [currentLesson?.lesson_id]);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setToast({ message: 'Đã sao chép đường dẫn!', type: 'success' });
  };

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /* Group lessons by section_id */
  const sections = {};
  lessons.forEach((lesson) => {
    const sid = lesson.section_id || 1;
    if (!sections[sid]) sections[sid] = [];
    sections[sid].push(lesson);
  });
  const sectionKeys = Object.keys(sections).sort((a, b) => a - b);

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
  const currentIdx = currentLesson
    ? lessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id)
    : -1;

  return (
    <>
      {/* ====== Learning Header ====== */}
      <header className="learning-header">
        <div className="container learning-nav">
          <div className="learning-nav-left">
            <button
              className="btn-toggle-sidebar"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle sidebar"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <Link className="brand" to="/">
              PTIT <strong>LEARNING</strong>
            </Link>
          </div>

          <div className="learning-nav-right">
            <button className="btn-share" onClick={copyLink}>
              📋 Chia sẻ
            </button>
            <Link to="/account" className="btn-back-learn">
              ← Quay lại
            </Link>
          </div>
        </div>
      </header>

      {/* ====== Layout ====== */}
      <div className="learning-layout">
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
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          <div className="sidebar-content">
            {sectionKeys.map((sectionId) => (
              <div className="lesson-section" key={sectionId}>
                {sectionKeys.length > 1 && (
                  <div className="section-title">Phần {sectionId}</div>
                )}
                <div className="section-lessons">
                  {sections[sectionId].map((lesson) => {
                    const isActive = currentLesson?.lesson_id === lesson.lesson_id;
                    const isCompleted = progress[lesson.lesson_id];
                    const locked = isLessonLocked(lesson);
                    return (
                      <div
                        key={lesson.lesson_id}
                        className={`lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${locked ? 'locked' : ''}`}
                        onClick={() => selectLesson(lesson)}
                        title={locked ? 'Hoàn thành bài trước để mở khóa' : ''}
                      >
                        <span className="lesson-icon">
                          {locked ? '🔒' : isCompleted ? '✅' : isActive ? '▶️' : '📄'}
                        </span>
                        <div className="lesson-name-wrap">
                          <span className="lesson-name">{lesson.lesson_title}</span>
                          {videoProgress[lesson.lesson_id] && videoProgress[lesson.lesson_id].watchedPercent > 0 && (
                            <div className="video-progress-mini">
                              <div className="video-progress-bar">
                                <div
                                  className="video-progress-fill"
                                  style={{ width: `${videoProgress[lesson.lesson_id].watchedPercent}%` }}
                                />
                              </div>
                              <span className="video-progress-text">
                                {videoProgress[lesson.lesson_id].watchedPercent}%
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="status-icon">{lesson.duration || ''}</span>
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
          {currentLesson ? (
            <>
              {/* Video */}
              <div className="video-container">
                <div className="video-wrapper">
                  {ytId ? (
                    <div id="yt-player" style={{ width: '100%', height: '100%' }} />
                  ) : currentLesson.video_url ? (
                    <video
                      controls
                      src={currentLesson.video_url}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    >
                      Trình duyệt không hỗ trợ video
                    </video>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#888',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 48 }}>📹</span>
                      <p style={{ fontSize: 16 }}>Bài học này chưa có video</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesson Info */}
              <div className="lesson-info">
                <div className="lesson-header">
                  <div className="lesson-badge">{currentIdx + 1}</div>
                  <div className="lesson-details">
                    <h1 className="lesson-title">{currentLesson.lesson_title}</h1>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="btn-copy" onClick={copyLink}>
                        📋 Sao chép đường dẫn
                      </button>
                      {(() => {
                        const vp = videoProgress[currentLesson.lesson_id];
                        const watched = vp?.watchedPercent || 0;
                        const done = progress[currentLesson.lesson_id];
                        if (done) {
                          return (
                            <span className="btn-copy" style={{ background: '#27ae60', color: '#fff', borderColor: '#27ae60', cursor: 'default' }}>
                              ✓ Đã hoàn thành
                            </span>
                          );
                        }
                        if (watched > 0) {
                          return (
                            <span className="btn-copy" style={{ cursor: 'default', fontWeight: 500 }}>
                              🎬 Đã xem {watched}%
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="lesson-tabs">
                  {['overview', 'notes', 'qa'].map((tab) => (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'overview' ? 'Tổng quan' : tab === 'notes' ? 'Ghi chú' : 'Hỏi đáp'}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
                  <div className="lesson-description">
                    <h3>Mô tả bài học</h3>
                    {currentLesson.lesson_content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentLesson.lesson_content.replace(/\n/g, '<br/>'),
                        }}
                      />
                    ) : (
                      <p>Nội dung bài học sẽ được cập nhật sớm.</p>
                    )}

                    <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {currentIdx > 0 && (
                        <button
                          className="btn-back-learn"
                          onClick={() => selectLesson(lessons[currentIdx - 1])}
                        >
                          ← Bài trước
                        </button>
                      )}
                      {currentIdx < lessons.length - 1 && (
                        <button
                          className="btn-back-learn"
                          onClick={() => selectLesson(lessons[currentIdx + 1])}
                          disabled={isLessonLocked(lessons[currentIdx + 1])}
                          style={isLessonLocked(lessons[currentIdx + 1]) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          {isLessonLocked(lessons[currentIdx + 1]) ? '🔒 Bài tiếp' : 'Bài tiếp →'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab: Notes */}
                <div className={`tab-content ${activeTab === 'notes' ? 'active' : ''}`}>
                  <div className="notes-section">
                    <h3>Ghi chú của tôi</h3>
                    <textarea
                      className="notes-textarea"
                      placeholder="Nhập ghi chú của bạn tại đây..."
                      rows="10"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <button
                      className="btn-save-notes"
                      onClick={() =>
                        setToast({ message: 'Đã lưu ghi chú!', type: 'success' })
                      }
                    >
                      💾 Lưu ghi chú
                    </button>
                  </div>
                </div>

                {/* Tab: Q&A */}
                <div className={`tab-content ${activeTab === 'qa' ? 'active' : ''}`}>
                  <div className="qa-section">
                    <h3>Hỏi đáp</h3>
                    <div className="qa-form">
                      <textarea
                        className="qa-textarea"
                        placeholder="Đặt câu hỏi của bạn..."
                        rows="4"
                      />
                      <button
                        className="btn-ask"
                        onClick={() =>
                          setToast({ message: 'Câu hỏi đã được gửi!', type: 'success' })
                        }
                      >
                        Gửi câu hỏi
                      </button>
                    </div>
                    <div className="qa-list">
                      <p className="empty-message">
                        Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 80, textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: 16 }}>
                Khóa học chưa có bài học nào
              </p>
            </div>
          )}
        </main>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
