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
    { key: 'python', name: 'Lập trình - CNTT' },
    { key: 'finance', name: 'Tài chính' },
    { key: 'data', name: 'Data Analyst' },
    { key: 'blockchain', name: 'Blockchain' },
    { key: 'accounting', name: 'Kế toán' },
    { key: 'marketing', name: 'Marketing' },
  ];

  const popularCourses = courses.slice(0, 6);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
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

      {/* Testimonials Section */}
      <section className="section" style={{ background: '#f8f9fa' }}>
        <div className="container">
          <h2 className="section-title">Học viên nói gì về chúng tôi</h2>
          <p className="section-sub">
            Hàng nghìn học viên đã tin tưởng và đạt kết quả tốt
          </p>
          <div className="grid grid-3 cards-compact">
            <div className="quote">
              <p className="quote-text">"Khóa học rất chất lượng, giảng viên nhiệt tình. Tôi đã học được rất nhiều kiến thức mới."</p>
              <div className="avatar">
                <img src="https://i.pravatar.cc/96?img=11" alt="Nguyễn Văn A" />
                <div>
                  <span className="name">Nguyễn Văn A</span>
                  <span className="desc">Sinh viên CNTT</span>
                </div>
              </div>
            </div>
            <div className="quote">
              <p className="quote-text">"Nền tảng học tập tuyệt vời, giao diện thân thiện và nội dung được cập nhật liên tục."</p>
              <div className="avatar">
                <img src="https://i.pravatar.cc/96?img=32" alt="Trần Thị B" />
                <div>
                  <span className="name">Trần Thị B</span>
                  <span className="desc">Sinh viên Kinh tế</span>
                </div>
              </div>
            </div>
            <div className="quote">
              <p className="quote-text">"Combo khóa học giúp tôi tiết kiệm rất nhiều chi phí. Highly recommend!"</p>
              <div className="avatar">
                <img src="https://i.pravatar.cc/96?img=53" alt="Lê Văn C" />
                <div>
                  <span className="name">Lê Văn C</span>
                  <span className="desc">Sinh viên Kế toán</span>
                </div>
              </div>
            </div>
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
