import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = window.innerWidth < 768

  const handleLogout = () => {
    logout()
  }

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/daily-report', label: 'Daily Report', icon: '📝', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/reports', label: 'Reports', icon: '📋', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/analytics', label: 'Analytics', icon: '📈', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/supervisor-dashboard', label: 'Team Dashboard', icon: '👥', roles: ['supervisor', 'admin'] },
    { path: '/team-management', label: 'Team Management', icon: '⚙️', roles: ['supervisor', 'admin'] },
  ]

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || 'medrep')
  )

  const isActive = (path) => {
    return location.pathname === path || 
           (path === '/dashboard' && location.pathname === '/') ||
           (path === '/supervisor-dashboard' && location.pathname.startsWith('/supervisor')) ||
           (path === '/team-management' && location.pathname.startsWith('/team-management'))
  }

  return (
    <div className="layout">
      {/* Header with Navigation */}
      <header className="main-header">
        <div className="header-container">
          {/* Top Row: Logo & User Info */}
          <div className="header-top">
            {/* Logo */}
            <div className="logo-container">
              <div className="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="logo-text">
                {isMobile ? 'RP' : 'Regal Pharma'}
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="user-actions">
              <div className="user-badge">
                <div className="user-avatar">
                  {user?.role === 'supervisor' ? '👑' : user?.role === 'admin' ? '🔧' : '👤'}
                </div>
                <div className="user-details">
                  <span className="user-name">
                    {isMobile ? user?.name?.split(' ')[0] || 'User' : user?.name || 'User'}
                  </span>
                  <span className="user-role">
                    {user?.role || 'User'}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="logout-button"
              >
                <span className="logout-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {!isMobile && 'Logout'}
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="main-nav">
            {filteredNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-button ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {(!isMobile || isActive(item.path)) && (
                  <span className="nav-label">{item.label}</span>
                )}
                {isActive(item.path) && <div className="nav-indicator"></div>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-container">
          {/* Copyright */}
          <div className="copyright">
            © {new Date().getFullYear()} Regal Pharma • All rights reserved
          </div>

          {/* Quick Stats (if on dashboard pages) */}
          {['/dashboard', '/supervisor-dashboard', '/team-management'].includes(location.pathname) && (
            <div className="footer-stats">
              <div className="stat-item">
                <span className="stat-icon">💼</span>
                <span>Medical Rep System</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">📈</span>
                <span>v1.0.0</span>
              </div>
              {(user?.role === 'supervisor' || user?.role === 'admin') && (
                <div className="stat-item">
                  <span className="stat-icon">👥</span>
                  <span>Team Management</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div className="footer-links">
            {!isMobile && (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="footer-link"
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => navigate('/daily-report')}
                  className="footer-link"
                >
                  Daily Report
                </button>
                {(user?.role === 'supervisor' || user?.role === 'admin') && (
                  <button 
                    onClick={() => navigate('/team-management')}
                    className="footer-link"
                  >
                    Team Management
                  </button>
                )}
              </>
            )}
            <button 
              onClick={() => navigate('/reports')}
              className="footer-link"
            >
              Reports
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// CSS Styles
const styles = `
.layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.main-header {
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid #e2e8f0;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;
}

/* Logo */
.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* User Actions */
.user-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.user-badge:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e0f2fe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #0369a1;
  font-weight: 500;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.user-role {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logout-button {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.logout-button:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.logout-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Navigation */
.main-nav {
  display: flex;
  gap: 8px;
  padding: 16px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.main-nav::-webkit-scrollbar {
  display: none;
}

.nav-button {
  padding: 12px 20px;
  background: transparent;
  color: #64748b;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
}

.nav-button:hover {
  background: #f1f5f9;
  color: #475569;
}

.nav-button.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.nav-button.active:hover {
  background: #2563eb;
}

.nav-icon {
  font-size: 16px;
  opacity: 0.9;
}

.nav-label {
  transition: opacity 0.2s ease;
}

.nav-indicator {
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: #3b82f6;
  border-radius: 50%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(5px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Main Content */
.main-content {
  flex: 1;
  min-height: calc(100vh - 180px);
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
  .header-container {
    padding: 0 16px;
  }
}

/* Footer */
.main-footer {
  background: #ffffff;
  padding: 24px 0;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 14px;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

@media (max-width: 768px) {
  .footer-container {
    flex-direction: column;
    text-align: center;
    gap: 15px;
    padding: 0 16px;
  }
}

.copyright {
  font-weight: 500;
  color: #475569;
}

.footer-stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #94a3b8;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
}

.stat-item:hover {
  color: #64748b;
}

.stat-icon {
  font-size: 12px;
}

.footer-links {
  display: flex;
  gap: 20px;
  font-size: 13px;
}

.footer-link {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 0;
  transition: all 0.2s ease;
  position: relative;
}

.footer-link:hover {
  color: #3b82f6;
}

.footer-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: #3b82f6;
  transition: width 0.2s ease;
}

.footer-link:hover::after {
  width: 100%;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default Layout
