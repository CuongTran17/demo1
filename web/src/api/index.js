import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear token for non-auth endpoints (i.e. token expired)
      const url = error.config?.url || '';
      const isPublicAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/register/request-otp') ||
        url.includes('/auth/forgot-password/request-otp') ||
        url.includes('/auth/forgot-password/reset');

      if (!isPublicAuthEndpoint) {
        localStorage.removeItem('token');
      }
    }

    // Gắn message thân thiện cho lỗi rate limit
    if (error.response?.status === 429) {
      const serverMsg = error.response?.data?.error;
      error.message = serverMsg || 'Bạn thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau.';
    }

    return Promise.reject(error);
  }
);

// ============ Auth API ============
export const authAPI = {
  login: (emailOrPhone, password) =>
    api.post('/auth/login', { emailOrPhone, password }),
  register: (data) => api.post('/auth/register', data),
  startRegister: (data) => api.post('/auth/register/start', data),
  completeRegister: (email, otpCode) =>
    api.post('/auth/register/complete', { email, otpCode }),
  requestRegisterOtp: (email) => api.post('/auth/register/request-otp', { email }),
  requestForgotPasswordOtp: (email) =>
    api.post('/auth/forgot-password/request-otp', { email }),
  resetForgotPassword: (email, otpCode, newPassword) =>
    api.post('/auth/forgot-password/reset', { email, otpCode, newPassword }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  checkEmail: (email) => api.get(`/auth/check-email?email=${email}`),
};

// ============ Courses API ============
export const coursesAPI = {
  getAll: () => api.get('/courses'),
  getByCategory: (category) => api.get(`/courses?category=${category}`),
  getById: (id) => api.get(`/courses/${id}`),
  search: (params) => api.get('/courses/search', { params }),
  getMyCourses: () => api.get('/courses/my-courses'),
  getPurchasedIds: () => api.get('/courses/purchased-ids'),
};

// ============ Cart API ============
export const cartAPI = {
  get: () => api.get('/cart'),
  add: (courseId) => api.post('/cart/add', { courseId }),
  remove: (courseId) => api.delete(`/cart/${courseId}`),
  clear: () => api.delete('/cart'),
  getCount: () => api.get('/cart/count'),
};

// ============ Orders API ============
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  create: (paymentMethod, note, discountCode) =>
    api.post('/orders', { paymentMethod, note, discountCode }),
  // Creates order and immediately completes it (no admin approval needed)
  instantCheckout: (note, discountCode) =>
    api.post('/orders/instant-checkout', { note, discountCode }),
  validateDiscountCode: (code) =>
    api.post('/orders/discount-codes/validate', { code }),
  cancelOrder: (id, reason) =>
    api.post(`/orders/${id}/cancel`, { reason }),
};

// ============ SePay API ============
export const sepayAPI = {
  createPayment: (discountCode) =>
    api.post('/sepay/create-payment', { discountCode }),
};

// ============ Lessons API ============
export const lessonsAPI = {
  getByCourse: (courseId) => api.get(`/lessons?courseId=${courseId}`),
  getById: (lessonId) => api.get(`/lessons?lessonId=${lessonId}`),
  getProgress: (courseId) => api.get(`/lessons/progress/${courseId}`),
  markComplete: (courseId, lessonId) =>
    api.post('/lessons/progress/complete', { courseId, lessonId }),
  resetProgress: (courseId, lessonId) =>
    api.post('/lessons/progress/reset', { courseId, lessonId }),
  updateVideoProgress: (courseId, lessonId, segments, duration, lastPosition) =>
    api.post('/lessons/progress/video', { courseId, lessonId, segments, duration, lastPosition }),
  getVideoProgress: (courseId) => api.get(`/lessons/progress/video/${courseId}`),
  getVideoProgressByLesson: (courseId, lessonId) =>
    api.get(`/lessons/progress/video/${courseId}/${lessonId}`),
};

