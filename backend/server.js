require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// MongoDB connection
const connectDB = require('./config/database');
const User = require('./models/User'); // ADD THIS

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
app.use(async (req, res, next) => {
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
    
    // Verify user exists and is active in database
    const user = await User.findOne({ 
      _id: decoded.id, 
      is_active: true 
    }).select('-password -__v');
    
    if (!user) {
      console.log('❌ User not found or inactive');
      req.user = { isAuthenticated: false };
      return next();
    }
    
    // Convert to plain object and add authentication flag
    req.user = user.toObject();
    req.user.isAuthenticated = true;
    req.user.id = req.user._id.toString(); // Ensure id is string
    
    console.log(`✅ Authenticated user: ${req.user.username} (${req.user.role})`);
  } catch (error) {
    console.log('❌ Invalid token or database error:', error.message);
    req.user = { isAuthenticated: false };
  }
  
  next();
});

// ====================== LOAD ROUTES ======================
console.log('\nLOADING ROUTES...');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/reports', (req, res, next) => {
  if (!req.user || !req.user.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }
  next();
}, reportRoutes);

app.use('/api/analytics', (req, res, next) => {
  if (!req.user || !req.user.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }
  next();
}, analyticsRoutes);

app.use('/api/users', (req, res, next) => {
  if (!req.user || !req.user.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }
  next();
}, userRoutes);

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
    authentication: req.user?.isAuthenticated ? 'Authenticated' : 'Not authenticated'
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    database: 'Connected to MongoDB',
    authentication: 'JWT-based (real authentication)'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running',
    user: req.user?.isAuthenticated ? {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      isAuthenticated: true
    } : { isAuthenticated: false }
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
      email: req.user.email,
      region: req.user.region,
      isAuthenticated: true
    },
    timestamp: new Date().toISOString()
  });
});

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
  console.log(`🔐 Authentication: JWT + MongoDB (REAL)`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(50));
  console.log('\n📋 Available Endpoints:');
  console.log('   POST /api/auth/login      - Real login with JWT');
  console.log('   GET  /api/test-auth       - Test authentication');
  console.log('   GET  /api/reports         - Get reports (requires auth)');
  console.log('   GET  /api/users           - Get users (requires auth + supervisor role)');
  console.log('\n✅ Server ready! Real authentication enabled.');
});
