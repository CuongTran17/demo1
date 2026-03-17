import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesAPI } from '../api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [sortBy, setSortBy] = useState('');
  const query = searchParams.get('q') || '';
  const deferredQuery = useDeferredValue(query);

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
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

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

  const filtered = useMemo(() => {
    let result = [...courses];

    if (deferredQuery) {
      const q = deferredQuery.toLowerCase();
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

    return result;
  }, [courses, deferredQuery, category, level, sortBy]);

  const handleCategoryChange = (nextCategory) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory) nextParams.set('category', nextCategory);
    else nextParams.delete('category');
    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setCategory('');
    setLevel('');
    setSortBy('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('category');
    setSearchParams(nextParams);
  };

  return (
    <div className="container">
      <div className="search-header">
        <h1 className="page-title">Tìm kiếm khóa học</h1>
      </div>

      <div className={`search-layout ${filtersOpen ? '' : 'filters-collapsed'}`}>
        {/* Filter Menu */}
        <aside className={`search-sidebar ${filtersOpen ? 'open' : 'closed'}`}>
          <div className="search-filter-head">
            <h4 className="filter-title">Bộ lọc nhanh</h4>
            <span>{filtered.length} kết quả</span>
          </div>

          <div className="filter-section">
            <h5 className="filter-subtitle">Danh mục</h5>
            <div className="filter-options">
              {categories.map((cat) => (
                <label key={cat.key} className="filter-option">
                  <input
                    type="radio"
                    name="category"
                    checked={category === cat.key}
                    onChange={() => handleCategoryChange(cat.key)}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h5 className="filter-subtitle">Trình độ</h5>
            <div className="filter-options">
              {levels.map((l) => (
                <label key={l.key} className="filter-option">
                  <input
                    type="radio"
                    name="level"
                    checked={level === l.key}
                    onChange={() => setLevel(l.key)}
                  />
                  <span>{l.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h5 className="filter-subtitle">Sắp xếp</h5>
            <select
              className="sort-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
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
            onClick={handleResetFilters}
          >
            Xóa bộ lọc
          </button>
        </aside>

        {/* Results */}
        <div className="search-results">
          <div className="results-header">
            <button
              type="button"
              className="search-filter-toggle"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              {filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
            </button>
            <span className="results-count">
              Tìm thấy <strong>{filtered.length}</strong> khóa học
              {query && <> cho "<strong>{query}</strong>"</>}
            </span>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h2>Không tìm thấy khóa học nào</h2>
              <p>Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            <div className="search-grid">
              {filtered.map((course) => (
                <div key={course.course_id} className="search-spotlight-item">
                  <CourseCard course={course} spotlight />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
