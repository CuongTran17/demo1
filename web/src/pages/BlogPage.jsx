import { Link } from 'react-router-dom';

export default function BlogPage() {
  const relatedPosts = [
    { title: 'Sự thay đổi của thông tư 200', author: 'Simon Do', img: null },
    { title: 'Dev tool cùng chúng tôi', author: 'Hachan', img: null },
    { title: 'Marketing trong thời đại số', author: 'Jollie Pham', img: null },
  ];

  return (
    <main className="container article">
      <h1 className="article-title">Bài viết của chúng tôi</h1>

      <figure className="article-cover">
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          height: '320px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '24px',
          fontWeight: 600,
        }}>
          📝 PTIT Learning Blog
        </div>
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
          <div style={{
            background: '#f0f2f5',
            height: '200px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
          }}>
            🖼️ Hình minh hoạ 1
          </div>
          <div style={{
            background: '#f0f2f5',
            height: '200px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
          }}>
            🖼️ Hình minh hoạ 2
          </div>
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
              <div
                className="card-img"
                style={{
                  background: `hsl(${idx * 120}, 60%, 90%)`,
                  height: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '32px',
                }}
              >
                📰
              </div>
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
