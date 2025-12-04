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

// Helper function for headers
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

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
    api.get('/reports/all'),  // FIXED: Changed from '/reports' to '/reports/all'
  
  // Get all reports without filter (for supervisors)
  getAllReports: () => 
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
  
  // New endpoint for Team Management
  getReportsByUserId: (userId, startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return api.get(`/reports/user/${userId}`, { params });
  }
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
  
  // Export functionality endpoints
  exportTeamReport: (period = 'month', format = 'pdf') => 
    api.get(`/analytics/export/team?period=${period}&format=${format}`, {
      responseType: 'blob' // Important for file downloads
    }),
  
  exportMemberReport: (userId, period = 'month', format = 'pdf') => 
    api.get(`/analytics/export/member/${userId}?period=${period}&format=${format}`, {
      responseType: 'blob'
    })
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
  
  // Team Management specific endpoints
  getActiveMedreps: () => 
    api.get('/users/active-medreps'),
  
  getTeamMembers: () => 
    api.get('/users/team-members'),
  
  deactivateUser: (userId) => 
    api.put(`/users/${userId}/deactivate`, {}),
  
  activateUser: (userId) => 
    api.put(`/users/${userId}/activate`, {}),
  
  updateUserStatus: (userId, action) => 
    api.put(`/users/${userId}/${action}`, {}),
  
  // User search
  searchUsers: (query) => 
    api.get(`/users/search?query=${query}`),
  
  // User performance stats
  getUserPerformance: (userId, period = 'month') => 
    api.get(`/users/${userId}/performance?period=${period}`)
};

// Helper functions for PDF export
export const exportAPI = {
  // Generate PDF blob
  generatePDF: async (data, type = 'team') => {
    try {
      let response;
      if (type === 'team') {
        response = await analyticsAPI.exportTeamReport('month', 'pdf');
      } else if (type === 'member') {
        response = await analyticsAPI.exportMemberReport(data.userId, 'month', 'pdf');
      } else {
        throw new Error('Invalid export type');
      }
      
      if (response.data) {
        // Create blob and download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = type === 'team' 
          ? `team-performance-${new Date().toISOString().split('T')[0]}.pdf`
          : `member-performance-${data.userId}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('PDF export error:', error);
      throw error;
    }
  },

  // Download file helper
  downloadFile: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

// Debug helper
export const debugAPI = {
  testConnection: () => api.get('/'),
  testAuth: () => api.get('/api/test-auth'),
  debugHeaders: () => api.get('/api/debug/headers'),
  health: () => api.get('/health'),
  dbStatus: () => api.get('/api/debug/db')
};

export default api;
