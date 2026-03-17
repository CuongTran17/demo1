export function formatPrice(price) {
  if (!price && price !== 0) return '0₫';
  return Number(price).toLocaleString('vi-VN') + '₫';
}

const FALLBACK_THUMBNAIL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225" fill="none"><rect width="400" height="225" rx="18" fill="#e2e8f0"/><rect x="24" y="24" width="352" height="177" rx="14" fill="#cbd5e1"/><path d="M110 148l36-40 31 31 49-60 64 69H110z" fill="#94a3b8"/><circle cx="142" cy="86" r="16" fill="#f8fafc"/><text x="200" y="194" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="22" font-weight="700">COURSE</text></svg>'
)}`;

export function resolveThumbnail(thumb) {
  if (!thumb) return FALLBACK_THUMBNAIL;
  if (thumb.startsWith('http')) return thumb;
  if (thumb.startsWith('/uploads/')) return thumb;

  const filename = thumb.includes('/') ? thumb.split('/').pop() : thumb;
  return `/uploads/course-images/${encodeURIComponent(filename)}`;
}
