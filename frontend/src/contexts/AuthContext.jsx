// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

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
        
        if (storedToken && storedUser) {
          // Set token and user from localStorage
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          console.log('✅ Auth initialized from localStorage');
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login with:', username);
      
      const response = await authAPI.login(username, password);
      console.log('📦 Login response:', response.data);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store everything in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        setToken(token);
        setUser(user);
        
        console.log('✅ Login successful, user role:', user.role);
        
        return { 
          success: true,
          user: user
        };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      return { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    
    // Clear everything
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset state
    setToken(null);
    setUser(null);
    
    // Navigate to login
    window.location.href = '/login';
  };

  const value = {
    user,
    login,
    logout,
    loading,
    token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
