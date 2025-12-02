import axios from 'axios';

// IMPORTANT: Vite automatically loads .env.production when building for production
// In production: uses VITE_API_URL from .env.production (https://regal-pharma-backend.onrender.com/api)
// In development: uses relative path /api (goes through Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

console.log('⚡ Environment Mode:', import.meta.env.MODE);
console.log('🏭 Is Production:', import.meta.env.PROD);
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL || 'Not set (using proxy)');

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
    
    // Log all requests
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response ${response.status}: ${response.config.url}`);
    return response;
  },
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method;
    const status = error.response?.status;
    const message = error.message;
    const baseURL = error.config?.baseURL;
    
    console.error('❌ API Error Details:', {
      method: `${method?.toUpperCase()} ${url}`,
      status,
      message,
      baseURL,
      fullURL: `${baseURL}${url}`,
      responseData: error.response?.data,
      isCorsError: message.includes('Network Error') && !error.response
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
    
    // Handle network/CORS errors
    if (!error.response) {
      if (error.message.includes('Network Error')) {
        console.error('🌐 Network/CORS Error - Possible issues:');
        console.error('  1. Backend is down');
        console.error('  2. CORS not configured on backend');
        console.error('  3. Wrong URL:', baseURL);
      }
    }
    
    return Promise.reject({
      ...error,
      userMessage: error.response?.data?.message || 
                  (error.message.includes('Network Error') 
                    ? 'Cannot connect to server. Please check your internet connection.' 
                    : error.message)
    });
  }
);

// ====================== API ENDPOINTS ======================

export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getProfile: () => 
    api.get('/users/profile/me'),
  
  healthCheck: () => 
    api.get('/health', { timeout: 10000 }),
  
  // Debug endpoint
  proxyTest: () =>
    api.get('/proxy-test')
};

export const reportsAPI = {
  getMyReports: (page = 1, limit = 20) => 
    api.get(`/reports/my-reports?page=${page}&limit=${limit}`),
  
  getAll: () => 
    api.get('/reports/all'),
  
  create: (data) => 
    api.post('/reports/create', data),
  
  getReport: (id) => 
    api.get(`/reports/${id}`),
  
  updateReport: (id, data) => 
    api.put(`/reports/${id}`, data),
  
  deleteReport: (id) => 
    api.delete(`/reports/${id}`),
  
  getByDateRange: (startDate, endDate) => 
    api.get(`/reports/date-range/${startDate}/${endDate}`),
};

export const analyticsAPI = {
  getWeekly: () => 
    api.get('/analytics/weekly'),
  
  getMonthly: () => 
    api.get('/analytics/monthly'),
  
  getTeamPerformance: (period = 'month') => 
    api.get(`/analytics/team-performance?period=${period}`),
  
  getRegionPerformance: () => 
    api.get('/analytics/region-performance'),
  
  getDashboardSummary: () => 
    api.get('/analytics/dashboard-summary'),
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
  
  getActiveMedReps: () => 
    api.get('/users/active-medreps'),
  
  getProfile: () => 
    api.get('/users/profile/me'),
  
  updateProfile: (data) => 
    api.put('/users/profile/me', data),
  
  getSupervisors: () => 
    api.get('/users/supervisors'),
};

// Test API connection
export const testAPIConnection = async () => {
  try {
    console.log('🧪 Testing API connection...');
    console.log('Current baseURL:', api.defaults.baseURL);
    
    // Test health check
    const health = await authAPI.healthCheck();
    console.log('✅ Health check:', health.data);
    
    // Test proxy test endpoint
    const proxyTest = await authAPI.proxyTest();
    console.log('✅ Proxy test:', proxyTest.data);
    
    return {
      success: true,
      health: health.data,
      proxy: proxyTest.data,
      baseURL: api.defaults.baseURL
    };
  } catch (error) {
    console.error('❌ API connection test failed:', error.message);
    console.error('Full error:', error);
    
    return {
      success: false,
      error: error.message,
      baseURL: api.defaults.baseURL
    };
  }
};

// Initialize API with token from localStorage
export const initializeAPI = () => {
  const token = localStorage.getItem('token');
  if (token) {
    console.log('🔑 Initializing API with stored token');
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  // Log initialization
  console.log('🚀 API Service Initialized:', {
    baseURL: api.defaults.baseURL,
    mode: import.meta.env.MODE,
    isProduction: import.meta.env.PROD,
    hasToken: !!token
  });
};

// Call initialization
initializeAPI();

export default api;
