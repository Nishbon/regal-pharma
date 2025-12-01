// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  logout: () => 
    api.post('/auth/logout')
};

export const reportsAPI = {
  submitDaily: (data) => 
    api.post('/reports/daily', data),
  
  getMyReports: (page = 1, limit = 20) => 
    api.get(`/reports/my-reports?page=${page}&limit=${limit}`),
  
  getReport: (id) => 
    api.get(`/reports/${id}`),
  
  updateReport: (id, data) => 
    api.put(`/reports/${id}`, data)
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
    api.get('/analytics/region-performance')
};

export const usersAPI = {
  getAll: () => 
    api.get('/users'),
  
  create: (data) => 
    api.post('/users', data),
  
  update: (id, data) => 
    api.put(`/users/${id}`, data)
};

export default api;