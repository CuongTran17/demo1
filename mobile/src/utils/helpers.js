// Format price to Vietnamese dong
export const formatPrice = (price) => {
  if (!price && price !== 0) return '';
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format date with time
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN');
};

// Get category display name
export const getCategoryName = (category) => {
  const names = {
    python: 'Python',
    finance: 'Tài chính',
    data: 'Phân tích dữ liệu',
    blockchain: 'Blockchain',
    accounting: 'Kế toán',
    marketing: 'Marketing',
  };
  return names[category] || category;
};

// Get order status display
export const getOrderStatusText = (status) => {
  const statuses = {
    pending: 'Chờ xử lý',
    pending_payment: 'Chờ thanh toán',
    completed: 'Hoàn thành',
    rejected: 'Bị từ chối',
    cancelled: 'Đã hủy',
  };
  return statuses[status] || status;
};

// Get order status color
export const getOrderStatusColor = (status) => {
  const colors = {
    pending: '#f59e0b',
    pending_payment: '#3b82f6',
    completed: '#10b981',
    rejected: '#ef4444',
    cancelled: '#6b7280',
  };
  return colors[status] || '#6b7280';
};

// Extract YouTube video ID from URL
export const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};
