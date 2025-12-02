import axios from 'axios';

// Determine if we're in production
const isProduction = import.meta.env.PROD;

// Use relative path in production (goes through Vite proxy)
// Use direct URL in development
const API_BASE_URL = isProduction 
  ? '/api'  // Relative path for production (uses Vite proxy)
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

console.log('Environment:', import.meta.env.MODE);
console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout for Render free tier
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log all requests in development
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
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
    if (import.meta.env.DEV) {
      console.log(`📥 Response ${response.status}: ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method;
    const status = error.response?.status;
    const message = error.message;
    
    console.error('❌ API Error:', {
      url: `${method?.toUpperCase()} ${url}`,
      status,
      message,
      fullError: error.response?.data || error.message
    });
    
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - Render might be spinning up');
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        console.log('🔒 Authentication failed, redirecting to login...');
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      if (error.message.includes('Network Error')) {
        error.message = 'Cannot connect to server. Please check your internet connection and try again.';
      }
      console.error('🌐 Network error - Backend might be down:', error.message);
    }
    
    return Promise.reject({
      ...error,
      userMessage: error.response?.data?.message || error.message
    });
  }
);

// ====================== API ENDPOINTS ======================

export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }), // ✅ Removed /api/ prefix
  
  logout: () => 
    api.post('/auth/logout'), // ✅ Removed /api/ prefix
  
  getProfile: () => 
    api.get('/users/profile/me'), // ✅ Removed /api/ prefix
  
  healthCheck: () => 
    api.get('/health', { timeout: 10000 }) // ✅ Removed /api/ prefix
};

export const reportsAPI = {
  getMyReports: (page = 1, limit = 20) => 
    api.get(`/reports/my-reports?page=${page}&limit=${limit}`), // ✅ Removed /api/ prefix
  
  getAll: () => 
    api.get('/reports/all'), // ✅ Removed /api/ prefix
  
  create: (data) => 
    api.post('/reports/create', data), // ✅ Removed /api/ prefix
  
  getReport: (id) => 
    api.get(`/reports/${id}`), // ✅ Removed /api/ prefix
  
  updateReport: (id, data) => 
    api.put(`/reports/${id}`, data), // ✅ Removed /api/ prefix
  
  deleteReport: (id) => 
    api.delete(`/reports/${id}`), // ✅ Removed /api/ prefix
  
  getByDateRange: (startDate, endDate) => 
    api.get(`/reports/date-range/${startDate}/${endDate}`), // ✅ Removed /api/ prefix
};

export const analyticsAPI = {
  getWeekly: () => 
    api.get('/analytics/weekly'), // ✅ Removed /api/ prefix
  
  getMonthly: () => 
    api.get('/analytics/monthly'), // ✅ Removed /api/ prefix
  
  getTeamPerformance: (period = 'month') => 
    api.get(`/analytics/team-performance?period=${period}`), // ✅ Removed /api/ prefix
  
  getRegionPerformance: () => 
    api.get('/analytics/region-performance'), // ✅ Removed /api/ prefix
  
  getDashboardSummary: () => 
    api.get('/analytics/dashboard-summary'), // ✅ Removed /api/ prefix
};

export const usersAPI = {
  getAll: () => 
    api.get('/users'), // ✅ Removed /api/ prefix
  
  create: (data) => 
    api.post('/users', data), // ✅ Removed /api/ prefix
  
  update: (id, data) => 
    api.put(`/users/${id}`, data), // ✅ Removed /api/ prefix
  
  getById: (id) => 
    api.get(`/users/${id}`), // ✅ Removed /api/ prefix
  
  getActiveMedReps: () => 
    api.get('/users/active-medreps'), // ✅ Removed /api/ prefix
  
  getProfile: () => 
    api.get('/users/profile/me'), // ✅ Removed /api/ prefix
  
  updateProfile: (data) => 
    api.put('/users/profile/me', data), // ✅ Removed /api/ prefix
  
  getSupervisors: () => 
    api.get('/users/supervisors'), // ✅ Removed /api/ prefix
};

// Test API connection
export const testAPIConnection = async () => {
  try {
    console.log('🧪 Testing API connection...');
    
    // Test 1: Health check
    const health = await api.get('/health');
    console.log('✅ Health check:', health.data);
    
    // Test 2: Try to get profile (will fail if no token, but that's OK)
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const profile = await usersAPI.getProfile();
        console.log('✅ Profile check:', profile.data);
      }
    } catch (profileError) {
      console.log('ℹ️ Profile check failed (no token or invalid):', profileError.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ API connection test failed:', error.message);
    throw error;
  }
};

// Initialize API with token from localStorage
export const initializeAPI = () => {
  const token = localStorage.getItem('token');
  if (token) {
    console.log('🔑 Initializing API with stored token');
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  // Test connection on startup in development
  if (import.meta.env.DEV) {
    testAPIConnection().catch(() => {
      console.log('Backend might be starting up...');
    });
  }
};

// Call initialization
initializeAPI();

export default api;
