import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, certificatesAPI } from '../api';
import ReviewManager from '../components/ReviewManager';
import { formatPrice, resolveThumbnail } from '../utils/courseFormat';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import Chart from 'react-apexcharts';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'users', label: 'Quản lý người dùng' },
  { key: 'courses', label: 'Khóa học' },
  { key: 'discounts', label: 'Mã giảm giá' },
  { key: 'flash-sale', label: 'Flash Sale' },
  { key: 'orders', label: 'Lịch sử đơn hàng' },
  { key: 'changes', label: 'Thay đổi chờ duyệt' },
  { key: 'locks', label: 'Yêu cầu khóa' },
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'certificates', label: 'Chứng chỉ' },
  { key: 'reviews', label: 'Đánh giá' },
];

const EMPTY_ADMIN_DASHBOARD = {
  stats: {
    totalUsers: 0,
    totalTeachers: 0,
    totalCourses: 0,
    pendingChanges: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  },
  users: [],
  teachers: [],
  courses: [],
  pendingChanges: [],
  pendingOrders: [],
  paymentHistory: [],
  discountCodes: [],
};

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getUserRole(email) {
  if (email === 'admin@ptit.edu.vn') return 'admin';
  if (/^teacher\d*@ptit\.edu\.vn$/.test(email)) return 'teacher';
  return 'student';
}

function buildFlashSaleForm(flashSale = null) {
  return {
    targetType: flashSale?.target_type || 'all',
    targetValue: flashSale?.target_value || '',
    courseIds: Array.isArray(flashSale?.course_ids)
      ? flashSale.course_ids.map((id) => String(id || '').trim()).filter(Boolean)
      : [],
    discountPercentage: flashSale?.discount_percentage != null
      ? String(flashSale.discount_percentage)
      : '',
    startAt: toDateTimeLocal(flashSale?.start_at),
    endAt: toDateTimeLocal(flashSale?.end_at),
  };
}

