import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const navigateTo = (path) => navigate(path)

  // Different navigation items based on role
  const getNavItems = () => {
    if (user?.role === 'supervisor') {
      return [
        { path: '/dashboard', label: 'Team Overview', icon: '👑', description: 'Team performance dashboard' },
        { path: '/analytics', label: 'Team Analytics', icon: '📊', description: 'Detailed team metrics' },
        { path: '/supervisor', label: 'Team Management', icon: '👥', description: 'Manage medical representatives' },
      ]
    } else {
      // MedRep navigation
      return [
        { path: '/dashboard', label: 'My Dashboard', icon: '📈', description: 'Personal performance overview' },
        { path: '/daily-report', label: 'Submit Report', icon: '📝', description: 'Submit daily activity report' },
        { path: '/reports', label: 'My Reports', icon: '📋', description: 'View my submitted reports' },
        { path: '/analytics', label: 'My Performance', icon: '🎯', description: 'Detailed performance analytics' },
      ]
    }
  }

  const navItems = getNavItems()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        color: 'white',
        padding: '16px 0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                💊
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>
                  MedTrack Pro
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: '0.8',
                  fontWeight: '500',
                  marginTop: '2px'
                }}>
                  {user?.role === 'supervisor' ? 'Supervisor Portal' : 'Medical Representative Portal'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                padding: '8px 16px', 
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span style={{ marginRight: '8px' }}>
                  {user?.role === 'supervisor' ? '👑' : '👨‍⚕️'}
                </span>
                {user?.name}
                <span style={{ 
                  marginLeft: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {user?.role}
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
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(220, 38, 38, 0.9)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.9)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: 'white',
        padding: '0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '0' }}>
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigateTo(item.path)}
                style={{
                  padding: '20px 24px',
                  background: 'none',
                  border: 'none',
                  color: isActive(item.path) ? '#2563eb' : '#6b7280',
                  fontWeight: isActive(item.path) ? '600' : '500',
                  borderBottom: isActive(item.path) ? '3px solid #2563eb' : '3px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.color = '#374151';
                    e.target.style.background = '#f9fafb';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.color = '#6b7280';
                    e.target.style.background = 'none';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'inherit' }}>{item.label}</div>
                  <div style={{ 
                    fontSize: '11px', 
                    opacity: '0.7',
                    fontWeight: '400',
                    marginTop: '2px'
                  }}>
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 140px)', padding: '32px 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout