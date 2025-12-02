import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isMobile = window.innerWidth < 768

  const handleLogout = () => {
    logout()
    // Remove this line - logout() already handles the redirect
    // navigate('/login')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
    }}>
      {/* Minimal Header Only */}
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
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
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
              💊
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
                {user?.role === 'supervisor' ? '👑' : '👨‍⚕️'}
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
                gap: '8px'
              }}
            >
              <span>🚪</span>
              {!isMobile && 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width, No Padding */}
      <main style={{ 
        minHeight: 'calc(100vh - 72px)',
        background: '#f8fafc'
      }}>
        <Outlet />
      </main>

      {/* Minimal Footer */}
      <footer style={{
        background: 'white',
        padding: '16px 0',
        borderTop: '1px solid #e5e7eb',
        color: '#6b7280',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px'
        }}>
          © {new Date().getFullYear()} Regal Pharma
        </div>
      </footer>
    </div>
  )
}

export default Layout
