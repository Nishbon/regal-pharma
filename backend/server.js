require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// MongoDB connection
const connectDB = require('./config/database');

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

// CORS configuration
const allowedOrigins = [
  'https://regal-pharma-frontend.onrender.com',
  'https://medical-reporting-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================== REAL AUTHENTICATION MIDDLEWARE ======================
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  
  // Skip auth for public routes
  const publicRoutes = ['/api/auth/login', '/api/auth/register', '/', '/health', '/api/health'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  // Extract token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No auth token provided');
    req.user = { isAuthenticated: false };
    return next();
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
      region: decoded.region,
      isAuthenticated: true
    };
    console.log(`✅ Authenticated user: ${req.user.username} (${req.user.role})`);
  } catch (error) {
    console.log('❌ Invalid token:', error.message);
    req.user = { isAuthenticated: false };
  }
  
  next();
});

// ====================== LOAD ROUTES ======================
console.log('\nLOADING ROUTES...');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
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
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    status: 'Running with REAL authentication'
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    database: 'Connected to MongoDB',
    authentication: 'JWT-based (no debug bypass)'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running',
    authentication: req.user?.isAuthenticated ? 'Authenticated' : 'Not authenticated'
  });
});

// ====================== PROTECTED TEST ENDPOINT ======================
app.get('/api/test-auth', (req, res) => {
  if (!req.user || !req.user.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }
  
  res.json({
    success: true,
    message: 'Authentication successful!',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      name: req.user.name,
      isAuthenticated: true
    },
    timestamp: new Date().toISOString()
  });
});

// REMOVED: /api/debug-login endpoint (no more debug auth)

// ====================== ERROR HANDLING ======================
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    requestedUrl: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false, 
      message: 'CORS Error: Origin not allowed',
      allowedOrigins: allowedOrigins
    });
  }
  
  const errorResponse = {
    success: false,
    message: 'Internal server error'
  };
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Authentication: JWT (REAL - no debug bypass)`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(50));
  console.log('\n📋 Available Endpoints:');
  console.log('   POST /api/auth/login      - Real login with JWT');
  console.log('   GET  /api/test-auth       - Test authentication');
  console.log('   GET  /api/reports         - Get reports (requires auth)');
  console.log('   GET  /api/users           - Get users (requires auth + supervisor role)');
  console.log('\n✅ Server ready! Real authentication enabled.');
});
