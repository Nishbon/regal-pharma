require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// MongoDB connection
const connectDB = require('./config/database');
const User = require('./models/User');

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

// CORS configuration - ALLOW ALL FOR NOW (fix later)
app.use(cors({
  origin: '*', // Allow all for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================== PUBLIC ROUTES (NO AUTH) ======================
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Regal Pharma API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'Running'
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    endpoints: [
      'POST /api/auth/login',
      'GET  /api/reports/my-reports',
      'GET  /api/analytics/weekly',
      'GET  /api/users (supervisors only)'
    ],
    timestamp: new Date().toISOString()
  });
});

// ====================== AUTH ROUTES (NO AUTH REQUIRED) ======================
app.use('/api/auth', authRoutes);

// ====================== PROTECTED ROUTES (REQUIRE AUTH) ======================
console.log('\nLOADING PROTECTED ROUTES...');

// Apply auth middleware to all routes below this line
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/users', authenticateToken, userRoutes);

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

console.log('✅ All routes loaded successfully\n');

// ====================== ERROR HANDLING ======================
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET  /',
      'GET  /health',
      'GET  /api/health',
      'GET  /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/logout',
      'GET  /api/test-auth (requires token)',
      'GET  /api/reports/* (requires token)',
      'GET  /api/analytics/* (requires token)',
      'GET  /api/users/* (requires token)'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
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
  console.log(`🔐 Authentication: JWT with MongoDB`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(50));
  console.log('\n📋 Test these endpoints:');
  console.log('   GET  /api/test           - Test if API is working');
  console.log('   POST /api/auth/login     - Login with admin/admin123');
  console.log('   GET  /api/health         - Health check');
  console.log('\n✅ Server ready!');
});
