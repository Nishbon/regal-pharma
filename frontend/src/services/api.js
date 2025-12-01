// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Add timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      // You could show a toast notification here
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  // ADD THIS - Essential for user profile
  getProfile: () => 
    api.get('/auth/profile'),
  
  // Optional but useful
  refreshToken: () => 
    api.post('/auth/refresh'),
  
  validateToken: () => 
    api.get('/auth/validate'),
  
  changePassword: (data) => 
    api.post('/auth/change-password', data)
};

export const reportsAPI = {
  submitDaily: (data) => 
    api.post('/reports/daily', data),
  
  getMyReports: (page = 1, limit = 20) => 
    api.get(`/reports/my-reports?page=${page}&limit=${limit}`),
  
  getReport: (id) => 
    api.get(`/reports/${id}`),
  
  updateReport: (id, data) => 
    api.put(`/reports/${id}`, data),
  
  // Optional: Add more endpoints
  deleteReport: (id) => 
    api.delete(`/reports/${id}`),
  
  getReportsByDate: (date) => 
    api.get(`/reports/by-date?date=${date}`)
};

export const analyticsAPI = {
  getWeekly: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return api.get(`/analytics/weekly?${params}`);
  },
  
  getMonthly: () => 
    api.get('/analytics/monthly'),
  
  getTeamPerformance: (period) => 
    api.get(`/analytics/team-performance?period=${period}`),
  
  getRegionPerformance: () => 
    api.get('/analytics/region-performance'),
  
  // Optional: Add more analytics endpoints
  getPersonalStats: (userId) => 
    api.get(`/analytics/personal/${userId}`),
  
  getTrends: (period = 'month') => 
    api.get(`/analytics/trends?period=${period}`)
};

export const usersAPI = {
  getAll: () => 
    api.get('/users'),
  
  create: (data) => 
    api.post('/users', data),
  
  update: (id, data) => 
    api.put(`/users/${id}`, data),
  
  // Optional: Add more user endpoints
  getById: (id) => 
    api.get(`/users/${id}`),
  
  delete: (id) => 
    api.delete(`/users/${id}`),
  
  getTeamMembers: () => 
    api.get('/users/team'),
  
  updateProfile: (data) => 
    api.put('/users/profile', data)
};

// Add utility function for handling errors
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      success: false,
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      message: 'No response from server. Please check your connection.'
    };
  } else {
    // Other errors
    return {
      success: false,
      message: error.message || 'An error occurred'
    };
  }
};

// Add request/response logging in development
if (import.meta.env.DEV) {
  api.interceptors.request.use(request => {
    console.log('Request:', request);
    return request;
  });
  
  api.interceptors.response.use(response => {
    console.log('Response:', response);
    return response;
  });
}

export default api;