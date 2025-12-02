import axios from 'axios';

// In production: uses VITE_API_URL from .env.production
// In development: uses proxy (/api -> localhost:5000)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

console.log('🔧 API Configuration:');
console.log('- Mode:', import.meta.env.MODE);
console.log('- Production:', import.meta.env.PROD);
console.log('- API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
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
    api.get('/health')
};

export const reportsAPI = {
  // For MedRepDashboard - with pagination support
  getMyReports: (page = 1, limit = 10) => 
    api.get('/reports/my-reports', {
      params: { page, limit }
    }),
  
  // For SupervisorDashboard - get all reports
  getAll: () => 
    api.get('/reports'),  // Changed from '/reports/all'
  
  create: (data) => 
    api.post('/reports/create', data),
  
  getReport: (id) => 
    api.get(`/reports/${id}`),
  
  updateReport: (id, data) => 
    api.put(`/reports/${id}`, data),
  
  deleteReport: (id) => 
    api.delete(`/reports/${id}`),
  
  getByDateRange: (startDate, endDate) => 
    api.get(`/reports/date-range/${startDate}/${endDate}`)
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
    api.get('/analytics/dashboard-summary')
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
    api.get('/users/supervisors')
};

export default api;
