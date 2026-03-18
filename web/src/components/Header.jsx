import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isSearchPage = location.pathname === '/search';

  useEffect(() => {
    if (!isSearchPage) return;
    setSearchQuery(searchParams.get('q') || '');
  }, [isSearchPage, searchParams]);

  const updateSearchRoute = (value, replace = false) => {
    const params = new URLSearchParams(searchParams);
    const normalized = value.trim();

    if (normalized) {
      params.set('q', normalized);
    } else {
      params.delete('q');
    }

    const nextQuery = params.toString();
    navigate(nextQuery ? `/search?${nextQuery}` : '/search', { replace });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (isSearchPage) {
      // Live-update results only when already on Search page.
      updateSearchRoute(value, true);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!isSearchPage) {
      updateSearchRoute(searchQuery);
    }

    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const displayInfo = user
    ? user.phone
      ? '***' + user.phone.slice(-3)
      : user.email
    : '';

  const categories = [
    { key: 'python', name: 'Lập trình - CNTT' },
    { key: 'finance', name: 'Tài chính' },
    { key: 'data', name: 'Data analyst' },
    { key: 'blockchain', name: 'Blockchain' },
    { key: 'accounting', name: 'Kế toán' },
    { key: 'marketing', name: 'Marketing' },
  ];

  return (
    <header className="topbar">
      <div className="container nav">
        <Link className="brand" to="/">
          PTIT <strong>LEARNING</strong> <span className="by">by FIN1</span>
        </Link>

        <form className="header-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="header-search-input"
            placeholder="Tìm kiếm khóa học..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <button type="submit" className="header-search-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </form>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Mở menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>

        <nav className={`menu ${menuOpen ? 'open' : ''}`}>
          <div className={`dropdown ${ddOpen ? 'open' : ''}`}>
            <a
              href="#"
              className="has-dd"
              onClick={(e) => { e.preventDefault(); setDdOpen(!ddOpen); }}
            >
              Các khóa học
            </a>
            <div className="dd">
              <div className="dd-inner">
                <div className="dd-head">Tất cả các khóa học</div>
                <div className="dd-grid">
                  {categories.map((cat) => (
                    <Link
                      key={cat.key}
                      to={`/search?category=${cat.key}`}
                      onClick={() => { setMenuOpen(false); setDdOpen(false); }}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link to="/blog" onClick={() => setMenuOpen(false)}>Blog</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>Liên hệ</Link>

          <Link to="/cart" className="cart-link" onClick={() => setMenuOpen(false)}>
            Giỏ hàng
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
              )}
              {user.role === 'teacher' && (
                <Link to="/teacher" onClick={() => setMenuOpen(false)}>Giảng viên</Link>
              )}
              <Link to="/account" className="user-info" onClick={() => setMenuOpen(false)}>
                {displayInfo}
              </Link>
              <button className="menu-link" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login" className="menu-link" onClick={() => setMenuOpen(false)}>
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
