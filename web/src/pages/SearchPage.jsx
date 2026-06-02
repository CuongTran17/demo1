import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bundlesAPI, coursesAPI } from '../api';
import CourseCard from '../components/CourseCard';
import BundleCard from '../components/BundleCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { SEARCH_CATEGORIES } from '../utils/courseCategories';

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredBundles, setFilteredBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [contentType, setContentType] = useState(searchParams.get('type') === 'bundles' ? 'bundles' : 'courses');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const categories = SEARCH_CATEGORIES;
  const levels = [
    { key: '', name: 'Tất cả' },
    { key: 'Cơ bản', name: 'Cơ bản' },
    { key: 'Trung cấp', name: 'Trung cấp' },
    { key: 'Nâng cao', name: 'Nâng cao' },
  ];

  const activeResults = contentType === 'bundles' ? filteredBundles : filteredCourses;
  const totalPages = Math.max(1, Math.ceil(activeResults.length / PAGE_SIZE));
  const paginated = activeResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadCatalog = async () => {
    setLoading(true);
    setError(false);
    try {
      const [coursesRes, bundlesRes] = await Promise.all([
        coursesAPI.getAll(),
        bundlesAPI.getAll().catch(() => ({ data: { bundles: [] } })),
      ]);
      setCourses(coursesRes.data.courses || coursesRes.data || []);
      setBundles(bundlesRes.data?.bundles || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    setContentType(searchParams.get('type') === 'bundles' ? 'bundles' : 'courses');
    setCurrentPage(1);
  }, [searchParams]);

  const filterCourses = useCallback(() => {
    let result = [...courses];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter((course) =>
        course.course_name?.toLowerCase().includes(normalizedQuery) ||
        course.description?.toLowerCase().includes(normalizedQuery) ||
        course.category?.toLowerCase().includes(normalizedQuery)
      );
    }

    if (category) result = result.filter((course) => course.category === category);
    if (level) result = result.filter((course) => course.level === level);

    if (sortBy === 'price-asc') result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === 'price-desc') result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === 'name') result.sort((a, b) => String(a.course_name || '').localeCompare(String(b.course_name || ''), 'vi'));
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredCourses(result);
    setCurrentPage(1);
  }, [courses, query, category, level, sortBy]);

  const filterBundles = useCallback(() => {
    let result = [...bundles];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter((bundle) =>
        bundle.bundle_name?.toLowerCase().includes(normalizedQuery) ||
        bundle.description?.toLowerCase().includes(normalizedQuery) ||
        (bundle.items || []).some((item) =>
          item.course_name?.toLowerCase().includes(normalizedQuery) ||
          item.category?.toLowerCase().includes(normalizedQuery)
        )
      );
    }

    if (sortBy === 'price-asc') result.sort((a, b) => Number(a.bundle_price || 0) - Number(b.bundle_price || 0));
    if (sortBy === 'price-desc') result.sort((a, b) => Number(b.bundle_price || 0) - Number(a.bundle_price || 0));
    if (sortBy === 'name') result.sort((a, b) => String(a.bundle_name || '').localeCompare(String(b.bundle_name || ''), 'vi'));
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredBundles(result);
    setCurrentPage(1);
  }, [bundles, query, sortBy]);

  useEffect(() => {
    filterCourses();
    filterBundles();
  }, [filterCourses, filterBundles]);

  const updateSearchParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  const switchContentType = (nextType) => {
    setContentType(nextType);
    setCurrentPage(1);
    if (nextType === 'bundles') {
      setCategory('');
      setLevel('');
      updateSearchParams({ type: 'bundles', category: '' });
    } else {
      updateSearchParams({ type: '', category });
    }
  };

  const resetFilters = () => {
    setQuery('');
    setCategory('');
    setLevel('');
    setSortBy('');
    updateSearchParams({ q: '', category: '', type: contentType === 'bundles' ? 'bundles' : '' });
  };

  return (
    <div className="container search-page-shell">
      <div className="search-header">
        <h1 className="page-title">Tìm kiếm khóa học</h1>
        <div className="search-type-tabs" role="tablist" aria-label="Loại nội dung">
          <button
            type="button"
            className={contentType === 'courses' ? 'active' : ''}
            onClick={() => switchContentType('courses')}
          >
            Khóa học
          </button>
          <button
            type="button"
            className={contentType === 'bundles' ? 'active' : ''}
            onClick={() => switchContentType('bundles')}
          >
            Combo
          </button>
        </div>
      </div>

      <div className={`search-layout ${isFilterOpen ? '' : 'filters-collapsed'}`}>
        <aside id="search-filter-panel" className={`search-sidebar ${isFilterOpen ? '' : 'closed'}`}>
          <div className="search-filter-head">
            <h4 className="filter-title">Bộ lọc</h4>
            <span>Tinh chỉnh kết quả</span>
          </div>

          {contentType === 'courses' ? (
            <>
              <div className="filter-section">
                <h5 className="filter-subtitle">Danh mục</h5>
                <div className="filter-options">
                  {categories.map((cat) => (
                    <label key={cat.key} className="filter-option">
                      <input
                        type="radio"
                        name="category"
                        checked={category === cat.key}
                        onChange={() => {
                          setCategory(cat.key);
                          updateSearchParams({ category: cat.key });
                        }}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h5 className="filter-subtitle">Trình độ</h5>
                <div className="filter-options">
                  {levels.map((item) => (
                    <label key={item.key} className="filter-option">
                      <input
                        type="radio"
                        name="level"
                        checked={level === item.key}
                        onChange={() => setLevel(item.key)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="filter-section">
              <h5 className="filter-subtitle">Combo</h5>
              <p className="filter-help-text">Tìm combo theo tên, mô tả hoặc khóa học nằm trong combo.</p>
            </div>
          )}

          <div className="filter-section">
            <h5 className="filter-subtitle">Sắp xếp</h5>
            <select
              className="sort-dropdown"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="">Mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="name">Tên A-Z</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>

          <button className="btn btn-outline" style={{ width: '100%' }} onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </aside>

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
                Tìm thấy <strong>{activeResults.length}</strong> {contentType === 'bundles' ? 'combo' : 'khóa học'}
                {query && <> cho "<strong>{query}</strong>"</>}
              </span>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="no-results">
              <div className="no-results-icon">!</div>
              <h2>Không thể tải dữ liệu</h2>
              <p>Đã xảy ra lỗi kết nối. Vui lòng thử lại.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadCatalog}>
                Thử lại
              </button>
            </div>
          ) : activeResults.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h2>Không tìm thấy {contentType === 'bundles' ? 'combo' : 'khóa học'} nào</h2>
              <p>Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            <>
              <div className="search-grid">
                {paginated.map((item) => (
                  <div key={contentType === 'bundles' ? `bundle-${item.bundle_id}` : item.course_id} className="search-spotlight-item">
                    {contentType === 'bundles'
                      ? <BundleCard bundle={item} />
                      : <CourseCard course={item} spotlight />}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => { setCurrentPage((page) => Math.max(1, page - 1)); window.scrollTo(0, 0); }}
                    disabled={currentPage === 1}
                  >
                    &lsaquo; Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                    .reduce((acc, page, index, pages) => {
                      if (index > 0 && page - pages[index - 1] > 1) acc.push('...');
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page, index) =>
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} style={{ padding: '0 4px', color: '#888' }}>...</span>
                      ) : (
                        <button
                          key={page}
                          className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                          style={{ minWidth: 36 }}
                          onClick={() => { setCurrentPage(page); window.scrollTo(0, 0); }}
                        >
                          {page}
                        </button>
                      )
                    )}
                  <button
                    className="btn btn-outline"
                    onClick={() => { setCurrentPage((page) => Math.min(totalPages, page + 1)); window.scrollTo(0, 0); }}
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
