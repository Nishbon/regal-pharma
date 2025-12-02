import axios from 'axios';

// Use your Render backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     'https://regal-pharma-backend.onrender.com';

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
    api.post('/api/auth/login', { username, password }), // ✅ Fixed: Added /api/
  
  logout: () => 
    api.post('/api/auth/logout'), // ✅ Fixed
  
  getProfile: () => 
    api.get('/api/users/profile/me'), // ✅ Fixed: Changed endpoint
  
  // Debug endpoint (if exists)
  debugLogin: (username, password) =>
    api.post('/api/debug-login', { username, password }),
  
  // Health check endpoint
  healthCheck: () => 
    api.get('/api/health', { timeout: 10000 }) // ✅ Fixed
};

export const reportsAPI = {
  // Get user's own reports
  getMyReports: (page = 1, limit = 20) => 
    api.get(`/api/reports/my-reports?page=${page}&limit=${limit}`), // ✅ Fixed
  
  // Get ALL reports (for supervisors)
  getAll: () => 
    api.get('/api/reports/all'), // ✅ Fixed
  
  // Create new report
  create: (data) => 
    api.post('/api/reports/create', data), // ✅ Fixed
  
  // Get single report by ID
  getReport: (id) => 
    api.get(`/api/reports/${id}`), // ✅ Fixed
  
  // Update report
  updateReport: (id, data) => 
    api.put(`/api/reports/${id}`, data), // ✅ Fixed
  
  // Delete report
  deleteReport: (id) => 
    api.delete(`/api/reports/${id}`), // ✅ Fixed
  
  // Get reports by date range
  getByDateRange: (startDate, endDate) => 
    api.get(`/api/reports/date-range/${startDate}/${endDate}`), // ✅ Fixed
};

export const analyticsAPI = {
  // Weekly stats for current user
  getWeekly: () => 
    api.get('/api/analytics/weekly'), // ✅ Fixed
  
  // Monthly stats for current user
  getMonthly: () => 
    api.get('/api/analytics/monthly'), // ✅ Fixed
  
  // Team performance (supervisors only)
  getTeamPerformance: (period = 'month') => 
    api.get(`/api/analytics/team-performance?period=${period}`), // ✅ Fixed
  
  // Region performance (supervisors only)
  getRegionPerformance: () => 
    api.get('/api/analytics/region-performance'), // ✅ Fixed
  
  // Dashboard summary
  getDashboardSummary: () => 
    api.get('/api/analytics/dashboard-summary'), // ✅ Fixed
  
  // Test endpoint
  test: () => 
    api.get('/api/analytics/test'), // ✅ Fixed
};

export const usersAPI = {
  // Get all users (supervisors only)
  getAll: () => 
    api.get('/api/users'), // ✅ Fixed
  
  // Create user (supervisors only)
  create: (data) => 
    api.post('/api/users', data), // ✅ Fixed
  
  // Update user (supervisors only)
  update: (id, data) => 
    api.put(`/api/users/${id}`, data), // ✅ Fixed
  
  // Get user by ID (supervisors only)
  getById: (id) => 
    api.get(`/api/users/${id}`), // ✅ Fixed
  
  // Get active medreps
  getActiveMedReps: () => 
    api.get('/api/users/active-medreps'), // ✅ Fixed
  
  // Get current user profile
  getProfile: () => 
    api.get('/api/users/profile/me'), // ✅ Fixed
  
  // Update current user profile
  updateProfile: (data) => 
    api.put('/api/users/profile/me', data), // ✅ Fixed
  
  // Get supervisors
  getSupervisors: () => 
    api.get('/api/users/supervisors'), // ✅ Fixed
  
  // Test auth
  testAuth: () => 
    api.get('/api/users/test/auth'), // ✅ Fixed
};

// Test all API endpoints
export const testAPIConnection = async () => {
  try {
    console.log('🧪 Testing API connection...');
    
    // Test 1: Health check
    const health = await api.get('/api/health');
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
    
    // Test 3: Test endpoints that don't require auth
    const testEndpoints = [
      '/api/health',
      '/api/test-auth'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ ${endpoint}:`, response.status, response.data.message || 'OK');
      } catch (error) {
        console.log(`ℹ️ ${endpoint}:`, error.message);
      }
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
  
  // Test connection on startup
  if (import.meta.env.DEV) {
    testAPIConnection().catch(() => {
      console.log('Backend might be starting up...');
    });
  }
};

// Call initialization
initializeAPI();

export default api;
