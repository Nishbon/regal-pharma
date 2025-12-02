require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// MongoDB connection
const connectDB = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');

// Import auth middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Connect to MongoDB
connectDB();

console.log('\n' + '='.repeat(50));
console.log('STARTING SERVER...');
console.log('='.repeat(50));

// Security middleware
app.use(helmet());
app.use(compression());

// Morgan logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ========== UPDATED CORS CONFIGURATION ==========
const allowedOrigins = [
  'https://regal-pharma-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================== PUBLIC ROUTES ======================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Regal Pharma API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'Running',
    frontendUrl: 'https://regal-pharma-frontend.onrender.com',
    allowedOrigins: allowedOrigins
  });
});

// Health checks
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    status: 'online',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    requestInfo: {
      origin: req.headers.origin,
      method: req.method,
      url: req.originalUrl
    }
  });
});

// ====================== AUTH ROUTES ======================
app.use('/api/auth', authRoutes);

// ====================== PROTECTED ROUTES ======================
// Test auth endpoint
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Auth test endpoint working!',
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    },
    timestamp: new Date().toISOString()
  });
});

// Protected routes
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Add a test endpoint for frontend proxy testing
app.get('/api/proxy-test', (req, res) => {
  res.json({
    success: true,
    message: 'Proxy is working correctly!',
    timestamp: new Date().toISOString(),
    proxyInfo: {
      origin: req.headers.origin,
      host: req.headers.host,
      forwardedFor: req.headers['x-forwarded-for']
    }
  });
});

// ====================== ERROR HANDLING ======================
// 404 handler
app.use('*', (req, res) => {
  console.log('404 Not Found:', {
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin,
    headers: req.headers
  });
  
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    origin: req.headers.origin,
    availableEndpoints: [
      'GET  /',
      'GET  /health',
      'GET  /api/health',
      'GET  /api/test',
      'GET  /api/auth/test',
      'GET  /api/proxy-test',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET  /api/test-auth',
      'GET  /api/reports/*',
      'GET  /api/analytics/*',
      'GET  /api/users/*'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  console.error('Error stack:', err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Check connection'}`);
  console.log(`🌍 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log('='.repeat(50));
  console.log('\n📋 Test endpoints:');
  console.log('   GET  /api/test');
  console.log('   GET  /api/auth/test');
  console.log('   GET  /api/proxy-test');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/health');
  console.log('\n✅ Server ready!');
});