function buildDiscountCodeForm(discountCode = null) {
  return {
    code: discountCode?.code || '',
    discountType: String(discountCode?.discount_type || 'percentage').toLowerCase(),
    discountValue: discountCode?.discount_value != null ? String(discountCode.discount_value) : '',
    minOrderAmount: discountCode?.min_order_amount != null ? String(discountCode.min_order_amount) : '0',
    maxDiscountAmount: discountCode?.max_discount_amount != null ? String(discountCode.max_discount_amount) : '',
    usageLimit: discountCode?.usage_limit != null ? String(discountCode.usage_limit) : '',
    startsAt: toDateTimeLocal(discountCode?.starts_at),
    expiresAt: toDateTimeLocal(discountCode?.expires_at),
    isActive: discountCode?.is_active == null ? true : Boolean(discountCode.is_active),
  };
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [lockRequests, setLockRequests] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [certSummary, setCertSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [processingChange, setProcessingChange] = useState({ id: null, action: null });

  // User management filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [updatingRoleId, setUpdatingRoleId] = useState(null);


  // Course search/filter
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('all');

  // Create teacher form
  const [teacherForm, setTeacherForm] = useState({ fullname: '', email: '', phone: '', password: '' });
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);

  // Assign course form
  const [assignForm, setAssignForm] = useState({ teacherId: '', courseId: '' });
  const [showAssignCourse, setShowAssignCourse] = useState(false);

  // Discount code form
  const [creatingDiscountCode, setCreatingDiscountCode] = useState(false);
  const [editingDiscountCodeId, setEditingDiscountCodeId] = useState(null);
  const [deletingDiscountCodeId, setDeletingDiscountCodeId] = useState(null);
  const [discountCodeForm, setDiscountCodeForm] = useState(buildDiscountCodeForm());
  const [savingFlashSale, setSavingFlashSale] = useState(false);
  const [disablingFlashSale, setDisablingFlashSale] = useState(false);
  const [deletingFlashSale, setDeletingFlashSale] = useState(false);
  const [flashSaleConfig, setFlashSaleConfig] = useState(null);
  const [flashSaleForm, setFlashSaleForm] = useState(buildFlashSaleForm());

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await adminAPI.getDashboard();
      setData(res.data || EMPTY_ADMIN_DASHBOARD);

      const [locksRes, revRes, flashSaleRes, certsRes] = await Promise.all([
        adminAPI.getLockRequests().catch(() => ({ data: [] })),
        adminAPI.getRevenue().catch(() => ({ data: { total: 0, details: [] } })),
        adminAPI.getFlashSale().catch(() => ({ data: null })),
        certificatesAPI.adminSummary().catch(() => ({ data: { summary: [] } })),
      ]);
      setLockRequests(locksRes.data || []);
      setRevenue(revRes.data);
      setCertSummary(certsRes.data?.summary || []);

      const flashSale = flashSaleRes.data || null;
      setFlashSaleConfig(flashSale);
      setFlashSaleForm(buildFlashSaleForm(flashSale));
    } catch (err) {
      const message = err?.response?.data?.error || 'Không tải được dữ liệu dashboard, đang hiển thị dữ liệu trống';
      setToast({ message, type: 'error' });
      setData(EMPTY_ADMIN_DASHBOARD);
      setLockRequests([]);
      setRevenue({ total: 0, details: [] });
    } finally {
      setLoading(false);
    }
  };

  const lockUser = async (userId, reason) => {
    const r = reason || prompt('Lý do khóa tài khoản:');
    if (!r) return;
    try {
      await adminAPI.lockUser(userId, r);
      setToast({ message: 'Đã khóa tài khoản', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const unlockUser = async (userId) => {
    try {
      await adminAPI.unlockUser(userId);
      setToast({ message: 'Đã mở khóa', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Xác nhận xóa người dùng này?')) return;
    try {
      await adminAPI.deleteUser(userId);
      setToast({ message: 'Đã xóa', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const updateUserRole = async (userId, role) => {
    setUpdatingRoleId(userId);
    try {
      await adminAPI.updateUserRole(userId, role);
      setToast({ message: 'Đã cập nhật vai trò', type: 'success' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi cập nhật vai trò', type: 'error' });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Resolve effective role: DB column takes priority over email pattern
  const resolveRole = (u) => u.role || getUserRole(u.email);

  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createTeacher(teacherForm);
      setToast({ message: 'Tạo giảng viên thành công!', type: 'success' });
      setShowCreateTeacher(false);
      setTeacherForm({ fullname: '', email: '', phone: '', password: '' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const assignCourse = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.assignCourse(assignForm.teacherId, assignForm.courseId);
      setToast({ message: 'Gán khóa học thành công!', type: 'success' });
      setShowAssignCourse(false);
      setAssignForm({ teacherId: '', courseId: '' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    }
  };

  const approveChange = async (changeId) => {
    if (processingChange.id === changeId) return;
    setProcessingChange({ id: changeId, action: 'approve' });
    try {
      const res = await adminAPI.approveChange(changeId);
      setToast({ message: res.data?.message || 'Đã duyệt', type: 'success' });
      await loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    } finally {
      setProcessingChange({ id: null, action: null });
    }
  };

  const rejectChange = async (changeId) => {
    if (processingChange.id === changeId) return;
    setProcessingChange({ id: changeId, action: 'reject' });
    try {
      const res = await adminAPI.rejectChange(changeId);
      setToast({ message: res.data?.message || 'Đã từ chối', type: 'success' });
      await loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    } finally {
      setProcessingChange({ id: null, action: null });
    }
  };

  const approveLock = async (requestId) => {
    try {
      await adminAPI.approveLockRequest(requestId);
      setToast({ message: 'Đã duyệt', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const rejectLock = async (requestId) => {
    try {
      await adminAPI.rejectLockRequest(requestId);
      setToast({ message: 'Đã từ chối', type: 'success' });
      loadDashboard();
    } catch { setToast({ message: 'Lỗi', type: 'error' }); }
  };

  const createDiscountCode = async (e) => {
    e.preventDefault();
    setCreatingDiscountCode(true);

    try {
      const payload = {
        ...discountCodeForm,
        maxDiscountAmount: discountCodeForm.maxDiscountAmount || null,
        usageLimit: discountCodeForm.usageLimit || null,
        startsAt: discountCodeForm.startsAt || null,
        expiresAt: discountCodeForm.expiresAt || null,
      };

      if (editingDiscountCodeId) {
        await adminAPI.updateDiscountCode(editingDiscountCodeId, payload);
        setToast({ message: 'Cập nhật mã giảm giá thành công', type: 'success' });
      } else {
        await adminAPI.createDiscountCode(payload);
        setToast({ message: 'Tạo mã giảm giá thành công', type: 'success' });
      }

      setEditingDiscountCodeId(null);
      setDiscountCodeForm(buildDiscountCodeForm());
      await loadDashboard();
    } catch (err) {
      const fallback = editingDiscountCodeId ? 'Lỗi cập nhật mã giảm giá' : 'Lỗi tạo mã giảm giá';
      setToast({ message: err.response?.data?.error || fallback, type: 'error' });
    } finally {
      setCreatingDiscountCode(false);
    }
  };

  const startEditDiscountCode = (discountCode) => {
    setEditingDiscountCodeId(discountCode.discount_id);
    setDiscountCodeForm(buildDiscountCodeForm(discountCode));
  };

  const cancelEditDiscountCode = () => {
    setEditingDiscountCodeId(null);
    setDiscountCodeForm(buildDiscountCodeForm());
  };

  const deleteDiscountCode = async (discountCode) => {
    const id = discountCode?.discount_id;
    if (!id) return;

    if (!confirm(`Bạn có chắc muốn xoá mã giảm giá ${discountCode.code}?`)) return;

    setDeletingDiscountCodeId(id);
    try {
      await adminAPI.deleteDiscountCode(id);

      if (editingDiscountCodeId === id) {
        cancelEditDiscountCode();
      }

      setToast({ message: 'Xoá mã giảm giá thành công', type: 'success' });
      await loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi xoá mã giảm giá', type: 'error' });
    } finally {
      setDeletingDiscountCodeId(null);
    }
  };

  const saveFlashSale = async (e) => {
    e.preventDefault();

    if (!flashSaleForm.startAt || !flashSaleForm.endAt) {
      setToast({ message: 'Vui lòng nhập thời gian bắt đầu và kết thúc', type: 'error' });
      return;
    }

    if (flashSaleForm.targetType === 'category' && !flashSaleForm.targetValue) {
      setToast({ message: 'Vui lòng chọn danh mục áp dụng', type: 'error' });
      return;
    }

    if (flashSaleForm.targetType === 'courses' && flashSaleForm.courseIds.length === 0) {
      setToast({ message: 'Vui lòng chọn ít nhất 1 khóa học', type: 'error' });
      return;
    }

    const discount = Number(flashSaleForm.discountPercentage);
    if (!Number.isFinite(discount) || discount <= 0 || discount > 90) {
      setToast({ message: 'Phần trăm giảm giá phải từ 1 đến 90', type: 'error' });
      return;
    }

    setSavingFlashSale(true);
    try {
      const res = await adminAPI.saveFlashSale({
        flashSaleId: flashSaleConfig?.flash_sale_id || null,
        targetType: flashSaleForm.targetType,
        targetValue: flashSaleForm.targetType === 'category' ? flashSaleForm.targetValue : null,
        courseIds: flashSaleForm.targetType === 'courses' ? flashSaleForm.courseIds : [],
        discountPercentage: Math.round(discount),
        startAt: flashSaleForm.startAt,
        endAt: flashSaleForm.endAt,
      });

      const saved = res.data?.data || null;
      setFlashSaleConfig(saved);
      setFlashSaleForm(buildFlashSaleForm(saved || {
        ...flashSaleForm,
        target_type: flashSaleForm.targetType,
        target_value: flashSaleForm.targetValue,
        course_ids: flashSaleForm.courseIds,
      }));

      setToast({ message: res.data?.message || 'Đã cập nhật flash sale', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi cập nhật flash sale', type: 'error' });
    } finally {
      setSavingFlashSale(false);
    }
  };

  const deactivateFlashSale = async () => {
    if (!confirm('Bạn có chắc muốn tắt flash sale hiện tại?')) return;

    setDisablingFlashSale(true);
    try {
      await adminAPI.disableFlashSale();

      const res = await adminAPI.getFlashSale().catch(() => ({ data: null }));
      const latest = res.data || null;
      setFlashSaleConfig(latest);
      setFlashSaleForm(buildFlashSaleForm(latest));

      setToast({ message: 'Đã tắt flash sale', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi tắt flash sale', type: 'error' });
    } finally {
      setDisablingFlashSale(false);
    }
  };

  const toggleFlashSaleCourse = (courseId) => {
    const normalizedId = String(courseId || '').trim();
    if (!normalizedId) return;

    setFlashSaleForm((prev) => {
      const hasCourse = prev.courseIds.includes(normalizedId);
      const nextCourseIds = hasCourse
        ? prev.courseIds.filter((id) => id !== normalizedId)
        : [...prev.courseIds, normalizedId];

      return {
        ...prev,
        courseIds: nextCourseIds,
      };
    });
  };

  const deleteFlashSale = async () => {
    if (!flashSaleConfig?.flash_sale_id) {
      setToast({ message: 'Không có flash sale để xóa', type: 'error' });
      return;
    }

    if (flashSaleConfig.is_active) {
      setToast({ message: 'Phải tắt flash sale trước khi xóa', type: 'error' });
      return;
    }

    if (!confirm('Bạn có chắc muốn xóa vĩnh viễn flash sale này?')) return;

    setDeletingFlashSale(true);
    try {
      await adminAPI.deleteFlashSale(flashSaleConfig.flash_sale_id);
      setFlashSaleConfig(null);
      setFlashSaleForm(buildFlashSaleForm());
      setToast({ message: 'Đã xóa flash sale', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi xóa flash sale', type: 'error' });
    } finally {
      setDeletingFlashSale(false);
    }
  };

  const {
    stats = EMPTY_ADMIN_DASHBOARD.stats,
    users = [],
    teachers = [],
    courses = [],
    pendingChanges = [],
    pendingOrders = [],
    paymentHistory = [],
    discountCodes = [],
  } = data || {};

  const courseCategories = useMemo(() => {
    return [...new Set(courses.map((course) => String(course.category || '').trim()).filter(Boolean))];
  }, [courses]);

  const courseById = useMemo(() => {
    const map = new Map();
    for (const course of courses) {
      map.set(String(course.course_id || '').trim(), course);
    }
    return map;
  }, [courses]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const role = u.role || getUserRole(u.email);
      const q = userSearch.trim().toLowerCase();
      const matchSearch = !q ||
        u.fullname?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q);
      const matchRole = userRoleFilter === 'all' || role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);


  const filteredAdminCourses = useMemo(() => {
    return courses.filter((c) => {
      const q = courseSearch.trim().toLowerCase();
      const matchSearch = !q ||
        c.course_name?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q);
      const matchCategory = courseCategoryFilter === 'all' || c.category === courseCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [courses, courseSearch, courseCategoryFilter]);

  const selectedFlashSaleCourseNames = useMemo(() => {
    const ids = Array.isArray(flashSaleConfig?.course_ids) ? flashSaleConfig.course_ids : [];
    return ids
      .map((courseId) => courseById.get(String(courseId || '').trim())?.course_name || courseId)
      .filter(Boolean);
  }, [flashSaleConfig, courseById]);

  const orderHistoryRows = useMemo(() => {
    const allRows = [...pendingOrders, ...paymentHistory];
    const byOrderId = new Map();

    const toTime = (value) => {
      const time = value ? new Date(value).getTime() : 0;
      return Number.isFinite(time) ? time : 0;
    };

    for (const row of allRows) {
      const orderId = row.order_id;
      if (!orderId) continue;

      const previous = byOrderId.get(orderId);
      if (!previous) {
        byOrderId.set(orderId, row);
        continue;
      }

      const previousScore = Math.max(toTime(previous.action_time), toTime(previous.created_at));
      const currentScore = Math.max(toTime(row.action_time), toTime(row.created_at));

      if (currentScore >= previousScore) {
        byOrderId.set(orderId, { ...previous, ...row });
      }
    }

    return Array.from(byOrderId.values()).sort(
      (a, b) => (toTime(b.created_at) - toTime(a.created_at))
    );
  }, [pendingOrders, paymentHistory]);

  const orderStatusCounts = useMemo(() => {
    return {
      all: orderHistoryRows.length,
      pending: orderHistoryRows.filter((o) => o.status === 'pending_payment').length,
      success: orderHistoryRows.filter((o) => o.status === 'completed').length,
      failed: orderHistoryRows.filter((o) => ['cancelled', 'rejected'].includes(o.status)).length,
    };
  }, [orderHistoryRows]);

  const filteredOrderRows = useMemo(() => {
    if (orderStatusFilter === 'pending') {
      return orderHistoryRows.filter((o) => o.status === 'pending_payment');
    }

    if (orderStatusFilter === 'success') {
      return orderHistoryRows.filter((o) => o.status === 'completed');
    }

    if (orderStatusFilter === 'failed') {
      return orderHistoryRows.filter((o) => ['cancelled', 'rejected'].includes(o.status));
    }

    return orderHistoryRows;
  }, [orderHistoryRows, orderStatusFilter]);

  const getOrderStatusMeta = (status) => {
    if (status === 'completed') {
      return { text: 'Thành công', badgeClass: 'ta-badge--approved' };
    }

    if (status === 'pending_payment') {
      return { text: 'Chờ IPN', badgeClass: 'ta-badge--pending' };
    }

    if (status === 'cancelled') {
      return { text: 'Đã hủy', badgeClass: 'ta-badge--warning' };
    }

    if (status === 'rejected') {
      return { text: 'Từ chối', badgeClass: 'ta-badge--rejected' };
    }

    return { text: status || 'Không xác định', badgeClass: 'ta-badge--info' };
  };

  const getPaymentMethodLabel = (method) => {
    if (method === 'sepay') return 'SePay';
    if (!method) return '-';
    return String(method).toUpperCase();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout
      menuItems={TABS}
      activeTab={tab}
      onTabChange={setTab}
      title="PTIT Learning"
      subtitle="Admin Panel"
      theme="admin"
      badges={{
        orders: pendingOrders.length,
        changes: pendingChanges.length,
        locks: lockRequests.length,
      }}
      onLogout={() => { logout(); navigate('/'); }}
    >
      <div className="ds-content">

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <h2>Tổng quan hệ thống</h2>
            <div className="ta-metrics-grid">
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Người dùng</div>
                  <div className="ta-metric-value">{stats.totalUsers}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Giảng viên</div>
                  <div className="ta-metric-value">{stats.totalTeachers}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Khóa học</div>
                  <div className="ta-metric-value">{stats.totalCourses}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Đơn chờ IPN</div>
                  <div className="ta-metric-value">{stats.pendingOrders}</div>
                  {stats.pendingOrders > 0 && (
                    <span className="ta-metric-trend ta-metric-trend--down">
                      <svg viewBox="0 0 14 14" fill="none"><path d="M7 3.5v7M4.5 8l2.5 2.5L9.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Đang chờ callback
                    </span>
                  )}
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Thay đổi chờ duyệt</div>
                  <div className="ta-metric-value">{stats.pendingChanges}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--cyan">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Tổng doanh thu</div>
                  <div className="ta-metric-value">{formatPrice(stats.totalRevenue)}</div>
                  <span className="ta-metric-trend ta-metric-trend--up">
                    <svg viewBox="0 0 14 14" fill="none"><path d="M7 10.5v-7M4.5 6L7 3.5 9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Doanh thu
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            {revenue?.details?.length > 0 && (
              <div className="ta-chart-card">
                <div className="ta-chart-header">
                  <h3 className="ta-chart-title">Biểu đồ doanh thu theo người dùng</h3>
                </div>
                <Chart
                  type="bar"
                  height={320}
                  options={{
                    chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
                    colors: ['#3b82f6', '#22c55e'],
                    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                    xaxis: {
                      categories: revenue.details.slice(0, 10).map(d => (d.fullname || d.email || '').split(' ').pop()),
                      labels: { style: { colors: '#64748b', fontSize: '12px' } },
                    },
                    yaxis: {
                      labels: {
                        style: { colors: '#64748b', fontSize: '12px' },
                        formatter: (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
                      },
                    },
                    dataLabels: { enabled: false },
                    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                    tooltip: { y: { formatter: (v) => formatPrice(v) } },
                  }}
                  series={[{
                    name: 'Tổng chi',
                    data: revenue.details.slice(0, 10).map(d => Number(d.total_spent) || 0),
                  }]}
                />
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">
                  Quản lý người dùng
                  <span className="ta-text-muted" style={{ marginLeft: 8, fontWeight: 400, fontSize: 14 }}>
                    {filteredUsers.length}/{users.length}
                  </span>
                </h3>
                <div className="ta-actions">
                  <button className="ta-btn ta-btn--primary" onClick={() => setShowCreateTeacher(!showCreateTeacher)}>+ Tạo giảng viên</button>
                  <button className="ta-btn ta-btn--outline" onClick={() => setShowAssignCourse(!showAssignCourse)}>Gán khóa học</button>
                </div>
              </div>

              {showCreateTeacher && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>Tạo tài khoản giảng viên</h3>
                    <form onSubmit={createTeacher}>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Họ và tên</label>
                          <input className="ta-form-input" placeholder="Họ và tên" value={teacherForm.fullname} onChange={(e) => setTeacherForm({ ...teacherForm, fullname: e.target.value })} required />
                        </div>
                        <div>
                          <label className="ta-form-label">Email</label>
                          <input className="ta-form-input" placeholder="Email" type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
                        </div>
                      </div>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Số điện thoại</label>
                          <input className="ta-form-input" placeholder="Số điện thoại" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} required />
                        </div>
                        <div>
                          <label className="ta-form-label">Mật khẩu</label>
                          <input className="ta-form-input" placeholder="Mật khẩu" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
                        </div>
                      </div>
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">Tạo</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowCreateTeacher(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showAssignCourse && (
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="ta-form-card">
                    <h3>Gán khóa học cho giảng viên</h3>
                    <form onSubmit={assignCourse}>
                      <div className="ta-form-grid">
                        <div>
                          <label className="ta-form-label">Giảng viên</label>
                          <select className="ta-form-select" value={assignForm.teacherId} onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })} required>
                            <option value="">-- Chọn giảng viên --</option>
                            {users.filter((u) => resolveRole(u) === 'teacher').map((t) => <option key={t.user_id} value={t.user_id}>{t.fullname}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="ta-form-label">Khóa học</label>
                          <select className="ta-form-select" value={assignForm.courseId} onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })} required>
                            <option value="">-- Chọn khóa học --</option>
                            {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="ta-form-actions">
                        <button type="submit" className="ta-btn ta-btn--primary">Gán</button>
                        <button type="button" className="ta-btn ta-btn--outline" onClick={() => setShowAssignCourse(false)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="rm-filter-bar">
                <div className="rm-search-wrap">
                  <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  <input
                    className="rm-search-input"
                    type="text"
                    placeholder="Tìm theo tên, email, số điện thoại..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {userSearch && (
                    <button className="rm-clear-btn" onClick={() => setUserSearch('')}>✕</button>
                  )}
                </div>
                <select
                  className="ta-form-select"
                  style={{ minWidth: 150 }}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="ta-empty">Không tìm thấy người dùng phù hợp</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead>
                      <tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Hành động</th></tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const role = resolveRole(u);
                        const roleBadge = role === 'admin' ? 'ta-badge--danger' : role === 'teacher' ? 'ta-badge--info' : 'ta-badge--success';
                        const isSelf = u.email === 'admin@ptit.edu.vn';
                        const isUpdating = updatingRoleId === u.user_id;
                        return (
                          <tr key={u.user_id}>
                            <td className="ta-text-muted">{u.user_id}</td>
                            <td className="ta-text-bold">{u.fullname}</td>
                            <td>{u.email}</td>
                            <td>{u.phone}</td>
                            <td>
                              {isSelf ? (
                                <span className={`ta-badge ${roleBadge}`}>{role}</span>
                              ) : (
                                <select
                                  className="ta-form-select"
                                  style={{ padding: '4px 8px', fontSize: 13, minWidth: 100 }}
                                  value={role}
                                  disabled={isUpdating}
                                  onChange={(e) => updateUserRole(u.user_id, e.target.value)}
                                >
                                  <option value="admin">admin</option>
                                  <option value="teacher">teacher</option>
                                  <option value="student">student</option>
                                </select>
                              )}
                            </td>
                            <td><span className={`ta-badge ${u.is_locked ? 'ta-badge--locked' : 'ta-badge--active'}`}>{u.is_locked ? 'Bị khóa' : 'Hoạt động'}</span></td>
                            <td>
                              <div className="ta-actions">
                                {u.is_locked ? (
                                  <button className="ta-btn ta-btn--sm ta-btn--primary" onClick={() => unlockUser(u.user_id)}>Mở khóa</button>
                                ) : (
                                  <button className="ta-btn ta-btn--sm ta-btn--warning" onClick={() => lockUser(u.user_id)}>Khóa</button>
                                )}
                                <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => deleteUser(u.user_id)} disabled={isSelf}>Xóa</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courses */}
        {tab === 'courses' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">
                  Khóa học
                  <span className="ta-text-muted" style={{ marginLeft: 8, fontWeight: 400, fontSize: 14 }}>
                    {filteredAdminCourses.length}/{courses.length}
                  </span>
                </h3>
              </div>

              <div className="rm-filter-bar">
                <div className="rm-search-wrap">
                  <svg className="rm-search-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  <input
                    className="rm-search-input"
                    type="text"
                    placeholder="Tìm theo tên khóa học..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                  {courseSearch && (
                    <button className="rm-clear-btn" onClick={() => setCourseSearch('')}>✕</button>
                  )}
                </div>
                <select
                  className="ta-form-select"
                  style={{ minWidth: 160 }}
                  value={courseCategoryFilter}
                  onChange={(e) => setCourseCategoryFilter(e.target.value)}
                >
                  <option value="all">Tất cả danh mục</option>
                  {courseCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {filteredAdminCourses.length === 0 ? (
                <div className="ta-empty">Không tìm thấy khóa học phù hợp</div>
              ) : (
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead><tr><th>Ảnh</th><th>ID</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {filteredAdminCourses.map((c) => {
                      const thumb = resolveThumbnail(c.thumbnail);
                      return (
                        <tr key={c.course_id}>
                          <td><img src={thumb} alt="" className="ta-cell-img" /></td>
                          <td className="ta-text-muted">{c.course_id}</td>
                          <td className="ta-text-bold">{c.course_name}</td>
                          <td>{c.category}</td>
                          <td className="ta-text-bold">{formatPrice(c.price)}</td>
                          <td><span className={`ta-badge ${c.has_pending_changes ? 'ta-badge--pending' : 'ta-badge--active'}`}>{c.has_pending_changes ? 'Chờ duyệt' : 'Hoạt động'}</span></td>
                          <td>
                            <label className="ta-btn ta-btn--sm ta-btn--primary" style={{ cursor: 'pointer' }}>
                              Đổi ảnh
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const fd = new FormData();
                                fd.append('image', file);
                                try {
                                  const res = await adminAPI.uploadImage(fd);
                                  await adminAPI.updateCourse(c.course_id, { thumbnail: res.data.imageUrl });
                                  setToast({ message: 'Đổi ảnh thành công', type: 'success' });
                                  loadDashboard();
                                } catch { setToast({ message: 'Lỗi đổi ảnh', type: 'error' }); }
                              }} />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        )}

        {/* Discount Codes */}
        {tab === 'discounts' && (
          <div>
            <div className="ta-form-card" style={{ marginBottom: '20px' }}>
              <h3>{editingDiscountCodeId ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}</h3>
              {editingDiscountCodeId && (
                <p className="ta-text-muted" style={{ marginBottom: '12px' }}>
                  Bạn đang chỉnh sửa mã #{editingDiscountCodeId}
                </p>
              )}
              <form onSubmit={createDiscountCode}>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Mã giảm giá <span className="ta-required">*</span></label>
                    <input
                      className="ta-form-input"
                      placeholder="VD: GIAM20"
                      value={discountCodeForm.code}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div>
                    <label className="ta-form-label">Loại giảm giá</label>
                    <select
                      className="ta-form-select"
                      value={discountCodeForm.discountType}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, discountType: e.target.value })}
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (VND)</option>
                    </select>
                  </div>
                </div>

                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Giá trị giảm <span className="ta-required">*</span></label>
                    <input
                      type="number"
                      min="1"
                      max={discountCodeForm.discountType === 'percentage' ? '100' : undefined}
                      className="ta-form-input"
                      placeholder={discountCodeForm.discountType === 'percentage' ? '1 - 100' : 'VD: 50000'}
                      value={discountCodeForm.discountValue}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, discountValue: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="ta-form-label">Đơn tối thiểu (VND)</label>
                    <input
                      type="number"
                      min="0"
                      className="ta-form-input"
                      value={discountCodeForm.minOrderAmount}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, minOrderAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Giảm tối đa (VND, tuỳ chọn)</label>
                    <input
                      type="number"
                      min="1"
                      className="ta-form-input"
                      value={discountCodeForm.maxDiscountAmount}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, maxDiscountAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ta-form-label">Số lượt sử dụng (tuỳ chọn)</label>
                    <input
                      type="number"
                      min="1"
                      className="ta-form-input"
                      value={discountCodeForm.usageLimit}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, usageLimit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Bắt đầu (tuỳ chọn)</label>
                    <input
                      type="datetime-local"
                      className="ta-form-input"
                      value={discountCodeForm.startsAt}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, startsAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ta-form-label">Hết hạn (tuỳ chọn)</label>
                    <input
                      type="datetime-local"
                      className="ta-form-input"
                      value={discountCodeForm.expiresAt}
                      onChange={(e) => setDiscountCodeForm({ ...discountCodeForm, expiresAt: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="ta-form-label">Trạng thái</label>
                  <select
                    className="ta-form-select"
                    value={discountCodeForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setDiscountCodeForm({
                      ...discountCodeForm,
                      isActive: e.target.value === 'active',
                    })}
                  >
                    <option value="active">Đang bật</option>
                    <option value="inactive">Đã tắt</option>
                  </select>
                </div>

                <div className="ta-form-actions">
                  <button type="submit" className="ta-btn ta-btn--primary" disabled={creatingDiscountCode}>
                    {creatingDiscountCode
                      ? (editingDiscountCodeId ? 'Đang cập nhật...' : 'Đang tạo...')
                      : (editingDiscountCodeId ? 'Cập nhật mã giảm giá' : 'Tạo mã giảm giá')}
                  </button>
                  {editingDiscountCodeId && (
                    <button type="button" className="ta-btn ta-btn--outline" onClick={cancelEditDiscountCode}>
                      Huỷ chỉnh sửa
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Danh sách mã giảm giá ({discountCodes.length})</h3>
              </div>

              {discountCodes.length === 0 ? (
                <div className="ta-empty">Chưa có mã giảm giá nào</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>Code</th><th>Giá trị</th><th>Điều kiện</th><th>Sử dụng</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {discountCodes.map((dc) => {
                        const valueLabel = dc.discount_type === 'percentage'
                          ? `${Number(dc.discount_value)}%`
                          : formatPrice(dc.discount_value);
                        const maxLabel = dc.max_discount_amount ? `, tối đa ${formatPrice(dc.max_discount_amount)}` : '';
                        const usageLabel = dc.usage_limit ? `${dc.used_count}/${dc.usage_limit}` : `${dc.used_count}/không giới hạn`;
                        const active = Boolean(dc.is_active);
                        const deleting = deletingDiscountCodeId === dc.discount_id;
                        const editing = editingDiscountCodeId === dc.discount_id;

                        return (
                          <tr key={dc.discount_id}>
                            <td className="ta-text-bold">{dc.code}</td>
                            <td>{valueLabel}</td>
                            <td>Từ {formatPrice(dc.min_order_amount || 0)}{maxLabel}</td>
                            <td>{usageLabel}</td>
                            <td>{dc.expires_at ? new Date(dc.expires_at).toLocaleString('vi-VN') : 'Không giới hạn'}</td>
                            <td>
                              <span className={`ta-badge ${active ? 'ta-badge--active' : 'ta-badge--rejected'}`}>
                                {active ? 'Đang bật' : 'Đã tắt'}
                              </span>
                            </td>
                            <td>
                              <div className="ta-actions">
                                <button
                                  type="button"
                                  className="ta-btn ta-btn--sm ta-btn--primary"
                                  onClick={() => startEditDiscountCode(dc)}
                                >
                                  {editing ? 'Đang sửa' : 'Sửa'}
                                </button>
                                <button
                                  type="button"
                                  className="ta-btn ta-btn--sm ta-btn--danger"
                                  onClick={() => deleteDiscountCode(dc)}
                                  disabled={deleting}
                                >
                                  {deleting ? 'Đang xoá...' : 'Xoá'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flash Sale */}
        {tab === 'flash-sale' && (
          <div>
            <div className="ta-form-card" style={{ marginBottom: '20px' }}>
              <h3>Cấu hình Flash Sale</h3>
              <p className="ta-text-muted" style={{ marginBottom: '16px' }}>
                Tạo hoặc chỉnh sửa flash sale theo toàn bộ khoá học, theo danh mục hoặc theo từng khoá học cụ thể.
              </p>

              <form onSubmit={saveFlashSale}>
                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Đối tượng áp dụng</label>
                    <select
                      className="ta-form-select"
                      value={flashSaleForm.targetType}
                      onChange={(e) => setFlashSaleForm({
                        ...flashSaleForm,
                        targetType: e.target.value,
                        targetValue: e.target.value === 'all' ? '' : flashSaleForm.targetValue,
                      })}
                    >
                      <option value="all">Tất cả khoá học</option>
                      <option value="category">Theo danh mục</option>
                      <option value="courses">Theo từng khoá học</option>
                    </select>
                  </div>

                  <div>
                    <label className="ta-form-label">Phần trăm giảm (%) <span className="ta-required">*</span></label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="ta-form-input"
                      placeholder="1 - 90"
                      value={flashSaleForm.discountPercentage}
                      onChange={(e) => setFlashSaleForm({ ...flashSaleForm, discountPercentage: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {flashSaleForm.targetType === 'category' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label className="ta-form-label">Danh mục áp dụng <span className="ta-required">*</span></label>
                    <select
                      className="ta-form-select"
                      value={flashSaleForm.targetValue}
                      onChange={(e) => setFlashSaleForm({ ...flashSaleForm, targetValue: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {courseCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                )}

                {flashSaleForm.targetType === 'courses' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label className="ta-form-label">Chọn khoá học áp dụng <span className="ta-required">*</span></label>
                    <div
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '8px 10px',
                        background: '#fff',
                      }}
                    >
                      {courses.length === 0 ? (
                        <div className="ta-text-muted">Chưa có khoá học nào để chọn</div>
                      ) : (
                        courses.map((course) => {
                          const id = String(course.course_id || '').trim();
                          const checked = flashSaleForm.courseIds.includes(id);

                          return (
                            <label
                              key={id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '8px 4px',
                                borderBottom: '1px dashed #e2e8f0',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleFlashSaleCourse(id)}
                                />
                                <span className="ta-text-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {course.course_name}
                                </span>
                              </span>
                              <span className="ta-text-muted" style={{ whiteSpace: 'nowrap' }}>
                                {formatPrice(course.price || 0)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="ta-text-muted" style={{ marginTop: '8px' }}>
                      Đã chọn {flashSaleForm.courseIds.length} khoá học
                    </div>
                  </div>
                )}

                <div className="ta-form-grid">
                  <div>
                    <label className="ta-form-label">Bắt đầu <span className="ta-required">*</span></label>
                    <input
                      type="datetime-local"
                      className="ta-form-input"
                      value={flashSaleForm.startAt}
                      onChange={(e) => setFlashSaleForm({ ...flashSaleForm, startAt: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="ta-form-label">Kết thúc <span className="ta-required">*</span></label>
                    <input
                      type="datetime-local"
                      className="ta-form-input"
                      value={flashSaleForm.endAt}
                      onChange={(e) => setFlashSaleForm({ ...flashSaleForm, endAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="ta-form-actions">
                  <button type="submit" className="ta-btn ta-btn--primary" disabled={savingFlashSale}>
                    {savingFlashSale ? 'Đang lưu...' : 'Lưu flash sale'}
                  </button>
                  <button
                    type="button"
                    className="ta-btn ta-btn--danger"
                    onClick={deactivateFlashSale}
                    disabled={disablingFlashSale}
                  >
                    {disablingFlashSale ? 'Đang tắt...' : 'Tắt flash sale'}
                  </button>
                  <button
                    type="button"
                    className="ta-btn ta-btn--danger"
                    onClick={deleteFlashSale}
                    disabled={deletingFlashSale || !flashSaleConfig || Boolean(flashSaleConfig?.is_active)}
                    title={flashSaleConfig?.is_active ? 'Cần tắt flash sale trước khi xoá' : 'Xoá vĩnh viễn flash sale này'}
                  >
                    {deletingFlashSale ? 'Đang xoá...' : 'Xoá flash sale'}
                  </button>
                </div>
                {flashSaleConfig?.is_active && (
                  <p className="ta-text-muted" style={{ marginTop: '8px' }}>
                    Muốn xoá flash sale, bạn cần tắt trước rồi mới xoá.
                  </p>
                )}
              </form>
            </div>

            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Trạng thái hiện tại</h3>
              </div>

              {!flashSaleConfig ? (
                <div className="ta-empty">Chưa có chương trình flash sale nào</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead>
                      <tr>
                        <th>Giảm giá</th>
                        <th>Đối tượng</th>
                        <th>Bắt đầu</th>
                        <th>Kết thúc</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="ta-text-bold">{Number(flashSaleConfig.discount_percentage || 0)}%</td>
                        <td>
                          {flashSaleConfig.target_type === 'all' && 'Tất cả khoá học'}
                          {flashSaleConfig.target_type === 'category' && `Danh mục: ${flashSaleConfig.target_value || '-'}`}
                          {flashSaleConfig.target_type === 'courses' && `Theo khoá học (${flashSaleConfig.course_ids?.length || 0})`}
                          {!['all', 'category', 'courses'].includes(String(flashSaleConfig.target_type || '')) && '-'}
                          {flashSaleConfig.target_type === 'courses' && selectedFlashSaleCourseNames.length > 0 && (
                            <div className="ta-text-muted" style={{ marginTop: '6px' }}>
                              {selectedFlashSaleCourseNames.join(', ')}
                            </div>
                          )}
                        </td>
                        <td>{flashSaleConfig.start_at ? new Date(flashSaleConfig.start_at).toLocaleString('vi-VN') : '-'}</td>
                        <td>{flashSaleConfig.end_at ? new Date(flashSaleConfig.end_at).toLocaleString('vi-VN') : '-'}</td>
                        <td>
                          <span className={`ta-badge ${flashSaleConfig.is_active ? 'ta-badge--active' : 'ta-badge--rejected'}`}>
                            {flashSaleConfig.is_active ? 'Đang bật' : 'Đã tắt'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders History */}
        {tab === 'orders' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Lịch sử đơn hàng ({filteredOrderRows.length}/{orderHistoryRows.length})</h3>
                <div className="ta-actions">
                  <button
                    className={`ta-btn ta-btn--sm ${orderStatusFilter === 'all' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                    onClick={() => setOrderStatusFilter('all')}
                  >
                    Tất cả ({orderStatusCounts.all})
                  </button>
                  <button
                    className={`ta-btn ta-btn--sm ${orderStatusFilter === 'pending' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                    onClick={() => setOrderStatusFilter('pending')}
                  >
                    Chờ IPN ({orderStatusCounts.pending})
                  </button>
                  <button
                    className={`ta-btn ta-btn--sm ${orderStatusFilter === 'success' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                    onClick={() => setOrderStatusFilter('success')}
                  >
                    Thành công ({orderStatusCounts.success})
                  </button>
                  <button
                    className={`ta-btn ta-btn--sm ${orderStatusFilter === 'failed' ? 'ta-btn--primary' : 'ta-btn--outline'}`}
                    onClick={() => setOrderStatusFilter('failed')}
                  >
                    Thất bại ({orderStatusCounts.failed})
                  </button>
                </div>
              </div>

              {orderHistoryRows.length === 0 ? (
                <div className="ta-empty">
                  <p>Chưa có đơn hàng nào</p>
                </div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>Mã đơn</th><th>Người mua</th><th>Tổng tiền</th><th>PT thanh toán</th><th>Trạng thái</th><th>Ghi chú</th><th>Cập nhật</th></tr></thead>
                    <tbody>
                      {filteredOrderRows.map((o) => {
                        const status = getOrderStatusMeta(o.status);
                        const note = o.approval_note || o.order_note || o.note || '-';
                        const updatedAt = o.action_time || o.created_at;

                        return (
                          <tr key={`${o.order_id}-${o.status || 'unknown'}`}>
                          <td className="ta-text-bold">#{o.order_id}</td>
                          <td>{o.fullname || o.email}</td>
                          <td className="ta-text-bold">{formatPrice(o.total_amount)}</td>
                          <td><span className={`ta-badge ${o.payment_method === 'sepay' ? 'ta-badge--success' : 'ta-badge--info'}`}>{getPaymentMethodLabel(o.payment_method)}</span></td>
                          <td><span className={`ta-badge ${status.badgeClass}`}>{status.text}</span></td>
                          <td className="ta-text-muted">{note}</td>
                          <td className="ta-text-muted">{updatedAt ? new Date(updatedAt).toLocaleString('vi-VN') : '-'}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Changes */}
        {tab === 'changes' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Thay đổi chờ duyệt ({pendingChanges.length})</h3>
              </div>
              {pendingChanges.length === 0 ? (
                <div className="ta-empty">Không có thay đổi nào chờ duyệt</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>ID</th><th>Giảng viên</th><th>Khóa học</th><th>Loại</th><th>Mô tả</th><th>Ngày</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {pendingChanges.map((c) => {
                        const isProcessingThisChange = processingChange.id === c.change_id;
                        const isApproving = isProcessingThisChange && processingChange.action === 'approve';
                        const isRejecting = isProcessingThisChange && processingChange.action === 'reject';

                        return (
                        <tr key={c.change_id}>
                          <td className="ta-text-muted">{c.change_id}</td>
                          <td className="ta-text-bold">{c.teacher_name || c.teacher_id}</td>
                          <td>{c.course_name || c.course_id}</td>
                          <td><span className="ta-badge ta-badge--info">{c.change_type}</span></td>
                          <td className="ta-text-muted">{c.description || '-'}</td>
                          <td className="ta-text-muted">{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div className="ta-actions">
                              <button
                                className="ta-btn ta-btn--sm ta-btn--success"
                                onClick={() => approveChange(c.change_id)}
                                disabled={isProcessingThisChange}
                              >
                                {isApproving ? 'Đang duyệt...' : 'Duyệt'}
                              </button>
                              <button
                                className="ta-btn ta-btn--sm ta-btn--danger"
                                onClick={() => rejectChange(c.change_id)}
                                disabled={isProcessingThisChange}
                              >
                                {isRejecting ? 'Đang từ chối...' : 'Từ chối'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lock Requests */}
        {tab === 'locks' && (
          <div>
            <div className="ta-table-wrap">
              <div className="ta-table-header">
                <h3 className="ta-table-title">Yêu cầu khóa tài khoản ({lockRequests.length})</h3>
              </div>
              {lockRequests.length === 0 ? (
                <div className="ta-empty">Không có yêu cầu nào</div>
              ) : (
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>ID</th><th>Người dùng</th><th>Lý do</th><th>Người yêu cầu</th><th>Ngày</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {lockRequests.map((r) => (
                        <tr key={r.id}>
                          <td className="ta-text-muted">{r.id}</td>
                          <td className="ta-text-bold">{r.target_name || r.user_id}</td>
                          <td>{r.reason}</td>
                          <td>{r.requester_name || r.requested_by}</td>
                          <td className="ta-text-muted">{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div className="ta-actions">
                              <button className="ta-btn ta-btn--sm ta-btn--success" onClick={() => approveLock(r.id)}>Duyệt</button>
                              <button className="ta-btn ta-btn--sm ta-btn--danger" onClick={() => rejectLock(r.id)}>Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue */}
        {tab === 'revenue' && (
          <div>
            <h2>Báo cáo doanh thu</h2>
            <div className="ta-metrics-grid">
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--cyan">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Tổng doanh thu</div>
                  <div className="ta-metric-value">{formatPrice(revenue?.total || 0)}</div>
                </div>
              </div>
              <div className="ta-metric-card">
                <div className="ta-metric-icon ta-metric-icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="ta-metric-body">
                  <div className="ta-metric-label">Giao dịch thành công</div>
                  <div className="ta-metric-value">{revenue?.details?.length || 0}</div>
                </div>
              </div>
            </div>
            {revenue?.details?.length > 0 && (
              <div className="ta-table-wrap">
                <div className="ta-table-header">
                  <h3 className="ta-table-title">Chi tiết doanh thu</h3>
                </div>
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead><tr><th>Người dùng</th><th>Số đơn</th><th>Tổng chi</th></tr></thead>
                    <tbody>
                      {revenue.details.map((d, i) => (
                        <tr key={i}>
                          <td className="ta-text-bold">{d.fullname || d.email}</td>
                          <td>{d.order_count}</td>
                          <td className="ta-text-bold">{formatPrice(d.total_spent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        {tab === 'reviews' && (
          <div>
            <h2>Quản lý đánh giá</h2>
            <ReviewManager role="admin" courses={courses} />
          </div>
        )}

        {/* Certificates */}
        {tab === 'certificates' && (
          <div>
            <h2>Thống kê chứng chỉ</h2>
            {certSummary.length === 0 ? (
              <div className="ta-empty-state">
                <div className="ta-empty-icon">🏆</div>
                <h3>Chưa có chứng chỉ nào được cấp</h3>
                <p>Khi học viên hoàn thành 100% khóa học, chứng chỉ sẽ tự động được cấp.</p>
              </div>
            ) : (
              <div className="ta-table-wrap">
                <div className="ta-table-header">
                  <h3 className="ta-table-title">Khóa học đã cấp chứng chỉ</h3>
                </div>
                <div className="ta-table-scroll">
                  <table className="ta-table">
                    <thead>
                      <tr>
                        <th>Khóa học</th>
                        <th>Danh mục</th>
                        <th style={{ textAlign: 'center' }}>Số chứng chỉ đã cấp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certSummary.map(row => (
                        <tr key={row.course_id}>
                          <td className="ta-text-bold">{row.course_name}</td>
                          <td><span className="ta-badge ta-badge--info">{row.category}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="ta-badge ta-badge--success">{row.cert_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
