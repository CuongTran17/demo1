import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesAPI } from '../api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  const filterCourses = useCallback(() => {
    let result = [...courses];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter(
        (c) =>
          c.course_name?.toLowerCase().includes(normalizedQuery) ||
          c.description?.toLowerCase().includes(normalizedQuery) ||
          c.category?.toLowerCase().includes(normalizedQuery)
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
    setCurrentPage(1);
  }, [courses, query, category, level, sortBy]);

  useEffect(() => {
    filterCourses();
  }, [filterCourses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadCourses = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await coursesAPI.getAll();
      setCourses(res.data.courses || res.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container search-page-shell">
      <div className="search-header">
        <h1 className="page-title">Tìm kiếm khóa học</h1>
      </div>

      <div className={`search-layout ${isFilterOpen ? '' : 'filters-collapsed'}`}>
        {/* Sidebar Filters */}
        <aside id="search-filter-panel" className={`search-sidebar ${isFilterOpen ? '' : 'closed'}`}>
          <div className="search-filter-head">
            <h4 className="filter-title">Bộ lọc</h4>
            <span>Tinh chỉnh kết quả</span>
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
                    onChange={() => setCategory(cat.key)}
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
            onClick={() => { setQuery(''); setCategory(''); setLevel(''); setSortBy(''); }}
          >
            Xóa bộ lọc
          </button>
        </aside>

        {/* Results */}
        <div className="search-results">
          <div className="results-header">
            <div className="results-header-left">
              <button
                type="button"
                className="search-filter-toggle"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-expanded={isFilterOpen}
                aria-controls="search-filter-panel"
              >
                {isFilterOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              </button>
              <span className="results-count">
                Tìm thấy <strong>{filtered.length}</strong> khóa học
                {query && <> cho "<strong>{query}</strong>"</>}
              </span>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="no-results">
              <div className="no-results-icon">⚠️</div>
              <h2>Không thể tải khóa học</h2>
              <p>Đã xảy ra lỗi kết nối. Vui lòng thử lại.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadCourses}>
                Thử lại
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h2>Không tìm thấy khóa học nào</h2>
              <p>Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            <>
              <div className="search-grid">
                {paginated.map((course) => (
                  <div key={course.course_id} className="search-spotlight-item">
                    <CourseCard course={course} spotlight />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
                    disabled={currentPage === 1}
                  >
                    &lsaquo; Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '…' ? (
                        <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#888' }}>…</span>
                      ) : (
                        <button
                          key={p}
                          className={`btn ${currentPage === p ? 'btn-primary' : 'btn-outline'}`}
                          style={{ minWidth: 36 }}
                          onClick={() => { setCurrentPage(p); window.scrollTo(0, 0); }}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    className="btn btn-outline"
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }}
                    disabled={currentPage === totalPages}
                  >
                    Sau &rsaquo;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
