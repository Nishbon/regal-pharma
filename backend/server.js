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

// ====================== PUBLIC ROUTES ======================
app.use('/api/auth', authRoutes);

// ====================== AUTHENTICATION MIDDLEWARE ======================
app.use(async (req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  
  // Skip auth for these public routes
  const publicRoutes = [
    '/', 
    '/health', 
    '/api/health',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/register'
  ];
  
  // Check if current path starts with any public route
  const isPublic = publicRoutes.some(route => req.path.startsWith(route));
  
  if (isPublic) {
    console.log(`🔓 Public route: ${req.path}`);
    return next();
  }
  
  // For protected routes, check token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`❌ No auth token for protected route: ${req.path}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medical-reporting-system-secret-key-2023');
    
    // Verify user exists and is active
    const user = await User.findOne({ 
      _id: decoded.id, 
      is_active: true 
    }).select('-password -__v');
    
    if (!user) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }
    
    // Add user to request
    req.user = user.toObject();
    req.user.isAuthenticated = true;
    req.user.id = req.user._id.toString();
    
    console.log(`✅ Authenticated: ${req.user.username} (${req.user.role})`);
    next();
  } catch (error) {
    console.log('❌ Invalid token:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
});

// ====================== PROTECTED ROUTES ======================
console.log('\nLOADING PROTECTED ROUTES...');

app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

console.log('✅ All routes loaded successfully\n');

// ====================== PUBLIC ENDPOINTS ======================
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
    authentication: req.user ? 'Authenticated' : 'Not authenticated',
    user: req.user ? {
      username: req.user.username,
      role: req.user.role
    } : null
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

// ====================== ERROR HANDLING ======================
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      'GET  /',
      'GET  /health',
      'GET  /api/health',
      'GET  /api/test',
      'POST /api/auth/login',
      'GET  /api/test-auth'
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
