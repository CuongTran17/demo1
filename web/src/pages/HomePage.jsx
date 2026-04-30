import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, flashSaleAPI } from '../api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatPrice, resolveThumbnail } from '../utils/courseFormat';

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function buildCategoryImage(label, key) {
  const palettes = {
    python: ['#0f172a', '#38bdf8'],
    finance: ['#064e3b', '#6ee7b7'],
    data: ['#312e81', '#a78bfa'],
    blockchain: ['#7c2d12', '#fdba74'],
    accounting: ['#1e3a8a', '#93c5fd'],
    marketing: ['#831843', '#f9a8d4'],
  };
  const [start, end] = palettes[key] || ['#334155', '#cbd5e1'];
  const title = String(label || 'Course');
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="28" fill="url(#g)"/>
      <circle cx="520" cy="72" r="92" fill="rgba(255,255,255,.18)"/>
      <circle cx="92" cy="308" r="120" fill="rgba(255,255,255,.12)"/>
      <text x="64" y="164" fill="#fff" font-family="Arial, sans-serif" font-size="76" font-weight="800">${initials}</text>
      <text x="64" y="236" fill="rgba(255,255,255,.92)" font-family="Arial, sans-serif" font-size="34" font-weight="700">${title}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildHeroImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="heroBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="45%" stop-color="#e0f2fe"/>
          <stop offset="100%" stop-color="#fef3c7"/>
        </linearGradient>
        <linearGradient id="screen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#heroBg)"/>
      <g transform="translate(810 155)">
        <rect x="0" y="0" width="560" height="380" rx="34" fill="#ffffff" opacity=".96"/>
        <rect x="36" y="38" width="488" height="250" rx="22" fill="url(#screen)"/>
        <rect x="78" y="78" width="210" height="18" rx="9" fill="#38bdf8"/>
        <rect x="78" y="120" width="350" height="14" rx="7" fill="#cbd5e1"/>
        <rect x="78" y="150" width="280" height="14" rx="7" fill="#94a3b8"/>
        <rect x="78" y="210" width="116" height="46" rx="23" fill="#f97316"/>
        <rect x="226" y="210" width="116" height="46" rx="23" fill="#22c55e"/>
        <circle cx="436" cy="128" r="56" fill="#facc15"/>
        <path d="M386 224l42-52 34 38 30-28 50 42z" fill="#38bdf8"/>
        <rect x="84" y="316" width="94" height="16" rx="8" fill="#cbd5e1"/>
        <rect x="206" y="316" width="188" height="16" rx="8" fill="#e2e8f0"/>
      </g>
      <g transform="translate(1010 575)">
        <rect x="0" y="0" width="250" height="160" rx="24" fill="#ffffff" opacity=".94"/>
        <circle cx="54" cy="54" r="24" fill="#ef4444"/>
        <rect x="92" y="38" width="112" height="14" rx="7" fill="#334155"/>
        <rect x="92" y="66" width="84" height="12" rx="6" fill="#94a3b8"/>
        <rect x="32" y="110" width="184" height="16" rx="8" fill="#dbeafe"/>
      </g>
      <g transform="translate(1320 455)">
        <rect x="0" y="0" width="110" height="170" rx="24" fill="#111827"/>
        <rect x="12" y="20" width="86" height="128" rx="16" fill="#f8fafc"/>
        <circle cx="55" cy="156" r="5" fill="#f8fafc"/>
      </g>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getFlashSaleTargetLabel(sale) {
  const targetType = String(sale?.target_type || 'all').toLowerCase();
  if (targetType === 'all') return 'Tất cả khóa học';
  if (targetType === 'courses') return 'Một số khóa học được chọn';
  if (targetType === 'category') return `Danh mục ${sale?.target_value || ''}`.trim();
  return 'Các khóa học đủ điều kiện';
}

export default function HomePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [flashSale, setFlashSale] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    loadCourses();
    loadFlashSale();
  }, []);

  useEffect(() => {
    if (!flashSale?.end_at) return undefined;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSale]);

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

  const loadFlashSale = async () => {
    try {
      const res = await flashSaleAPI.getActive();
      setFlashSale(res.data?.active ? res.data.sale : null);
    } catch (err) {
      console.error('Failed to load flash sale:', err);
      setFlashSale(null);
    }
  };

  const getCountdown = () => {
    if (!flashSale?.end_at) return null;

    const diff = new Date(flashSale.end_at).getTime() - now;
    if (diff <= 0) return null;

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  };

  const categories = [
    {
      key: 'python',
      name: 'Lập trình - CNTT',
      alt: 'python-basics',
    },
    {
      key: 'finance',
      name: 'Tài chính',
      alt: 'tai-chinh-co-ban',
    },
    {
      key: 'data',
      name: 'Data Analyst',
      alt: 'data-analytics-co-ban',
    },
    {
      key: 'blockchain',
      name: 'Blockchain',
      alt: 'blockchain-co-ban',
    },
    {
      key: 'accounting',
      name: 'Kế toán',
      alt: 'ke-toan-co-ban',
    },
    {
      key: 'marketing',
      name: 'Marketing',
      alt: 'digital-marketing',
    },
  ];

  const popularCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => {
        const score = (course) =>
          Number(course.students_count || 0) * 3 +
          Number(course.review_count || 0) * 2 +
          Number(course.average_rating || 0);
        return score(b) - score(a);
      })
      .slice(0, 6);
  }, [courses]);
  const countdown = getCountdown();
  const countdownDisplay = countdown || { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const flashSaleCourses = useMemo(() => {
    if (!flashSale?.discount_percentage) return [];

    const discountPercent = Number(flashSale.discount_percentage || 0);
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) return [];

    const targetType = String(flashSale.target_type || 'all').toLowerCase();
    const targetCategory = normalizeCategory(flashSale.target_value);
    const targetCourseIds = new Set(
      Array.isArray(flashSale.course_ids)
        ? flashSale.course_ids.map((id) => String(id || '').trim()).filter(Boolean)
        : []
    );

    let eligibleCourses = courses.filter((course) => {
      if (targetType === 'all') return true;
      if (targetType === 'category') {
        return normalizeCategory(course.category) === targetCategory;
      }
      if (targetType === 'courses') {
        return targetCourseIds.has(String(course.course_id || '').trim());
      }
      return false;
    });

    if (targetType === 'category' && eligibleCourses.length === 0) {
      eligibleCourses = [...courses];
    }

    return eligibleCourses.map((course) => {
      const basePrice = Math.max(0, Math.round(Number(course.price || 0)));
      const salePrice = Math.max(0, Math.round(basePrice * (100 - discountPercent) / 100));

      return {
        ...course,
        flashSaleBasePrice: basePrice,
        flashSalePrice: salePrice,
        flashSaleDiscountPercent: Math.round(discountPercent),
      };
    }).slice(0, 12);
  }, [courses, flashSale]);

  const countdownClock = countdownDisplay
    ? {
      hours: String((countdownDisplay.days * 24) + countdownDisplay.hours).padStart(2, '0'),
      minutes: String(countdownDisplay.minutes).padStart(2, '0'),
      seconds: String(countdownDisplay.seconds).padStart(2, '0'),
    }
    : null;

  const outcomeStats = [
    {
      value: `${courses.length || '100+'}`,
      label: 'khóa học đang mở',
      note: 'Nhiều lĩnh vực từ CNTT, dữ liệu đến kinh doanh.',
    },
    {
      value: '24/7',
      label: 'truy cập bài học',
      note: 'Học lại nội dung, ghi chú và theo dõi tiến độ bất cứ lúc nào.',
    },
    {
      value: 'PDF',
      label: 'chứng chỉ hoàn thành',
      note: 'Tự động cấp khi hoàn tất toàn bộ nội dung khóa học.',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <img className="hero-bg" src={buildHeroImage()} alt="" aria-hidden="true" />
        <div className="overlay"></div>
        <div className="container hero-inner">
          <h1>Phát triển và nâng cao<br />kỹ năng của bạn</h1>
          <p>
            Khám phá các chiến lược tiên tiến để tối ưu hóa quá trình học tập. 
            Nền tảng giáo dục hàng đầu với hơn 100+ khóa học chất lượng cao.
          </p>
          {user ? (
            <Link className="btn btn-primary btn-lg" to="/search">
              Khám phá ngay
            </Link>
          ) : (
            <Link className="btn btn-primary btn-lg" to="/register">
              Bắt đầu miễn phí
            </Link>
          )}
        </div>
      </section>

      {flashSale && (
        <section className="section" style={{ paddingBlock: '32px 0' }}>
          <div className="container">
            <div className="flash-sale-banner">
              <div className="flash-sale-meta">
                <span className="flash-sale-pill">FLASH SALE</span>
                <h3>Giảm {flashSale.discount_percentage}%</h3>
                <p>
                  Áp dụng: {getFlashSaleTargetLabel(flashSale)}
                </p>
              </div>
              <div className="flash-sale-countdown">
                <div><strong>{String(countdownDisplay.days).padStart(2, '0')}</strong><span>Ngày</span></div>
                <div><strong>{String(countdownDisplay.hours).padStart(2, '0')}</strong><span>Giờ</span></div>
                <div><strong>{String(countdownDisplay.minutes).padStart(2, '0')}</strong><span>Phút</span></div>
                <div><strong>{String(countdownDisplay.seconds).padStart(2, '0')}</strong><span>Giây</span></div>
              </div>
            </div>

            {flashSaleCourses.length > 0 && (
              <div className="flash-sale-showcase">
                <div className="flash-sale-showcase-head">
                  <div className="flash-sale-title-wrap">
                    <h3>Flash Sale</h3>
                    {countdownClock && (
                      <div className="flash-sale-inline-clock" aria-label="Đồng hồ đếm ngược Flash Sale">
                        <span>{countdownClock.hours}</span>
                        <em>:</em>
                        <span>{countdownClock.minutes}</span>
                        <em>:</em>
                        <span>{countdownClock.seconds}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    className="flash-sale-see-all"
                    to={flashSale.target_type === 'category'
                      ? `/search?category=${encodeURIComponent(String(flashSale.target_value || ''))}`
                      : '/search'}
                  >
                    Xem tất cả
                  </Link>
                </div>

                <div className="home-scroll-row flash-sale-scroll" role="region" aria-label="Danh sách khóa học flash sale">
                  {flashSaleCourses.map((course) => (
                    <Link key={course.course_id} to={`/course/${course.course_id}`} className="flash-sale-item">
                      <div className="flash-sale-image-wrap">
                        <img
                          src={resolveThumbnail(course.thumbnail)}
                          alt={course.course_name}
                          className="flash-sale-image"
                        />
                        <span className="flash-sale-discount-badge">-{course.flashSaleDiscountPercent}%</span>
                      </div>

                      <div className="flash-sale-pricing">
                        <strong>{formatPrice(course.flashSalePrice)}</strong>
                        {course.flashSalePrice < course.flashSaleBasePrice && (
                          <span>{formatPrice(course.flashSaleBasePrice)}</span>
                        )}
                      </div>

                      <div className="flash-sale-item-tag">
                        <i></i>
                        <span>Vừa mở bán</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Combo Categories Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Combo ưu đãi đặc biệt</h2>
          <p className="section-sub">
            Lựa chọn từ nhiều lĩnh vực đa dạng, phù hợp với mọi nhu cầu học tập
          </p>
          <div className="grid grid-3">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                to={`/search?category=${cat.key}`}
                className="card-link"
              >
                <div className="card">
                  <img src={buildCategoryImage(cat.name, cat.key)} alt={cat.alt} className="card-img" />
                  <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <h3 className="card-title" style={{ textAlign: 'center', marginBottom: '8px' }}>{cat.name}</h3>
                    <p className="card-text" style={{ textAlign: 'center' }}>Khám phá các khóa học {cat.name.toLowerCase()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Banner */}
      <section className="feature-banner">
        <div className="feature-overlay"></div>
        <div className="container feature-inner">
          <h2 className="feature-title">Tại sao chọn<br />PTIT Learning?</h2>
          <ul className="feature-list">
            <li>Đội ngũ giảng viên giàu kinh nghiệm, tận tâm hướng dẫn</li>
            <li>Truy cập khóa học trên mọi thiết bị: máy tính, tablet, điện thoại</li>
            <li>Bài giảng được cập nhật thường xuyên theo xu hướng mới nhất</li>
            <li>Chứng chỉ hoàn thành khóa học có giá trị</li>
          </ul>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Khóa học phổ biến</h2>
          <p className="section-sub">
            Những khóa học được nhiều học viên lựa chọn nhất
          </p>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>Không thể tải danh sách khóa học.</p>
              <button className="btn btn-primary" onClick={loadCourses}>Thử lại</button>
            </div>
          ) : popularCourses.length === 0 ? (
            <div className="home-empty-state">
              <div className="home-empty-icon">📚</div>
              <h3>Chưa có khóa học để hiển thị</h3>
              <p>Danh sách khóa học sẽ xuất hiện tại đây sau khi admin hoặc giảng viên thêm nội dung mới.</p>
              <Link to="/search" className="btn btn-outline">Mở trang tìm kiếm</Link>
            </div>
          ) : (
            <div className="grid grid-3 home-scroll-row home-course-scroll">
              {popularCourses.map((course) => (
                <CourseCard key={course.course_id} course={course} />
              ))}
            </div>
          )}
          <div className="text-center mt-32">
            <Link to="/search" className="btn btn-outline btn-lg">
              Xem tất cả khóa học
            </Link>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="section home-outcomes-section">
        <div className="container">
          <h2 className="section-title">Kết quả học tập rõ ràng</h2>
          <p className="section-sub">
            Tập trung vào tiến độ, nội dung có cấu trúc và chứng nhận sau khi hoàn thành.
          </p>
          <div className="grid grid-3 home-outcomes-grid">
            {outcomeStats.map((item) => (
              <div key={item.label} className="home-outcome-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="cta">
          <div className="container cta-inner">
            <h3>Sẵn sàng bắt đầu hành trình học tập?</h3>
            <Link to="/register" className="btn btn-primary btn-lg">
              Đăng ký miễn phí ngay
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
