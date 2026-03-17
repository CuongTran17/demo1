import { useState, useEffect, useRef } from 'react';

const ICON_MAP = {
  overview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  teachers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  courses: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  lessons: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  orders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  changes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  locks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  revenue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  'flash-sale': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" />
    </svg>
  ),
  progress: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  password: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

export default function DashboardSidebar({ menuItems, activeTab, onTabChange, title, subtitle, theme, badges = {}, onExpandChange, onLogout }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarRef = useRef(null);

  const showFull = isExpanded || isHovered || isMobileOpen;

  // Notify parent of expand state changes
  useEffect(() => {
    if (onExpandChange) onExpandChange(showFull);
  }, [showFull, onExpandChange]);

  // Close on outside click (mobile)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const themeColor = theme === 'admin' ? '#f5576c' : theme === 'student' ? '#3b82f6' : '#667eea';

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div className="ds-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Header bar */}
      <header className="ds-header">
        <div className="ds-header-left">
          <button
            className="ds-toggle-btn"
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setIsExpanded((v) => !v);
              } else {
                setIsMobileOpen((v) => !v);
              }
            }}
          >
            {isMobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 16 12" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.5 1C0.5 0.586 0.836 0.25 1.25 0.25H14.75C15.164 0.25 15.5 0.586 15.5 1C15.5 1.414 15.164 1.75 14.75 1.75H1.25C0.836 1.75 0.5 1.414 0.5 1ZM0.5 11C0.5 10.586 0.836 10.25 1.25 10.25H14.75C15.164 10.25 15.5 10.586 15.5 11C15.5 11.414 15.164 11.75 14.75 11.75H1.25C0.836 11.75 0.5 11.414 0.5 11ZM1.25 5.25C0.836 5.25 0.5 5.586 0.5 6C0.5 6.414 0.836 6.75 1.25 6.75H8C8.414 6.75 8.75 6.414 8.75 6C8.75 5.586 8.414 5.25 8 5.25H1.25Z" />
              </svg>
            )}
          </button>
          <a href="/" className="ds-header-logo">
            PTIT <strong>LEARNING</strong>
          </a>
        </div>
        <div className="ds-header-right">
          <span className="ds-header-role" style={{ background: themeColor }}>
            {subtitle}
          </span>
          <button className="ds-header-logout" onClick={onLogout} title="Đăng xuất">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={[
          'ds-sidebar',
          showFull ? 'ds-sidebar--expanded' : 'ds-sidebar--collapsed',
          isMobileOpen ? 'ds-sidebar--mobile-open' : '',
          `ds-sidebar--${theme}`,
        ].join(' ')}
        onMouseEnter={() => { if (!isExpanded) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo area */}
        <div className="ds-sidebar-logo">
          {showFull ? (
            <a href="/" className="ds-logo-full">
              <span className="ds-logo-icon">🎓</span>
              <span className="ds-logo-text">{title}</span>
            </a>
          ) : (
            <a href="/" className="ds-logo-mini">
              <span className="ds-logo-icon">🎓</span>
            </a>
          )}
        </div>

        {/* Navigation */}
        <nav className="ds-nav">
          {showFull && (
            <div className="ds-nav-group-title">MENU</div>
          )}
          {!showFull && (
            <div className="ds-nav-group-dots">
              <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor" opacity="0.4">
                <circle cx="2" cy="2" r="2" /><circle cx="8" cy="2" r="2" /><circle cx="14" cy="2" r="2" />
              </svg>
            </div>
          )}
          <ul className="ds-nav-list">
            {menuItems.map((item) => {
              const isActive = activeTab === item.key;
              const badge = badges[item.key];
              return (
                <li key={item.key}>
                  <button
                    className={`ds-nav-item ${isActive ? 'ds-nav-item--active' : ''}`}
                    onClick={() => {
                      onTabChange(item.key);
                      setIsMobileOpen(false);
                    }}
                    title={!showFull ? item.label : undefined}
                  >
                    <span className={`ds-nav-icon ${isActive ? 'ds-nav-icon--active' : ''}`}>
                      {ICON_MAP[item.key] || ICON_MAP.overview}
                    </span>
                    {showFull && (
                      <span className="ds-nav-text">{item.label}</span>
                    )}
                    {showFull && badge > 0 && (
                      <span className="ds-nav-badge">{badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="ds-sidebar-footer">
          <button className={`ds-sidebar-logout ${showFull ? '' : 'ds-sidebar-logout--mini'}`} onClick={onLogout} title="Đăng xuất">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {showFull && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
