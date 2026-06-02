export const COURSE_CATEGORIES = [
  { key: 'python', name: 'Lập trình - CNTT', alt: 'python-basics' },
  { key: 'finance', name: 'Tài chính', alt: 'tai-chinh-co-ban' },
  { key: 'data', name: 'Data Analyst', alt: 'data-analytics-co-ban' },
  { key: 'blockchain', name: 'Blockchain', alt: 'blockchain-co-ban' },
  { key: 'accounting', name: 'Kế toán', alt: 'ke-toan-co-ban' },
  { key: 'marketing', name: 'Marketing', alt: 'digital-marketing' },
];

export const SEARCH_CATEGORIES = [
  { key: '', name: 'Tất cả' },
  ...COURSE_CATEGORIES,
];

export function getCourseCategoryLabel(categoryKey) {
  return COURSE_CATEGORIES.find((category) => category.key === categoryKey)?.name || categoryKey || 'Khác';
}
