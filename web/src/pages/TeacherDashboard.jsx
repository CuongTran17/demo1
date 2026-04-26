import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teacherAPI, lessonsAPI } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import {
  TeacherOverviewTab,
  TeacherRevenueTab,
  TeacherCoursesTab,
  TeacherLessonsTab,
  TeacherStudentsTab,
  TeacherChangesTab,
  TeacherLocksTab,
  TeacherReviewsTab,
} from '../components/teacher/TeacherDashboardTabs';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'courses', label: 'Khóa học' },
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'lessons', label: 'Bài học' },
  { key: 'students', label: 'Học viên' },
  { key: 'changes', label: 'Yêu cầu đã gửi' },
  { key: 'locks', label: 'Yêu cầu khóa TK' },
  { key: 'reviews', label: 'Đánh giá' },
];

const EMPTY_TEACHER_DASHBOARD = {
  stats: {
    totalCourses: 0,
    totalStudents: 0,
    pendingChanges: 0,
    totalRevenue: 0,
    totalSales: 0,
    coursesWithSales: 0,
  },
  courses: [],
  pendingChanges: [],
  revenue: {
    totalRevenue: 0,
    totalGrossRevenue: 0,
    totalSales: 0,
    completedOrders: 0,
    coursesWithSales: 0,
    courses: [],
  },
};

