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

// ====================== TEMPORARY AUTH BYPASS ======================
console.log('⚠️  WARNING: Authentication bypass is ENABLED for testing');
console.log('   All protected routes will accept requests without valid tokens\n');

// Simple middleware to bypass authentication for ALL protected routes
const bypassAuth = (req, res, next) => {
  // Extract username from token if present (for role detection)
  const authHeader = req.headers.authorization;
  let userRole = 'medrep';
  let username = 'guest';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Try to extract username from debug token
    if (token.includes('debug-token-')) {
      const parts = token.split('-');
      if (parts.length >= 4) {
        username = parts[3];
        // Set role based on username
        userRole = (username === 'admin') ? 'supervisor' : 'medrep';
      }
    } else if (token.includes('debug-signature')) {
      // For JWT-like debug tokens
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          username = payload.username || 'debug-user';
          userRole = payload.role || 'medrep';
        }
      } catch (err) {
        // If can't parse, use defaults
      }
    }
  }
  
  // Set user object for the request
  req.user = {
    id: `temp-${Date.now()}`,
    username: username,
    role: userRole,
    name: username === 'admin' ? 'Admin User' : 
          username === 'bonte' ? 'Bonte' : 
          username === 'john' ? 'John Doe' : 'Test User',
    email: `${username}@regalpharma.com`,
    region: 'Test Region',
    isDebug: true
  };
  
  console.log(`✅ Auth bypass: ${req.method} ${req.originalUrl} - User: ${username} (${userRole})`);
  next();
};

// Apply bypass auth to all protected routes
app.use('/api/reports', bypassAuth, reportRoutes);
app.use('/api/analytics', bypassAuth, analyticsRoutes);
app.use('/api/users', bypassAuth, userRoutes);

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
      ],
      note: '⚠️ Authentication is temporarily bypassed for testing'
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
    uptime: process.uptime(),
    authStatus: 'BYPASSED (Testing Mode)'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running', 
    timestamp: new Date().toISOString(),
    authMode: 'Debug - No authentication required'
  });
});

// Debug endpoints (for testing only)
app.post('/api/debug-login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Debug login attempt:', username);
  
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
    // Create a JWT-like token (will be accepted by bypass middleware)
    const payload = {
      userId: `user-${username}`,
      username: username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
    };
    
    // Create JWT format token
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const token = `${header}.${payloadEncoded}.debug-signature`;
    
    console.log(`✅ Debug login successful for ${username} (Role: ${user.role})`);
    
    res.json({
      success: true,
      message: 'Login successful (debug mode)',
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
      availableUsers: Object.keys(testUsers),
      testCredentials: [
        { username: 'admin', password: 'admin123', role: 'supervisor' },
        { username: 'bonte', password: 'bonte123', role: 'medrep' },
        { username: 'john', password: 'john123', role: 'medrep' }
      ]
    });
  }
});

// Test endpoint to verify auth bypass
app.get('/api/debug-auth-test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth test endpoint',
    user: req.user || { message: 'No user object found' },
    headers: {
      authorization: req.headers.authorization || 'No auth header'
    },
    note: 'This endpoint should work without authentication'
  });
});

// Test protected endpoint simulation
app.get('/api/debug-protected-test', bypassAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Protected endpoint simulation',
    user: req.user,
    access: 'Granted via auth bypass',
    dashboardRedirect: req.user.role === 'supervisor' ? 'Will go to Supervisor Dashboard' : 'Will go to MedRep Dashboard'
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
  console.log('\n⚠️  IMPORTANT: AUTHENTICATION IS BYPASSED');
  console.log('   All protected routes will accept requests without valid tokens');
  console.log('   Use for testing dashboard routing only\n');
  console.log('📋 Available Endpoints:');
  console.log('   GET  /                         - Server info');
  console.log('   GET  /health                   - Health check');
  console.log('   POST /api/debug-login          - Test login');
  console.log('   GET  /api/debug-auth-test      - Auth test');
  console.log('   POST /api/reports/daily        - Submit report (bypassed auth)');
  console.log('   GET  /api/reports/my-reports   - View reports (bypassed auth)');
  console.log('\n👤 Test Users:');
  console.log('   admin / admin123   → Supervisor Dashboard');
  console.log('   bonte / bonte123   → MedRep Dashboard');
  console.log('   john  / john123    → MedRep Dashboard');
  console.log('\n✅ Server ready! Auth bypass enabled for testing.');
});
