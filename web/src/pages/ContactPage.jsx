import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <main className="container contact-page">
      <div className="contact-header">
        <h1>Liên hệ với chúng tôi</h1>
        <p className="contact-subtitle">
          Bạn có câu hỏi hoặc cần hỗ trợ? Đừng ngần ngại liên hệ với chúng tôi!
        </p>
      </div>

      <div className="contact-layout">
        <div className="contact-info">
          <div className="contact-card">
            <div className="contact-icon phone-icon">📞</div>
            <div className="contact-details">
              <h3>Điện thoại</h3>
              <p><a href="tel:01234566789">0123 456 6789</a></p>
              <p className="muted">Thứ 2 - Thứ 6, 8:00 - 17:00</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon email-icon">📧</div>
            <div className="contact-details">
              <h3>Email</h3>
              <p><a href="mailto:contact@ptit-learning.edu.vn">contact@ptit-learning.edu.vn</a></p>
              <p className="muted">Phản hồi trong 24 giờ</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon location-icon">📍</div>
            <div className="contact-details">
              <h3>Địa chỉ</h3>
              <p>Học viện Công nghệ Bưu chính Viễn thông</p>
              <p className="muted">Hà Nội, Việt Nam</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon time-icon">🕐</div>
            <div className="contact-details">
              <h3>Giờ làm việc</h3>
              <p>Thứ 2 - Thứ 6: 8:00 - 17:00</p>
              <p className="muted">Thứ 7: 8:00 - 12:00</p>
            </div>
          </div>
        </div>

        <div className="contact-form-wrapper">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ marginBottom: '12px' }}>Đã nhận được tin nhắn!</h2>
              <p style={{ color: '#64748b', marginBottom: '28px', lineHeight: 1.6 }}>
                Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi qua email <strong>{form.email}</strong> trong vòng 24 giờ.
              </p>
              <button className="btn btn-primary" onClick={handleReset}>
                Gửi tin nhắn khác
              </button>
            </div>
          ) : (
            <>
              <h2>Gửi tin nhắn cho chúng tôi</h2>
              <p className="form-description">Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.</p>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Họ và tên <span className="required">*</span></label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Nhập họ tên" />
                  </div>
                  <div className="form-group">
                    <label>Email <span className="required">*</span></label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="Nhập email" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Chủ đề</label>
                  <select name="subject" value={form.subject} onChange={handleChange}>
                    <option value="">-- Chọn chủ đề --</option>
                    <option value="support">Hỗ trợ kỹ thuật</option>
                    <option value="payment">Thanh toán</option>
                    <option value="course">Khóa học</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Nội dung <span className="required">*</span></label>
                  <textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Nhập nội dung tin nhắn..." />
                </div>

                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                  {!submitting && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