export default function TeacherDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Course form
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    course_name: '', description: '', price: '', old_price: '', category: '', level: 'beginner', duration: '', thumbnail: '',
  });

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    course_id: '', lesson_title: '', lesson_content: '', video_url: '', lesson_order: '',
  });

  // Selected course for lessons
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [editingLesson, setEditingLesson] = useState(null);

  // Lessons tab mode: 'lessons' | 'quizzes'
  const [lessonMode, setLessonMode] = useState('lessons');

  // Quiz state
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const EMPTY_QUIZ_FORM = {
    quiz_title: '', description: '', section_id: 1, lesson_order: 99,
    questions: [
      { question_text: '', options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]},
    ],
  };
  const [quizForm, setQuizForm] = useState(EMPTY_QUIZ_FORM);

  // Student progress
  const [selectedStudentCourse, setSelectedStudentCourse] = useState(null);
  const [studentProgress, setStudentProgress] = useState([]);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Lock request form
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockForm, setLockForm] = useState({ targetEmail: '', reason: '', requestType: 'lock' });
  const [lockRequests, setLockRequests] = useState([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await teacherAPI.getDashboard();
      setData(res.data || EMPTY_TEACHER_DASHBOARD);
      try {
        const locksRes = await teacherAPI.getMyLockRequests();
        setLockRequests(locksRes.data || []);
      } catch (err) {
        console.warn('Failed to load teacher lock requests:', err);
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Không tải được dữ liệu dashboard, đang hiển thị dữ liệu trống';
      setToast({ message, type: 'error' });
      setData(EMPTY_TEACHER_DASHBOARD);
      setLockRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (courseId) => {
    try {
      const res = await lessonsAPI.getByCourse(courseId);
      setCourseLessons(res.data.lessons || res.data || []);
      setSelectedCourse(courseId);
    } catch {
      setToast({ message: 'Lỗi tải bài học', type: 'error' });
    }
  };

  const loadQuizzes = async (courseId) => {
    try {
      const res = await teacherAPI.getQuizzesByCourse(courseId);
      setCourseQuizzes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCourseQuizzes([]);
    }
  };

  const loadStudentProgress = async (courseId) => {
    setLoadingStudents(true);
    try {
      const res = await teacherAPI.getStudentProgress(courseId);
      setStudentProgress(res.data.students || []);
      setTotalQuizzes(res.data.totalQuizzes || 0);
      setSelectedStudentCourse(courseId);
    } catch {
      setToast({ message: 'Lỗi tải dữ liệu học viên', type: 'error' });
      setStudentProgress([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // === Course CRUD ===
  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ course_name: '', description: '', price: '', old_price: '', category: '', level: 'beginner', duration: '', thumbnail: '' });
    setShowCourseForm(true);
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      course_name: course.course_name,
      description: course.description || '',
      price: course.price || '',
      old_price: course.old_price || '',
      category: course.category || '',
      level: course.level || 'beginner',
      duration: course.duration || '',
      thumbnail: course.thumbnail || '',
    });
    setShowCourseForm(true);
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await teacherAPI.updateCourse(editingCourse.course_id, courseForm);
        setToast({ message: 'Yêu cầu cập nhật đã gửi, chờ duyệt', type: 'success' });
      } else {
        await teacherAPI.createCourse(courseForm);
        setToast({ message: 'Yêu cầu tạo khóa học đã gửi, chờ duyệt', type: 'success' });
      }
      setShowCourseForm(false);
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const deleteCourse = async (courseId) => {
    if (!confirm('Yêu cầu xóa khóa học này sẽ được gửi cho admin duyệt. Tiếp tục?')) return;
    try {
      await teacherAPI.deleteCourse(courseId);
      setToast({ message: 'Yêu cầu xóa đã gửi', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  // === Image Upload ===
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await teacherAPI.uploadImage(formData);
      setCourseForm({ ...courseForm, thumbnail: res.data.imageUrl });
      setToast({ message: 'Upload ảnh thành công', type: 'success' });
    } catch {
      setToast({ message: 'Lỗi upload ảnh', type: 'error' });
    }
  };

  // === Lesson CRUD ===
  const openCreateLesson = (courseId) => {
    setEditingLesson(null);
    setLessonForm({ course_id: courseId || '', lesson_title: '', lesson_content: '', video_url: '', lesson_order: '' });
    setShowLessonForm(true);
  };

  const openEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      course_id: lesson.course_id || selectedCourse || '',
      lesson_title: lesson.lesson_title || '',
      lesson_content: lesson.lesson_content || '',
      video_url: lesson.video_url || '',
      lesson_order: lesson.lesson_order || '',
    });
    setShowLessonForm(true);
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await teacherAPI.updateLesson(editingLesson.lesson_id, lessonForm);
        setToast({ message: 'Yêu cầu cập nhật bài học đã gửi, chờ duyệt', type: 'success' });
      } else {
        await teacherAPI.createLesson(lessonForm);
        setToast({ message: 'Yêu cầu tạo bài học đã gửi, chờ duyệt', type: 'success' });
      }
      setShowLessonForm(false);
      setEditingLesson(null);
      if (selectedCourse) loadLessons(selectedCourse);
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!confirm('Gửi yêu cầu xóa bài học?')) return;
    try {
      await teacherAPI.deleteLesson(lessonId);
      setToast({ message: 'Yêu cầu xóa đã gửi', type: 'success' });
      if (selectedCourse) loadLessons(selectedCourse);
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  // === Quiz CRUD ===
  const submitQuiz = async (e) => {
    e.preventDefault();
    for (const q of quizForm.questions) {
      if (!q.question_text.trim()) {
        setToast({ message: 'Nội dung câu hỏi không được để trống', type: 'error' }); return;
      }
      if (!q.options.some((o) => o.is_correct)) {
        setToast({ message: 'Mỗi câu hỏi phải có đúng 1 đáp án đúng', type: 'error' }); return;
      }
      if (q.options.some((o) => !o.option_text.trim())) {
        setToast({ message: 'Nội dung các đáp án không được để trống', type: 'error' }); return;
      }
    }
    try {
      await teacherAPI.createQuiz({ ...quizForm, course_id: selectedCourse });
      setToast({ message: 'Yêu cầu tạo bài kiểm tra đã gửi, chờ admin duyệt', type: 'success' });
      setShowQuizForm(false);
      setQuizForm(EMPTY_QUIZ_FORM);
      loadQuizzes(selectedCourse);
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!confirm('Gửi yêu cầu xóa bài kiểm tra?')) return;
    try {
      await teacherAPI.deleteQuiz(quizId);
      setToast({ message: 'Yêu cầu xóa đã gửi', type: 'success' });
      loadQuizzes(selectedCourse);
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const addQuestion = () => setQuizForm((f) => ({
    ...f,
    questions: [...f.questions, {
      question_text: '',
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ],
    }],
  }));

  const removeQuestion = (idx) => setQuizForm((f) => ({
    ...f, questions: f.questions.filter((_, i) => i !== idx),
  }));

  const updateQuestion = (qIdx, value) => setQuizForm((f) => {
    const qs = [...f.questions];
    qs[qIdx] = { ...qs[qIdx], question_text: value };
    return { ...f, questions: qs };
  });

  const updateOption = (qIdx, oIdx, field, value) => setQuizForm((f) => {
    const qs = [...f.questions];
    const opts = qs[qIdx].options.map((o, i) => {
      if (field === 'is_correct') return { ...o, is_correct: i === oIdx };
      return i === oIdx ? { ...o, [field]: value } : o;
    });
    qs[qIdx] = { ...qs[qIdx], options: opts };
    return { ...f, questions: qs };
  });

  // === Lock Requests ===
  const submitLockRequest = async (e) => {
    e.preventDefault();
    try {
      await teacherAPI.createLockRequest(lockForm);
      setToast({ message: 'Yêu cầu đã gửi', type: 'success' });
      setShowLockForm(false);
      setLockForm({ targetEmail: '', reason: '', requestType: 'lock' });
      const res = await teacherAPI.getMyLockRequests();
      setLockRequests(res.data || []);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;

  const {
    stats = EMPTY_TEACHER_DASHBOARD.stats,
    courses = [],
    pendingChanges = [],
    revenue = {
      totalRevenue: 0,
      totalGrossRevenue: 0,
      totalSales: 0,
      completedOrders: 0,
      coursesWithSales: 0,
      courses: [],
    },
  } = data;
  const revenueCourses = Array.isArray(revenue.courses) && revenue.courses.length > 0
    ? revenue.courses
    : courses.map((course) => ({
      course_id: course.course_id,
      course_name: course.course_name,
      thumbnail: course.thumbnail,
      category: course.category,
      price: Number(course.price || 0),
      grossRevenue: Number(course.grossRevenue || 0),
      revenue: Number(course.revenue || 0),
      unitsSold: Number(course.unitsSold || 0),
      completedOrders: Number(course.completedOrders || 0),
      lastSaleAt: course.lastSaleAt || null,
    }));
  const resolvedTotalRevenue = stats.totalRevenue ?? revenue.totalRevenue ?? revenueCourses.reduce((sum, course) => sum + Number(course.revenue || 0), 0);
  const resolvedTotalSales = stats.totalSales ?? revenue.totalSales ?? revenueCourses.reduce((sum, course) => sum + Number(course.unitsSold || 0), 0);
  const resolvedCoursesWithSales = stats.coursesWithSales ?? revenue.coursesWithSales ?? revenueCourses.filter((course) => Number(course.unitsSold || 0) > 0).length;
  const resolvedCompletedOrders = revenue.completedOrders ?? revenueCourses.reduce((sum, course) => sum + Number(course.completedOrders || 0), 0);

  return (
    <DashboardLayout
      menuItems={TABS}
      activeTab={tab}
      onTabChange={setTab}
      title="PTIT Learning"
      subtitle="Giảng viên"
      theme="teacher"
      badges={{
        changes: pendingChanges.filter(c => c.status === 'pending').length,
      }}
      onLogout={() => { logout(); navigate('/'); }}
    >
      <div className="ds-content">
        {tab === 'overview' && (
          <TeacherOverviewTab
            stats={stats}
            courses={courses}
            pendingChanges={pendingChanges}
            resolvedTotalRevenue={resolvedTotalRevenue}
            resolvedTotalSales={resolvedTotalSales}
            onTabChange={setTab}
          />
        )}

        {tab === 'revenue' && (
          <TeacherRevenueTab
            revenueCourses={revenueCourses}
            resolvedTotalRevenue={resolvedTotalRevenue}
            resolvedTotalSales={resolvedTotalSales}
            resolvedCoursesWithSales={resolvedCoursesWithSales}
            resolvedCompletedOrders={resolvedCompletedOrders}
          />
        )}

        {tab === 'courses' && (
          <TeacherCoursesTab
            courses={courses}
            showCourseForm={showCourseForm}
            editingCourse={editingCourse}
            courseForm={courseForm}
            setCourseForm={setCourseForm}
            onCreateCourse={openCreateCourse}
            onSubmitCourse={submitCourse}
            onImageUpload={handleImageUpload}
            onEditCourse={openEditCourse}
            onDeleteCourse={deleteCourse}
            onOpenLessons={(courseId) => { loadLessons(courseId); setTab('lessons'); }}
            onCancelCourseForm={() => setShowCourseForm(false)}
          />
        )}

        {tab === 'lessons' && (
          <TeacherLessonsTab
            courses={courses}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            courseLessons={courseLessons}
            courseQuizzes={courseQuizzes}
            lessonMode={lessonMode}
            setLessonMode={setLessonMode}
            showLessonForm={showLessonForm}
            setShowLessonForm={setShowLessonForm}
            showQuizForm={showQuizForm}
            setShowQuizForm={setShowQuizForm}
            lessonForm={lessonForm}
            setLessonForm={setLessonForm}
            editingLesson={editingLesson}
            quizForm={quizForm}
            setQuizForm={setQuizForm}
            emptyQuizForm={EMPTY_QUIZ_FORM}
            loadLessons={loadLessons}
            loadQuizzes={loadQuizzes}
            openCreateLesson={openCreateLesson}
            openEditLesson={openEditLesson}
            submitLesson={submitLesson}
            deleteLesson={deleteLesson}
            submitQuiz={submitQuiz}
            deleteQuiz={deleteQuiz}
            addQuestion={addQuestion}
            removeQuestion={removeQuestion}
            updateQuestion={updateQuestion}
            updateOption={updateOption}
            setEditingLesson={setEditingLesson}
          />
        )}

        {tab === 'students' && (
          <TeacherStudentsTab
            courses={courses}
            selectedStudentCourse={selectedStudentCourse}
            studentProgress={studentProgress}
            totalQuizzes={totalQuizzes}
            loadingStudents={loadingStudents}
            loadStudentProgress={loadStudentProgress}
          />
        )}

        {tab === 'changes' && (
          <TeacherChangesTab pendingChanges={pendingChanges} />
        )}

        {tab === 'locks' && (
          <TeacherLocksTab
            showLockForm={showLockForm}
            setShowLockForm={setShowLockForm}
            lockForm={lockForm}
            setLockForm={setLockForm}
            lockRequests={lockRequests}
            submitLockRequest={submitLockRequest}
          />
        )}

        {tab === 'reviews' && (
          <TeacherReviewsTab courses={courses} />
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
