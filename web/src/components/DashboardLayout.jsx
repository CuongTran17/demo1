import { useState, useEffect, useCallback } from 'react';
import DashboardSidebar from './DashboardSidebar';

export default function DashboardLayout({ children, menuItems, activeTab, onTabChange, title, subtitle, theme, badges, onLogout }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleExpandChange = useCallback((expanded) => {
    setSidebarExpanded(expanded);
  }, []);

  return (
    <div className={`ds-layout ds-layout--${theme}`}>
      <DashboardSidebar
        menuItems={menuItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        title={title}
        subtitle={subtitle}
        theme={theme}
        badges={badges}
        onExpandChange={handleExpandChange}
        onLogout={onLogout}
      />
      <div
        className="ds-main-wrapper"
        style={!isMobile ? { marginLeft: sidebarExpanded ? '290px' : '90px' } : undefined}
      >
        <main className="ds-main">
          {children}
        </main>
      </div>
    </div>
  );
}
