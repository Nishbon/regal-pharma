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

// API Endpoints
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  healthCheck: () => 
    api.get('/health')
};

export const reportsAPI = {
  getMyReports: () => 
    api.get('/reports/my-reports'),
  
  getAll: () => 
    api.get('/reports/all'),
  
  create: (data) => 
    api.post('/reports/create', data)
};

export default api;
