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
    { path: '/dashboard', label: 'Dashboard', icon: 'HOME', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/daily-report', label: 'Daily Report', icon: 'REPORT', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/reports', label: 'Reports', icon: 'FILES', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/analytics', label: 'Analytics', icon: 'CHART', roles: ['medrep', 'supervisor', 'admin'] },
    { path: '/supervisor-dashboard', label: 'Team Dashboard', icon: 'CROWN', roles: ['supervisor', 'admin'] },
    { path: '/team-management', label: 'Team Management', icon: 'TEAM', roles: ['supervisor', 'admin'] },
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
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
    }}>
      {/* Header with Navigation */}
      <header style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        color: 'white',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          width: '100%'
        }}>
          {/* Top Row: Logo & User Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                RP
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>
                {isMobile ? 'RP' : 'Regal Pharma'}
              </div>
            </div>

            {/* User Info & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                padding: '6px 12px', 
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span style={{ marginRight: '6px' }}>
                  {user?.role === 'supervisor' ? 'S' : user?.role === 'admin' ? 'A' : 'R'}
                </span>
                {isMobile ? user?.name?.split(' ')[0] || 'User' : user?.name || 'User'}
                <span style={{ 
                  marginLeft: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {user?.role || 'User'}
                </span>
              </div>
              
              <button 
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  ':hover': {
                    background: 'rgba(239, 68, 68, 1)',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                <span>LOGOUT</span>
                {!isMobile && 'Logout'}
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav style={{
            display: 'flex',
            gap: isMobile ? '8px' : '12px',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '8px' : '0',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            '::-webkit-scrollbar': {
              display: 'none'
            }
          }}>
            {filteredNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '10px 16px',
                  background: isActive(item.path) 
                    ? 'rgba(255, 255, 255, 0.25)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderBottom: isActive(item.path) ? '2px solid white' : '2px solid transparent',
                  ':hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {(!isMobile || isActive(item.path)) && item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        minHeight: 'calc(100vh - 120px)', // Adjusted for navigation bar
        background: '#f8fafc'
      }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        background: 'white',
        padding: '20px 0',
        borderTop: '1px solid #e5e7eb',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: isMobile ? '15px' : '0'
        }}>
          {/* Copyright */}
          <div>
            © {new Date().getFullYear()} Regal Pharma • All rights reserved
          </div>

          {/* Quick Stats (if on dashboard pages) */}
          {['/dashboard', '/supervisor-dashboard', '/team-management'].includes(location.pathname) && (
            <div style={{
              display: 'flex',
              gap: '20px',
              fontSize: '12px',
              color: '#9ca3af',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>MR</span>
                <span>Medical Rep System</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>V</span>
                <span>v1.0.0</span>
              </div>
              {(user?.role === 'supervisor' || user?.role === 'admin') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>TM</span>
                  <span>Team Management</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div style={{
            display: 'flex',
            gap: '20px',
            fontSize: '13px'
          }}>
            {!isMobile && (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    ':hover': {
                      color: '#2563eb',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => navigate('/daily-report')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    ':hover': {
                      color: '#2563eb',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Daily Report
                </button>
                {/* Add Team Management link for supervisors/admins in footer */}
                {(user?.role === 'supervisor' || user?.role === 'admin') && (
                  <button 
                    onClick={() => navigate('/team-management')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      ':hover': {
                        color: '#2563eb',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Team Management
                  </button>
                )}
              </>
            )}
            <button 
              onClick={() => navigate('/reports')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                textDecoration: 'none',
                ':hover': {
                  color: '#2563eb',
                  textDecoration: 'underline'
                }
              }}
            >
              Reports
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
