import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import VNPayReturnPage from './pages/VNPayReturnPage';
import AccountPage from './pages/AccountPage';
import LearningPage from './pages/LearningPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';

function getDashboardPath(role) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/';
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={getDashboardPath(user.role)} replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;
  return children;
}

// Block admin/teacher from accessing student pages
function StudentRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }
  return children;
}

// Pages that use their own full layout (no header/footer)
const FULL_LAYOUT_PATHS = ['/learning/', '/admin', '/teacher', '/login', '/register', '/checkout/vnpay-return'];

function AppLayout() {
  const location = useLocation();
  const isFullLayout = FULL_LAYOUT_PATHS.some((p) => location.pathname.startsWith(p));

  return (
    <>
      {!isFullLayout && <Header />}
      <div className={!isFullLayout ? 'layout-with-header' : ''}>
      <Routes>
        {/* Public – student only */}
        <Route path="/" element={<StudentRoute><HomePage /></StudentRoute>} />
        <Route path="/search" element={<StudentRoute><SearchPage /></StudentRoute>} />
        <Route path="/course/:courseId" element={<StudentRoute><CourseDetailPage /></StudentRoute>} />
        <Route path="/blog" element={<StudentRoute><BlogPage /></StudentRoute>} />
        <Route path="/contact" element={<StudentRoute><ContactPage /></StudentRoute>} />

        {/* Guest only */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Authenticated – student only */}
        <Route path="/cart" element={<ProtectedRoute><StudentRoute><CartPage /></StudentRoute></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><StudentRoute><CheckoutPage /></StudentRoute></ProtectedRoute>} />
        <Route path="/checkout/success" element={<ProtectedRoute><StudentRoute><CheckoutSuccessPage /></StudentRoute></ProtectedRoute>} />
        {/* VNPay return: public - VNPay redirects here, user may not have active session */}
        <Route path="/checkout/vnpay-return" element={<VNPayReturnPage />} />
        <Route path="/account" element={<ProtectedRoute><StudentRoute><AccountPage /></StudentRoute></ProtectedRoute>} />
        <Route path="/learning/:courseId" element={<ProtectedRoute><StudentRoute><LearningPage /></StudentRoute></ProtectedRoute>} />

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
