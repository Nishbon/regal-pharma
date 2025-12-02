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

// CORS configuration - ALLOW ALL
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

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
    status: 'Running'
  });
});

// Health checks
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
    timestamp: new Date().toISOString()
  });
});

// ====================== AUTH ROUTES (PUBLIC) ======================
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
  console.log('='.repeat(50));
  console.log('\n📋 Test endpoints:');
  console.log('   GET  /api/test');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/health');
  console.log('\n✅ Server ready!');
});
