import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterOtpPage from './pages/RegisterOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SearchPage from './pages/SearchPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import SePayReturnPage from './pages/SePayReturnPage';
import AccountPage from './pages/AccountPage';
import LearningPage from './pages/LearningPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// Pages that use their own full layout (no header/footer)
const FULL_LAYOUT_PATHS = ['/learning/', '/admin', '/teacher', '/login', '/register', '/forgot-password'];

function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isPrivileged = isAdmin || isTeacher;
  const isFullLayout =
    FULL_LAYOUT_PATHS.some((p) => location.pathname.startsWith(p)) ||
    isPrivileged;

  if (isAdmin && location.pathname !== '/admin') {
    return <Navigate to="/admin" replace />;
  }

  if (isTeacher && location.pathname !== '/teacher') {
    return <Navigate to="/teacher" replace />;
  }

  return (
    <>
      {!isFullLayout && <Header />}
      <div className={!isFullLayout ? 'layout-with-header' : ''}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/course/:courseId" element={<CourseDetailPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Guest only */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/register/otp" element={<GuestRoute><RegisterOtpPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

        {/* Authenticated */}
        <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
        <Route path="/checkout/sepay-return" element={<ProtectedRoute><SePayReturnPage /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/learning/:courseId" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Teacher */}
        <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={
          <div className="container text-center" style={{ padding: '80px 0' }}>
            <h1 style={{ fontSize: '72px', margin: '0', color: 'var(--primary)' }}>404</h1>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '24px' }}>Trang không tồn tại</p>
            <a href="/" className="btn btn-primary">Về trang chủ</a>
          </div>
        } />
      </Routes>
      </div>
      {!isFullLayout && <Footer />}
    </>
  );
}

export default function App() {
  return <AppLayout />;
}
