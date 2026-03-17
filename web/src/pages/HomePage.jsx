import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, flashSaleAPI } from '../api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const res = await coursesAPI.getAll();
      setCourses(res.data.courses || res.data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
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
      image: '/images/courses/python/python-basics.png',
      alt: 'python-basics',
    },
    {
      key: 'finance',
      name: 'Tài chính',
      image: '/images/courses/finance/tai-chinh-co-ban.png',
      alt: 'tai-chinh-co-ban',
    },
    {
      key: 'data',
      name: 'Data Analyst',
      image: '/images/courses/data/data-analytics-co-ban.png',
      alt: 'data-analytics-co-ban',
    },
    {
      key: 'blockchain',
      name: 'Blockchain',
      image: '/images/courses/blockchain/blockchain-co-ban.png',
      alt: 'blockchain-co-ban',
    },
    {
      key: 'accounting',
      name: 'Kế toán',
      image: '/images/courses/accounting/ke-toan-co-ban.png',
      alt: 'ke-toan-co-ban',
    },
    {
      key: 'marketing',
      name: 'Marketing',
      image: '/images/courses/marketing/digital-marketing.png',
      alt: 'digital-marketing',
    },
  ];

  const popularCourses = courses.slice(0, 6);
  const countdown = getCountdown();

  const testimonials = [
    {
      text: '"Khóa học rất chất lượng, giảng viên nhiệt tình. Tôi đã học được rất nhiều kiến thức mới."',
      name: 'Nguyễn Văn A',
      role: 'Sinh viên CNTT',
      avatar: 'https://i.pravatar.cc/96?img=11',
    },
    {
      text: '"Nền tảng học tập tuyệt vời, giao diện thân thiện và nội dung được cập nhật liên tục."',
      name: 'Trần Thị B',
      role: 'Sinh viên Kinh tế',
      avatar: 'https://i.pravatar.cc/96?img=32',
    },
    {
      text: '"Combo khóa học giúp tôi tiết kiệm rất nhiều chi phí. Highly recommend!"',
      name: 'Lê Văn C',
      role: 'Sinh viên Kế toán',
      avatar: 'https://i.pravatar.cc/96?img=53',
    },
    {
      text: '"Lộ trình học rõ ràng, có thể học lại bất cứ lúc nào nên rất phù hợp với người đi làm."',
      name: 'Phạm Minh D',
      role: 'Nhân viên văn phòng',
      avatar: 'https://i.pravatar.cc/96?img=24',
    },
    {
      text: '"Sau 2 tháng học, mình tự tin làm project thực tế và đã cải thiện CV đáng kể."',
      name: 'Vũ Thu E',
      role: 'Fresher Developer',
      avatar: 'https://i.pravatar.cc/96?img=47',
    },
    {
      text: '"Nội dung cô đọng, dễ hiểu, bài tập sát thực tế. Mình rất hài lòng với trải nghiệm."',
      name: 'Đặng Quốc F',
      role: 'Sinh viên năm cuối',
      avatar: 'https://i.pravatar.cc/96?img=14',
    },
  ];

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

      {flashSale && countdown && (
        <section className="section" style={{ paddingBlock: '32px 0' }}>
          <div className="container">
            <div className="flash-sale-banner">
              <div className="flash-sale-meta">
                <span className="flash-sale-pill">FLASH SALE</span>
                <h3>Giảm {flashSale.discount_percentage}%</h3>
                <p>
                  Áp dụng: {flashSale.target_type === 'all' ? 'Tất cả khóa học' : `Danh mục ${flashSale.target_value}`}
                </p>
              </div>
              <div className="flash-sale-countdown">
                <div><strong>{String(countdown.days).padStart(2, '0')}</strong><span>Ngày</span></div>
                <div><strong>{String(countdown.hours).padStart(2, '0')}</strong><span>Giờ</span></div>
                <div><strong>{String(countdown.minutes).padStart(2, '0')}</strong><span>Phút</span></div>
                <div><strong>{String(countdown.seconds).padStart(2, '0')}</strong><span>Giây</span></div>
              </div>
            </div>
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
                  <img src={cat.image} alt={cat.alt} className="card-img" />
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

      {/* Testimonials Section */}
      <section className="section" style={{ background: '#f8f9fa' }}>
        <div className="container">
          <h2 className="section-title">Học viên nói gì về chúng tôi</h2>
          <p className="section-sub">
            Hàng nghìn học viên đã tin tưởng và đạt kết quả tốt
          </p>
          <div className="grid grid-3 cards-compact home-scroll-row home-testimonial-scroll">
            {testimonials.map((item) => (
              <div key={item.name} className="quote">
                <p className="quote-text">{item.text}</p>
                <div className="avatar">
                  <img src={item.avatar} alt={item.name} />
                  <div>
                    <span className="name">{item.name}</span>
                    <span className="desc">{item.role}</span>
                  </div>
                </div>
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
