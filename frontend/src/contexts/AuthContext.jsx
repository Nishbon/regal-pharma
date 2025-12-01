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

  // Function to fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        // If no profile endpoint, check if we have token
        const token = localStorage.getItem('token');
        if (token) {
          // You might want to decode JWT to get basic user info
          // Or create a mock user object based on token
          setUser({ username: 'User', role: 'medrep' });
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Don't clear token here, let interceptor handle it
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await fetchUserProfile();
      } else {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      console.log('Logging in with:', username);
      
      const response = await authAPI.login(username, password);
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store token
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        
        console.log('Login successful, user role:', user.role);
        
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
      console.error('Login API error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error ||
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

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      // Use window.location to ensure complete reset
      window.location.href = '/login';
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    login,
    logout,
    loading,
    token,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};