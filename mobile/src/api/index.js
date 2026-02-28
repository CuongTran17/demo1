import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your backend URL
// For Android emulator: http://10.0.2.2:3000
// For iOS simulator: http://localhost:3000
// For physical device: use your computer's IP address
const API_URL = 'http://10.0.2.2:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    // SecureStore might not be available on all platforms
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - could trigger logout here
      console.log('Unauthorized - token may be expired');
    }
    return Promise.reject(error);
  }
);

// ============ Auth API ============
export const authAPI = {
  login: (emailOrPhone, password) =>
    api.post('/auth/login', { emailOrPhone, password }),
  register: (data) => api.post('/auth/register', data),
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
  create: (paymentMethod, note) =>
    api.post('/orders', { paymentMethod, note }),
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
};

// ============ Admin API ============
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
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
};

export default api;
