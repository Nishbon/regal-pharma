// frontend/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
      console.log('User already logged in, redirecting to dashboard...');
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
      const result = await login(username.trim(), password.trim());
      console.log('Login result:', result);
      
      if (!result.success) {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
      // Navigation will be handled by useEffect or App.js routing
    } catch (err) {
      console.error('Login handler error:', err);
      setError('An unexpected error occurred. Please try again.');
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
      <div className="login-container">
        <div className="login-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
        <style jsx>{`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .login-card {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
          }
          .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        padding: '40px 30px',
        borderRadius: '12px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
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
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = '#2980b9';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 5px 15px rgba(52, 152, 219, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = '#3498db';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
            onMouseDown={(e) => {
              if (!loading) e.target.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <>
                <span style={{ fontSize: '18px' }}>⏳</span>
                Processing...
              </>
            ) : (
              <>
                <span style={{ fontSize: '18px' }}>🔐</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: '1px solid #ecf0f1',
          textAlign: 'center'
        }}>
          <p style={{ 
            color: '#7f8c8d', 
            fontSize: '13px',
            margin: '5px 0'
          }}>
            For assistance, contact IT Support
          </p>
          <p style={{ 
            color: '#bdc3c7', 
            fontSize: '12px',
            margin: '5px 0'
          }}>
            v1.0.0 • © {new Date().getFullYear()} Regal Pharma
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;