// ============ Admin API ============
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  createTeacher: (data) => api.post('/admin/users/create-teacher', data),
  lockUser: (id, reason) => api.post(`/admin/users/${id}/lock`, { reason }),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
  getLockRequests: () => api.get('/admin/lock-requests'),
  approveLockRequest: (id) => api.post(`/admin/lock-requests/${id}/approve`),
  rejectLockRequest: (id) => api.post(`/admin/lock-requests/${id}/reject`),
  assignCourse: (teacherId, courseId) =>
    api.post('/admin/assign-course', { teacherId, courseId }),
  removeCourse: (teacherId, courseId) =>
    api.delete('/admin/assign-course', { data: { teacherId, courseId } }),
  approveChange: (id, note) => api.post(`/admin/changes/${id}/approve`, { note }),
  rejectChange: (id, note) => api.post(`/admin/changes/${id}/reject`, { note }),
  approveOrder: (id, note) => api.post(`/admin/orders/${id}/approve`, { note }),
  rejectOrder: (id, note) => api.post(`/admin/orders/${id}/reject`, { note }),
  getRevenue: () => api.get('/admin/revenue'),
  getDiscountCodes: () => api.get('/admin/discount-codes'),
  createDiscountCode: (data) => api.post('/admin/discount-codes', data),
  updateDiscountCode: (id, data) => api.put(`/admin/discount-codes/${id}`, data),
  deleteDiscountCode: (id) => api.delete(`/admin/discount-codes/${id}`),
  updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data),
  getFlashSale: () => api.get('/admin/flash-sale'),
  saveFlashSale: (data) => api.put('/admin/flash-sale', data),
  disableFlashSale: () => api.delete('/admin/flash-sale'),
  deleteFlashSale: (id) => api.delete(`/admin/flash-sale/${id}`),
  uploadImage: (formData) =>
    api.post('/admin/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getReviewsByCourse: (courseId) => api.get(`/admin/reviews/course/${courseId}`),
  replyReview: (reviewId, content) => api.post(`/admin/reviews/${reviewId}/reply`, { content }),
  getAnalytics: () => api.get('/admin/analytics'),
  getChangeHistory: () => api.get('/admin/changes/history'),
};

// ============ Certificates API ============
export const certificatesAPI = {
  getMy: () => api.get('/certificates/my'),
  download: (courseId) =>
    api.get(`/certificates/download/${courseId}`, { responseType: 'blob' }),
  adminSummary: () => api.get('/certificates/admin/summary'),
  adminByCourse: (courseId) => api.get(`/certificates/admin/course/${courseId}`),
};

// ============ Reviews API ============
export const reviewsAPI = {
  getByCourse: (courseId, page = 1, limit = 10) =>
    api.get(`/reviews/course/${courseId}`, { params: { page, limit } }),
  create: (courseId, data) => api.post(`/reviews/course/${courseId}`, data),
  update: (reviewId, data) => api.put(`/reviews/${reviewId}`, data),
  remove: (reviewId) => api.delete(`/reviews/${reviewId}`),
};

// ============ Flash Sale Public API ============
export const flashSaleAPI = {
  getActive: () => api.get('/flash-sales/active'),
};

// ============ Quiz API ============
export const quizzesAPI = {
  getByCourse: (courseId) => api.get(`/quizzes?courseId=${courseId}`),
  getById: (quizId) => api.get(`/quizzes/${quizId}`),
  getStatus: (quizId) => api.get(`/quizzes/${quizId}/status`),
  getReview: (quizId) => api.get(`/quizzes/${quizId}/review`),
  submit: (quizId, answers) => api.post(`/quizzes/${quizId}/submit`, { answers }),
};

// ============ Teacher API ============
export const teacherAPI = {
  getDashboard: () => api.get('/teacher/dashboard'),
  createCourse: (data) => api.post('/teacher/courses', data),
  updateCourse: (id, data) => api.put(`/teacher/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/teacher/courses/${id}`),
  createLesson: (data) => api.post('/teacher/lessons', data),
  updateLesson: (id, data) => api.put(`/teacher/lessons/${id}`, data),
  deleteLesson: (id) => api.delete(`/teacher/lessons/${id}`),
  uploadImage: (formData) =>
    api.post('/teacher/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createLockRequest: (data) => api.post('/teacher/lock-request', data),
  getMyLockRequests: () => api.get('/teacher/my-lock-requests'),
  getReviewsByCourse: (courseId) => api.get(`/teacher/reviews/course/${courseId}`),
  replyReview: (reviewId, content) => api.post(`/teacher/reviews/${reviewId}/reply`, { content }),
  getQuizzesByCourse: (courseId) => api.get(`/teacher/quizzes?courseId=${courseId}`),
  createQuiz: (data) => api.post('/teacher/quizzes', data),
  deleteQuiz: (id) => api.delete(`/teacher/quizzes/${id}`),
  resubmitChange: (id, data) => api.put(`/teacher/changes/${id}/resubmit`, data),
  withdrawChange: (id) => api.delete(`/teacher/changes/${id}`),
  getStudentProgress: (courseId) => api.get(`/teacher/students?courseId=${courseId}`),
};

export default api;
