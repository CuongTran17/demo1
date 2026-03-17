import { Link } from 'react-router-dom';

export default function BlogPage() {
  const relatedPosts = [
    {
      title: 'Sự thay đổi của thông tư 200',
      author: 'Simon Do',
      img: '/images/blog/bai-viet-lien-quan-1.png',
      alt: 'bai-viet-lien-quan-1',
    },
    {
      title: 'Dev tool cùng chúng tôi',
      author: 'Hachan',
      img: '/images/blog/bai-viet-lien-quan-2.png',
      alt: 'bai-viet-lien-quan-2',
    },
    {
      title: 'Marketing trong thời đại số',
      author: 'Jollie Pham',
      img: '/images/blog/bai-viet-lien-quan-3.png',
      alt: 'bai-viet-lien-quan-3',
    },
  ];

  return (
    <main className="container article">
      <h1 className="article-title">Bài viết của chúng tôi</h1>

      <figure className="article-cover">
        <img src="/images/blog/anh-bia-bai-viet.png" alt="anh-bia-bai-viet" />
      </figure>

      <div className="article-meta">
        <span>Ngày đăng: 20/10/2025</span>
        <span>•</span>
        <span>Tác giả: PTIT Learning Team</span>
      </div>

      <div className="article-body">
        <p><b>Con Đường Của Một Developer Hiện Đại: Không Chỉ Là Code</b></p>
        <p>
          Tuyệt vời và hiệu quả, sự nổi lên của lập trình đã tạo ra một kỷ nguyên mới. Đừng chỉ
          dừng lại ở cú pháp! Chúng ta đang bước vào không gian của kiến trúc phần mềm tinh tế
          (software architecture), nơi mà hiệu suất tối ưu và trải nghiệm người dùng (UX) là yếu
          tố sống còn. Từ những dự án farm-to-table (nông trại đến bàn ăn) dùng blockchain, cho đến
          các hệ thống AI đột phá, lập trình không còn là hoạt động đơn lẻ. Không có sự gián đoạn,
          chỉ có sự tiến hóa liên tục trong các công cụ, framework (ví dụ: React, Vue, Koci) và
          phương pháp luận Agile. Phát triển phần mềm hiện đại là sự kết hợp giữa kỹ thuật chuyên
          sâu và tư duy giải quyết vấn đề.
        </p>

        <div className="article-gallery">
          <img src="/images/blog/hinh-minh-hoa-1.png" alt="hinh-minh-hoa-1" />
          <img src="/images/blog/hinh-minh-hoa-2.png" alt="hinh-minh-hoa-2" />
        </div>

        <p><b>Giải Mã Bí Ẩn: Từ Thuật Toán Đến Sản Phẩm Cuối Cùng</b></p>
        <p>
          Tinh tế, sắc sảo và biểu tượng, thuật toán tiên tiến là "linh hồn" của mọi ứng dụng.
          Hãy tưởng tượng việc viết code như pha một ly Espresso hoàn hảo—mọi bước đều phải chính
          xác. Từ việc phân tích dữ liệu lớn (Big Data) đến việc thiết kế API tốc độ cao, quá
          trình này đòi hỏi sự tỉ mỉ của người thợ thủ công. Đánh giá của người dùng (ratings) là
          thước đo cuối cùng. Điều gì tạo nên một lập trình viên xuất sắc? Đó là khả năng chuyển
          hóa những ý tưởng phức tạp thành một giải pháp thanh lịch và dễ bảo trì (maintainable).
          Hãy dấn thân vào những thử thách của Data Structures và Design Patterns để nâng cấp tư
          duy của bạn.
        </p>
      </div>

      <section className="related">
        <h2 className="related-title">Các bài viết liên quan/khác</h2>
        <div className="grid grid-3">
          {relatedPosts.map((post, idx) => (
            <article key={idx} className="card">
              <img
                className="card-img"
                src={post.img}
                alt={post.alt}
                style={{ height: '160px', objectFit: 'cover' }}
              />
              <div className="card-body">
                <h3 className="card-title">{post.title}</h3>
                <p className="card-text">{post.author}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
