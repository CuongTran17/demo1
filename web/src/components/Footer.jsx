import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="cols">
          <div>
            <h4>Cập nhật thông tin mới nhất</h4>
            <p className="muted">
              <Link to="/search">Các khóa học</Link>
              <Link to="/blog">Blog</Link>
              <Link to="/contact">Liên hệ</Link>
              <Link to="/cart">Giỏ hàng</Link>
            </p>
          </div>
          <div>
            <h4>Liên hệ với chúng tôi</h4>
            <p className="muted">01234566789</p>
            <p className="muted">contact@ptit-learning.edu.vn</p>
          </div>
        </div>
        <div className="social">
          <a href="#" className="icon" aria-label="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
            </svg>
          </a>
          <a href="#" className="icon" aria-label="YouTube">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.6C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
            </svg>
          </a>
          <a href="#" className="icon" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1.5"/>
            </svg>
          </a>
          <a href="#" className="icon" aria-label="LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z" />
            </svg>
          </a>
        </div>
        <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '16px' }}>
          © 2026 PTIT LEARNING by FIN1. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
