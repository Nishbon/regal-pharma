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
      <div className="login-loading">
        <div className="loading-card">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1>Regal Pharma</h1>
          <p className="login-subtitle">Medical Representative Portal</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyPress={handleKeyPress}>
          <div className="form-group">
            <label>
              Username
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                placeholder="Enter your username"
              />
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="show-password-btn"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? (
              <>
                <span className="button-spinner"></span>
                Signing In...
              </>
            ) : (
              <>
                <span className="button-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            © {new Date().getFullYear()} Regal Pharma. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

// CSS Styles
const styles = `
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.login-card {
  background: #ffffff;
  padding: 48px 40px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-width: 420px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

/* Loading State */
.login-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.loading-card {
  background: white;
  padding: 60px 40px;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #f1f5f9;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-content p {
  color: #64748b;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Login Header */
.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.logo-icon {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.login-header h1 {
  color: #1e293b;
  margin-bottom: 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  color: #64748b;
  font-size: 14px;
  font-weight: 400;
  margin: 0;
  letter-spacing: 0.5px;
}

/* Error Message */
.error-message {
  background: #fef2f2;
  color: #991b1b;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 24px;
  border: 1px solid #fecaca;
  font-size: 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Form Styles */
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #475569;
  font-size: 14px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.show-password-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.show-password-btn:hover {
  color: #2563eb;
}

/* Input Wrapper */
.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 16px 48px 16px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  background: #f8fafc;
  transition: all 0.3s ease;
  outline: none;
  box-sizing: border-box;
}

.input-wrapper input:focus {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-wrapper input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.7;
}

.input-wrapper input::placeholder {
  color: #94a3b8;
}

.input-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* Login Button */
.login-button {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.login-button:disabled {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.button-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

.button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Footer */
.login-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.login-footer p {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 400;
  margin: 0;
  letter-spacing: 0.3px;
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    border-radius: 16px;
  }
  
  .logo-icon {
    width: 60px;
    height: 60px;
    border-radius: 14px;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
  
  .login-button {
    padding: 16px;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default Login;
