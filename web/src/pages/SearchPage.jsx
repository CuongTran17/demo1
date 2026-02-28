import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesAPI } from '../api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [sortBy, setSortBy] = useState('');

  const categories = [
    { key: '', name: 'Tất cả' },
    { key: 'python', name: 'Lập trình - CNTT' },
    { key: 'finance', name: 'Tài chính' },
    { key: 'data', name: 'Data Analyst' },
    { key: 'blockchain', name: 'Blockchain' },
    { key: 'accounting', name: 'Kế toán' },
    { key: 'marketing', name: 'Marketing' },
  ];

  const levels = [
    { key: '', name: 'Tất cả' },
    { key: 'Cơ bản', name: 'Cơ bản' },
    { key: 'Trung cấp', name: 'Trung cấp' },
    { key: 'Nâng cao', name: 'Nâng cao' },
  ];

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, query, category, level, sortBy]);

  const loadCourses = async () => {
    try {
      const res = await coursesAPI.getAll();
      setCourses(res.data.courses || res.data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let result = [...courses];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (c) =>
          c.course_name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q)
      );
    }

    if (category) {
      result = result.filter((c) => c.category === category);
    }

    if (level) {
      result = result.filter((c) => c.level === level);
    }

    if (sortBy === 'price-asc') result.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === 'price-desc') result.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === 'name') result.sort((a, b) => a.course_name.localeCompare(b.course_name));
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFiltered(result);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  return (
    <div className="container">
      <h1 className="page-title">Tìm kiếm khóa học</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
        <div className="header-search-form" style={{ maxWidth: '500px' }}>
          <input
            type="text"
            className="header-search-input"
            placeholder="Tìm kiếm khóa học..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="header-search-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>
      </form>

      <div className="search-layout">
        {/* Filters */}
        <aside className="search-filters">
          <div className="filter-group">
            <h4>Danh mục</h4>
            {categories.map((cat) => (
              <label key={cat.key}>
                <input
                  type="radio"
                  name="category"
                  checked={category === cat.key}
                  onChange={() => setCategory(cat.key)}
                />
                {cat.name}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Trình độ</h4>
            {levels.map((l) => (
              <label key={l.key}>
                <input
                  type="radio"
                  name="level"
                  checked={level === l.key}
                  onChange={() => setLevel(l.key)}
                />
                {l.name}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Sắp xếp</h4>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--border)', fontSize: '14px', fontFamily: 'inherit'
              }}
            >
              <option value="">Mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="name">Tên A-Z</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>

          <button
            className="btn btn-outline"
            style={{ width: '100%' }}
            onClick={() => { setQuery(''); setCategory(''); setLevel(''); setSortBy(''); }}
          >
            Xóa bộ lọc
          </button>
        </aside>

        {/* Results */}
        <div>
          <p className="search-results-count">
            Tìm thấy <strong>{filtered.length}</strong> khóa học
            {query && <> cho "<strong>{query}</strong>"</>}
          </p>

          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="text-center" style={{ padding: '60px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
              <h3>Không tìm thấy khóa học nào</h3>
              <p style={{ color: '#666' }}>Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {filtered.map((course) => (
                <CourseCard key={course.course_id} course={course} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
