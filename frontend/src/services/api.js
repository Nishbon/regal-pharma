// frontend/src/services/api.js
import axios from 'axios';

// Use your Render backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     'https://regal-pharma-backend.onrender.com/api';

console.log('API Base URL:', API_BASE_URL); // Debug - remove in production

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout for Render free tier (slow cold starts)
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting for development
    if (import.meta.env.DEV) {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`); // Debug
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`); // Debug
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - Render might be spinning up');
      // You could trigger a retry here
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors specifically
    if (!error.response) {
      if (error.message.includes('Network Error')) {
        error.message = 'Cannot connect to server. The backend service might be starting up. Please wait 30 seconds and try again.';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getProfile: () => 
    api.get('/auth/profile'),
  
  refreshToken: () => 
    api.post('/auth/refresh'),
  
  validateToken: () => 
    api.get('/auth/validate'),
  
  changePassword: (data) => 
    api.post('/auth/change-password', data),
  
  // Health check endpoint
  healthCheck: () => 
    api.get('/health', { timeout: 10000 })
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
  
  getById: (id) => 
    api.get(`/users/${id}`),
  
  delete: (id) => 
    api.delete(`/users/${id}`),
  
  getTeamMembers: () => 
    api.get('/users/team'),
  
  updateProfile: (data) => 
    api.put('/users/profile', data)
};

// Utility function to wait for backend to wake up (Render cold start)
export const waitForBackend = async (maxAttempts = 10, delay = 5000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Checking backend... Attempt ${attempt}/${maxAttempts}`);
      const response = await authAPI.healthCheck();
      if (response.status === 200) {
        console.log('Backend is ready!');
        return true;
      }
    } catch (error) {
      console.log(`Backend not ready yet (${error.message}). Waiting ${delay/1000}s...`);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Backend service did not start in time. Please try again in 30 seconds.');
};

// Handle Render cold starts by retrying requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 2000) => {
  for (let retry = 1; retry <= maxRetries; retry++) {
    try {
      return await requestFn();
    } catch (error) {
      if (retry === maxRetries) throw error;
      
      if (error.code === 'ECONNABORTED' || !error.response) {
        console.log(`Retry ${retry}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * retry));
      } else {
        throw error;
      }
    }
  }
};

export default api;