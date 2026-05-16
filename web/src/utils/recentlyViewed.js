const KEY = 'ptit_recently_viewed_courses';
const MAX_ITEMS = 8;

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storageAvailable() {
  try {
    const key = '__ptit_recent_test__';
    localStorage.setItem(key, key);
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getRecentlyViewed() {
  if (typeof window === 'undefined' || !storageAvailable()) return [];
  return safeParse(localStorage.getItem(KEY));
}

export function addRecentlyViewed(course) {
  if (typeof window === 'undefined' || !storageAvailable() || !course?.course_id) return [];
  const compact = {
    course_id: course.course_id,
    course_name: course.course_name,
    category: course.category,
    level: course.level,
    price: course.price,
    old_price: course.old_price,
    thumbnail: course.thumbnail,
    average_rating: course.average_rating,
    review_count: course.review_count,
    viewed_at: new Date().toISOString(),
  };
  const next = [compact, ...getRecentlyViewed().filter((item) => item.course_id !== compact.course_id)].slice(0, MAX_ITEMS);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearRecentlyViewed() {
  if (typeof window !== 'undefined' && storageAvailable()) localStorage.removeItem(KEY);
}
