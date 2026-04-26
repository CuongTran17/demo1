import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, certificatesAPI } from '../api';
import ReviewManager from '../components/ReviewManager';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import AdminOverviewTab from '../components/admin/AdminOverviewTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminCoursesTab from '../components/admin/AdminCoursesTab';
import AdminPromotionsTab from '../components/admin/AdminPromotionsTab';
import AdminOrdersTab from '../components/admin/AdminOrdersTab';
import AdminChangesTab from '../components/admin/AdminChangesTab';
import AdminLocksTab from '../components/admin/AdminLocksTab';
import AdminRevenueTab from '../components/admin/AdminRevenueTab';
import AdminCertificatesTab from '../components/admin/AdminCertificatesTab';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'users', label: 'Quản lý người dùng' },
  { key: 'courses', label: 'Khóa học' },
  { key: 'promotions', label: 'Khuyến mãi' },
  { key: 'orders', label: 'Lịch sử đơn hàng' },
  { key: 'changes', label: 'Thay đổi chờ duyệt' },
  { key: 'locks', label: 'Yêu cầu khóa' },
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'certificates', label: 'Chứng chỉ' },
  { key: 'reviews', label: 'Đánh giá' },
];

const EMPTY_ADMIN_DASHBOARD = {
  stats: { totalUsers: 0, totalTeachers: 0, totalCourses: 0, pendingChanges: 0, pendingOrders: 0, totalRevenue: 0 },
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
    discountPercentage: flashSale?.discount_percentage != null ? String(flashSale.discount_percentage) : '',
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
  const [analytics, setAnalytics] = useState(null);
  const [certSummary, setCertSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [processingChange, setProcessingChange] = useState({ id: null, action: null });
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [changeHistory, setChangeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [updatingRoleId, setUpdatingRoleId] = useState(null);

  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('all');

  const [teacherForm, setTeacherForm] = useState({ fullname: '', email: '', phone: '', password: '' });
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);

  const [assignForm, setAssignForm] = useState({ teacherId: '', courseId: '' });
  const [showAssignCourse, setShowAssignCourse] = useState(false);

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

      const [locksRes, revRes, flashSaleRes, certsRes, analyticsRes] = await Promise.all([
        adminAPI.getLockRequests().catch(() => ({ data: [] })),
        adminAPI.getRevenue().catch(() => ({ data: { total: 0, details: [] } })),
        adminAPI.getFlashSale().catch(() => ({ data: null })),
        certificatesAPI.adminSummary().catch(() => ({ data: { summary: [] } })),
        adminAPI.getAnalytics().catch(() => ({ data: null })),
      ]);
      setLockRequests(locksRes.data || []);
      setRevenue(revRes.data);
      setAnalytics(analyticsRes.data || null);
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

  const rejectChange = async (changeId, note) => {
    if (processingChange.id === changeId) return;
    setProcessingChange({ id: changeId, action: 'reject' });
    try {
      const res = await adminAPI.rejectChange(changeId, note || undefined);
      setToast({ message: res.data?.message || 'Đã từ chối', type: 'success' });
      await loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi', type: 'error' });
    } finally {
      setProcessingChange({ id: null, action: null });
    }
  };

  const loadChangeHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await adminAPI.getChangeHistory();
      setChangeHistory(res.data || []);
    } catch {
      setChangeHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const bulkApproveChanges = async (ids) => {
    setBulkProcessing(true);
    let approved = 0, failed = 0;
    for (const id of ids) {
      try { await adminAPI.approveChange(id); approved++; }
      catch { failed++; }
    }
    await loadDashboard();
    setBulkProcessing(false);
    if (failed === 0) setToast({ message: `Đã duyệt ${approved} yêu cầu`, type: 'success' });
    else setToast({ message: `Đã duyệt ${approved}, lỗi ${failed} yêu cầu`, type: 'error' });
  };

  const bulkRejectChanges = async (ids) => {
    setBulkProcessing(true);
    let rejected = 0, failed = 0;
    for (const id of ids) {
      try { await adminAPI.rejectChange(id); rejected++; }
      catch { failed++; }
    }
    await loadDashboard();
    setBulkProcessing(false);
    if (failed === 0) setToast({ message: `Đã từ chối ${rejected} yêu cầu`, type: 'success' });
    else setToast({ message: `Đã từ chối ${rejected}, lỗi ${failed} yêu cầu`, type: 'error' });
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
      if (editingDiscountCodeId === id) cancelEditDiscountCode();
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
      return {
        ...prev,
        courseIds: hasCourse ? prev.courseIds.filter((id) => id !== normalizedId) : [...prev.courseIds, normalizedId],
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

  const saveCourse = async (courseId, formData, imageFile) => {
    try {
      let thumbnail = formData.thumbnail;
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const res = await adminAPI.uploadImage(fd);
        thumbnail = res.data.imageUrl;
      }
      await adminAPI.updateCourse(courseId, { ...formData, thumbnail });
      setToast({ message: 'Cập nhật khóa học thành công', type: 'success' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lỗi cập nhật khóa học', type: 'error' });
    }
  };

  const {
    stats = EMPTY_ADMIN_DASHBOARD.stats,
    users = [],
    courses = [],
    pendingChanges = [],
    pendingOrders = [],
    paymentHistory = [],
    discountCodes = [],
  } = data || {};

  const courseCategories = useMemo(() => {
    return [...new Set(courses.map((c) => String(c.category || '').trim()).filter(Boolean))];
  }, [courses]);

  const courseById = useMemo(() => {
    const map = new Map();
    for (const course of courses) map.set(String(course.course_id || '').trim(), course);
    return map;
  }, [courses]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const role = u.role || getUserRole(u.email);
      const q = userSearch.trim().toLowerCase();
      const matchSearch = !q || u.fullname?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
      const matchRole = userRoleFilter === 'all' || role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredAdminCourses = useMemo(() => {
    return courses.filter((c) => {
      const q = courseSearch.trim().toLowerCase();
      const matchSearch = !q || c.course_name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q);
      const matchCategory = courseCategoryFilter === 'all' || c.category === courseCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [courses, courseSearch, courseCategoryFilter]);

  const selectedFlashSaleCourseNames = useMemo(() => {
    const ids = Array.isArray(flashSaleConfig?.course_ids) ? flashSaleConfig.course_ids : [];
    return ids.map((courseId) => courseById.get(String(courseId || '').trim())?.course_name || courseId).filter(Boolean);
  }, [flashSaleConfig, courseById]);

  const orderHistoryRows = useMemo(() => {
    const allRows = [...pendingOrders, ...paymentHistory];
    const byOrderId = new Map();
    const toTime = (value) => { const t = value ? new Date(value).getTime() : 0; return Number.isFinite(t) ? t : 0; };
    for (const row of allRows) {
      const orderId = row.order_id;
      if (!orderId) continue;
      const previous = byOrderId.get(orderId);
      if (!previous) { byOrderId.set(orderId, row); continue; }
      const prevScore = Math.max(toTime(previous.action_time), toTime(previous.created_at));
      const curScore = Math.max(toTime(row.action_time), toTime(row.created_at));
      if (curScore >= prevScore) byOrderId.set(orderId, { ...previous, ...row });
    }
    return Array.from(byOrderId.values()).sort((a, b) => (toTime(b.created_at) - toTime(a.created_at)));
  }, [pendingOrders, paymentHistory]);

  const orderStatusCounts = useMemo(() => ({
    all: orderHistoryRows.length,
    pending: orderHistoryRows.filter((o) => o.status === 'pending_payment').length,
    success: orderHistoryRows.filter((o) => o.status === 'completed').length,
    failed: orderHistoryRows.filter((o) => ['cancelled', 'rejected'].includes(o.status)).length,
  }), [orderHistoryRows]);

  const filteredOrderRows = useMemo(() => {
    if (orderStatusFilter === 'pending') return orderHistoryRows.filter((o) => o.status === 'pending_payment');
    if (orderStatusFilter === 'success') return orderHistoryRows.filter((o) => o.status === 'completed');
    if (orderStatusFilter === 'failed') return orderHistoryRows.filter((o) => ['cancelled', 'rejected'].includes(o.status));
    return orderHistoryRows;
  }, [orderHistoryRows, orderStatusFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout
      menuItems={TABS}
      activeTab={tab}
      onTabChange={setTab}
      title="PTIT Learning"
      subtitle="Admin Panel"
      theme="admin"
      badges={{ orders: pendingOrders.length, changes: pendingChanges.length, locks: lockRequests.length }}
      onLogout={() => { logout(); navigate('/'); }}
    >
      <div className="ds-content">
        {tab === 'overview' && (
          <AdminOverviewTab
            stats={stats}
            revenue={revenue}
            analytics={analytics}
            pendingChanges={pendingChanges}
            pendingOrders={pendingOrders}
            lockRequests={lockRequests}
            onTabChange={setTab}
          />
        )}

        {tab === 'users' && (
          <AdminUsersTab
            users={users}
            filteredUsers={filteredUsers}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userRoleFilter={userRoleFilter}
            setUserRoleFilter={setUserRoleFilter}
            updatingRoleId={updatingRoleId}
            showCreateTeacher={showCreateTeacher}
            setShowCreateTeacher={setShowCreateTeacher}
            showAssignCourse={showAssignCourse}
            setShowAssignCourse={setShowAssignCourse}
            teacherForm={teacherForm}
            setTeacherForm={setTeacherForm}
            assignForm={assignForm}
            setAssignForm={setAssignForm}
            courses={courses}
            resolveRole={resolveRole}
            onCreateTeacher={createTeacher}
            onAssignCourse={assignCourse}
            onLockUser={lockUser}
            onUnlockUser={unlockUser}
            onDeleteUser={deleteUser}
            onUpdateUserRole={updateUserRole}
          />
        )}

        {tab === 'courses' && (
          <AdminCoursesTab
            courses={courses}
            filteredAdminCourses={filteredAdminCourses}
            courseSearch={courseSearch}
            setCourseSearch={setCourseSearch}
            courseCategoryFilter={courseCategoryFilter}
            setCourseCategoryFilter={setCourseCategoryFilter}
            courseCategories={courseCategories}
            onSaveCourse={saveCourse}
          />
        )}

        {tab === 'promotions' && (
          <AdminPromotionsTab
            discountCodes={discountCodes}
            discountCodeForm={discountCodeForm}
            setDiscountCodeForm={setDiscountCodeForm}
            editingDiscountCodeId={editingDiscountCodeId}
            creatingDiscountCode={creatingDiscountCode}
            deletingDiscountCodeId={deletingDiscountCodeId}
            onSubmitDiscount={createDiscountCode}
            onStartEditDiscount={startEditDiscountCode}
            onCancelEditDiscount={cancelEditDiscountCode}
            onDeleteDiscount={deleteDiscountCode}
            flashSaleConfig={flashSaleConfig}
            flashSaleForm={flashSaleForm}
            setFlashSaleForm={setFlashSaleForm}
            savingFlashSale={savingFlashSale}
            disablingFlashSale={disablingFlashSale}
            deletingFlashSale={deletingFlashSale}
            onSaveFlashSale={saveFlashSale}
            onDeactivateFlashSale={deactivateFlashSale}
            onDeleteFlashSale={deleteFlashSale}
            onToggleCourse={toggleFlashSaleCourse}
            courses={courses}
            courseCategories={courseCategories}
            selectedFlashSaleCourseNames={selectedFlashSaleCourseNames}
          />
        )}

        {tab === 'orders' && (
          <AdminOrdersTab
            filteredOrderRows={filteredOrderRows}
            orderHistoryRows={orderHistoryRows}
            orderStatusFilter={orderStatusFilter}
            setOrderStatusFilter={setOrderStatusFilter}
            orderStatusCounts={orderStatusCounts}
          />
        )}

        {tab === 'changes' && (
          <AdminChangesTab
            pendingChanges={pendingChanges}
            processingChange={processingChange}
            onApprove={approveChange}
            onReject={rejectChange}
            onBulkApprove={bulkApproveChanges}
            onBulkReject={bulkRejectChanges}
            bulkProcessing={bulkProcessing}
            changeHistory={changeHistory}
            loadingHistory={loadingHistory}
            onLoadHistory={loadChangeHistory}
          />
        )}

        {tab === 'locks' && (
          <AdminLocksTab
            lockRequests={lockRequests}
            onApprove={approveLock}
            onReject={rejectLock}
          />
        )}

        {tab === 'revenue' && (
          <AdminRevenueTab revenue={revenue} analytics={analytics} />
        )}

        {tab === 'certificates' && (
          <AdminCertificatesTab certSummary={certSummary} />
        )}

        {tab === 'reviews' && (
          <div>
            <h2>Quản lý đánh giá</h2>
            <ReviewManager role="admin" courses={courses} />
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
