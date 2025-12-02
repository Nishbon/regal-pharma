import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api'; // Import the API

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
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
    setDebugInfo('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login for user:', username);
      
      // Use the corrected API endpoint
      const response = await authAPI.login(username.trim(), password.trim());
      console.log('✅ Login API response:', response.data);
      
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        
        // Debug info
        setDebugInfo(`Login successful! Role: ${userData.role}, ID: ${userData.id}`);
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update auth context
        login(userData);
        
        // Redirect based on role
        setTimeout(() => {
          if (userData.role === 'supervisor' || userData.role === 'admin') {
            navigate('/supervisor-dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 100);
        
      } else {
        setError(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      
      // Detailed error handling
      if (err.response) {
        // Server responded with error
        setError(`Server error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`);
        setDebugInfo(`URL: ${err.config?.url}, Status: ${err.response.status}`);
      } else if (err.request) {
        // No response received
        setError('No response from server. Backend might be down or URL is incorrect.');
        setDebugInfo('Check if backend is running on Render');
      } else {
        // Other errors
        setError('Login failed: ' + err.message);
      }
      
      // Show test credentials for debugging
      setDebugInfo(prev => prev + '\n\nTest credentials:\nadmin / admin123\nbonte / bonte123\njohn / john123');
    } finally {
      setLoading(false);
    }
  };

  // Test direct API call (for debugging)
  const testAPI = async () => {
    try {
      console.log('🧪 Testing API connection...');
      const response = await authAPI.healthCheck();
      setDebugInfo(`API Health: ${response.status} - ${response.data.message || 'OK'}`);
      console.log('API health response:', response.data);
    } catch (error) {
      setDebugInfo(`API Test Failed: ${error.message}`);
      console.error('API test error:', error);
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
            flexDirection: column;
            alignItems: center;
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
        
        {/* Debug Info - Show in development */}
        {import.meta.env.DEV && debugInfo && (
          <div style={{
            background: '#e8f4fd',
            color: '#2c3e50',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #b3e0ff',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {debugInfo}
          </div>
        )}

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
              placeholder="Enter username (e.g., admin, bonte)"
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
                placeholder="Enter password"
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
          >
            {loading ? (
              <>
                <span style={{ fontSize: '18px' }}>⏳</span>
                Signing In...
              </>
            ) : (
              <>
                <span style={{ fontSize: '18px' }}>🔐</span>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Debug button for development */}
        {import.meta.env.DEV && (
          <button
            onClick={testAPI}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '10px',
              background: '#f8f9fa',
              color: '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🧪 Test API Connection
          </button>
        )}

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
            Demo: admin / admin123 • bonte / bonte123
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
