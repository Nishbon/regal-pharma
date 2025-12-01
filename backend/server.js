require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

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

// ====================== LOAD ROUTES ======================
console.log('\nLOADING ROUTES...');

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (authentication handled in route files)
app.use('/api/reports', reportRoutes);        // Authentication handled in reports.js
app.use('/api/analytics', analyticsRoutes);   // Authentication handled in analytics.js
app.use('/api/users', userRoutes);           // Authentication handled in users.js

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
    endpoints: {
      public: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET  /health',
        'GET  /api/health',
        'POST /api/debug-login'
      ],
      protected: [
        'POST /api/reports/daily',
        'GET  /api/reports/my-reports',
        'GET  /api/analytics/weekly',
        'GET  /api/users'
      ]
    }
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running', 
    timestamp: new Date().toISOString()
  });
});

// Debug endpoints (for testing only)
app.post('/api/debug-login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Debug login:', username);
  
  const testUsers = {
    'admin': { 
      password: 'admin123', 
      name: 'Admin User', 
      role: 'supervisor',
      email: 'admin@regalpharma.com',
      region: 'HQ'
    },
    'bonte': { 
      password: 'bonte123', 
      name: 'Bonte', 
      role: 'medrep',
      email: 'bonte@regalpharma.com',
      region: 'North'
    },
    'john': { 
      password: 'john123', 
      name: 'John Doe', 
      role: 'medrep',
      email: 'john@regalpharma.com',
      region: 'South'
    }
  };
  
  const user = testUsers[username];
  
  if (user && user.password === password) {
    const token = `debug-token-${Date.now()}-${username}`;
    
    res.json({
      success: true,
      message: 'Login successful (debug route)',
      data: {
        token: token,
        user: {
          id: `user-${username}`,
          username: username,
          name: user.name,
          role: user.role,
          email: user.email,
          region: user.region,
          createdAt: new Date().toISOString()
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      availableUsers: Object.keys(testUsers)
    });
  }
});

app.get('/api/debug-simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple debug route works',
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
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(50));
  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /                    - Server info');
  console.log('   GET  /health              - Health check');
  console.log('   POST /api/debug-login     - Test login (username: bonte, password: bonte123)');
  console.log('   POST /api/auth/login      - Real login');
  console.log('   POST /api/reports/daily   - Submit daily report (requires auth)');
  console.log('\n✅ Server ready!');
});
