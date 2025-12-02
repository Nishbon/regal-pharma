// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, usersAPI } from '../services/api'; // Added usersAPI

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Initialize auth state from localStorage on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('🔍 Initializing auth from localStorage...');
        
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            
            // Verify token is still valid by fetching fresh user data
            try {
              const profileResponse = await usersAPI.getProfile();
              if (profileResponse.data.success) {
                // Token is valid, use fresh user data
                const freshUser = profileResponse.data.data;
                console.log('✅ Token valid, user:', freshUser.username);
                setUser(freshUser);
                setToken(storedToken);
              } else {
                throw new Error('Token validation failed');
              }
            } catch (profileError) {
              console.log('⚠️ Token invalid or expired, using stored user');
              // Token might be expired, but we'll use stored user for now
              setUser(parsedUser);
              setToken(storedToken);
            }
            
            console.log('✅ Auth initialized from localStorage');
          } catch (parseError) {
            console.error('❌ Error parsing stored user:', parseError);
            // Clear corrupted data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } else {
          console.log('ℹ️ No stored auth data found');
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Clear any corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
        console.log('🏁 Auth initialization complete');
      }
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login with:', username);
      
      const response = await authAPI.login(username, password);
      console.log('📦 Login API response:', response.data);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store everything in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        setToken(token);
        setUser(user);
        
        console.log('✅ Login successful!', {
          username: user.username,
          role: user.role,
          name: user.name
        });
        
        // Also test token by fetching profile
        try {
          const profileResponse = await usersAPI.getProfile();
          if (profileResponse.data.success) {
            console.log('✅ Token verified with profile fetch');
          }
        } catch (profileError) {
          console.warn('⚠️ Profile fetch failed but login succeeded:', profileError.message);
        }
        
        return { 
          success: true,
          user: user
        };
      } else {
        console.log('❌ Login failed in API response');
        return { 
          success: false, 
          message: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        console.error('Server error details:', {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url
        });
        
        if (error.response.status === 404) {
          errorMessage = 'Login endpoint not found. Please check backend configuration.';
        } else if (error.response.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.response.data?.message || 
                        `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        console.error('No response received from:', error.config?.url);
        errorMessage = 'Cannot connect to server. Please check: \n1. Backend is running \n2. Correct API URL \n3. Network connection';
      } else {
        errorMessage = `Login error: ${error.message}`;
      }
      
      return { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    
    try {
      // Try API logout (optional)
      authAPI.logout().catch(() => {
        // Ignore errors for logout
        console.log('API logout skipped (optional)');
      });
    } catch (apiError) {
      console.log('API logout failed, continuing with client logout');
    }
    
    // Clear everything from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset state
    setToken(null);
    setUser(null);
    
    // Navigate to login page
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  // Update user data (after profile edit, etc.)
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    console.log('✅ User data updated');
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  // Check if user has any of the given roles
  const hasAnyRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    token,
    updateUser,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
