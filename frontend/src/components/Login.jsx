import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!username.trim()) {
      setError('Please enter username');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username.trim(), password.trim());
      
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update auth context
        login(userData);
        
        // Determine redirect path based on role
        const redirectPath = userData.role === 'supervisor' || userData.role === 'admin' 
          ? '/supervisor-dashboard' 
          : '/dashboard';
        
        // Store redirect path in sessionStorage
        sessionStorage.setItem('postLoginRedirect', redirectPath);
        
        console.log(`✅ Login successful! Redirecting to: ${redirectPath}`);
        
        // CRITICAL: Go to root first, then App.jsx will handle the redirect
        window.location.href = '/';
        
      } else {
        setError(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (err.response) {
        // Server responded with error
        const errorMsg = err.response.data?.message || `Server error: ${err.response.status}`;
        setError(`Login failed: ${errorMsg}`);
      } else if (err.request) {
        // No response received (network error)
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        // Other errors
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '20px' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ color: '#666', margin: 0 }}>Checking authentication...</p>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            fontSize: '36px',
            color: 'white'
          }}>
            💊
          </div>
          <h1 style={{ 
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '28px'
          }}>
            Regal Pharma
          </h1>
          <p style={{ 
            color: '#7f8c8d',
            fontSize: '15px',
            margin: 0
          }}>
            Medical Representative Portal
          </p>
        </div>

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '24px',
            border: '1px solid #ffcdd2',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyPress={handleKeyPress}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#34495e',
              fontSize: '14px'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box',
                backgroundColor: loading ? '#f8f9fa' : 'white',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              placeholder="Enter your username"
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <label style={{ 
                fontWeight: '600',
                color: '#34495e',
                fontSize: '14px'
              }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3498db',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingRight: '50px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  backgroundColor: loading ? '#f8f9fa' : 'white',
                  transition: 'border 0.3s',
                  outline: 'none'
                }}
                placeholder="Enter your password"
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = '#2980b9';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = '#3498db';
              }
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: '1px solid #ecf0f1',
          textAlign: 'center'
        }}>
          <p style={{ 
            color: '#bdc3c7', 
            fontSize: '12px',
            margin: '5px 0'
          }}>
            © {new Date().getFullYear()} Regal Pharma. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
