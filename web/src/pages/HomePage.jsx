import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI } from '../api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

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

  const categories = [
    { key: 'python', name: 'Lập trình - CNTT', icon: '💻' },
    { key: 'finance', name: 'Tài chính', icon: '💰' },
    { key: 'data', name: 'Data Analyst', icon: '📊' },
    { key: 'blockchain', name: 'Blockchain', icon: '🔗' },
    { key: 'accounting', name: 'Kế toán', icon: '📋' },
    { key: 'marketing', name: 'Marketing', icon: '📢' },
  ];

  const popularCourses = courses.slice(0, 6);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-inner">
          <h1>Phát triển và nâng cao kỹ năng của bạn</h1>
          <p>
            Khám phá các chiến lược tiên tiến để tối ưu hóa quá trình học tập.
            Nền tảng giáo dục hàng đầu với hơn 100+ khóa học chất lượng cao.
          </p>
          {user ? (
            <Link className="btn btn-primary btn-lg" to="/search" style={{ background: '#fff', color: '#000', width: 'fit-content' }}>
              Khám phá ngay
            </Link>
          ) : (
            <Link className="btn btn-primary btn-lg" to="/register" style={{ background: '#fff', color: '#000', width: 'fit-content' }}>
              Bắt đầu miễn phí
            </Link>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Danh mục khóa học</h2>
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
                <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>{cat.icon}</div>
                  <h3 className="card-title" style={{ textAlign: 'center' }}>{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="section" style={{ background: '#f8f9fa' }}>
        <div className="container">
          <h2 className="section-title">Khóa học phổ biến</h2>
          <p className="section-sub">
            Những khóa học được nhiều học viên lựa chọn nhất
          </p>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-3">
              {popularCourses.map((course) => (
                <CourseCard key={course.course_id} course={course} />
              ))}
            </div>
          )}
          <div className="text-center mt-32">
            <Link to="/search" className="btn btn-outline btn-lg">
              Xem tất cả khóa học →
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Tại sao chọn PTIT Learning?</h2>
          <p className="section-sub">
            Nền tảng học tập trực tuyến hàng đầu dành cho sinh viên
          </p>
          <div className="grid grid-3">
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
              <h3 className="card-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Giảng viên chất lượng</h3>
              <p className="card-text" style={{ textAlign: 'center' }}>
                Đội ngũ giảng viên giàu kinh nghiệm, tận tâm hướng dẫn
              </p>
            </div>
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
              <h3 className="card-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Học mọi lúc, mọi nơi</h3>
              <p className="card-text" style={{ textAlign: 'center' }}>
                Truy cập khóa học trên mọi thiết bị: máy tính, tablet, điện thoại
              </p>
            </div>
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
              <h3 className="card-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Nội dung cập nhật</h3>
              <p className="card-text" style={{ textAlign: 'center' }}>
                Bài giảng được cập nhật thường xuyên theo xu hướng mới nhất
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="section" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
          <div className="container text-center">
            <h2 style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 16px' }}>
              Sẵn sàng bắt đầu?
            </h2>
            <p style={{ fontSize: '18px', opacity: .9, marginBottom: '32px' }}>
              Tham gia cùng hàng nghìn học viên đang học tập mỗi ngày
            </p>
            <Link to="/register" className="btn btn-lg" style={{ background: '#fff', color: '#000' }}>
              Đăng ký miễn phí ngay
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
