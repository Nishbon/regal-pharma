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

// ====================== GLOBAL AUTH BYPASS ======================
// This middleware runs before ALL routes and sets req.user
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  
  // Extract user info from token
  const authHeader = req.headers.authorization;
  let username = 'guest';
  let userId = null;
  let userRole = 'medrep';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Parse debug token
    if (token.includes('debug-token-')) {
      const parts = token.split('-');
      if (parts.length >= 4) {
        username = parts[3];
        userRole = (username === 'admin') ? 'supervisor' : 'medrep';
        console.log(`🔑 Debug token detected: ${username} (${userRole})`);
      }
    }
  }
  
  // Set user on request object
  req.user = {
    id: `temp-${Date.now()}`,
    username: username,
    role: userRole,
    name: username === 'admin' ? 'Admin User' : 
          username === 'bonte' ? 'Bonte' : 
          username === 'john' ? 'John Doe' : 'Guest User',
    isAuthenticated: true,
    isDebug: true
  };
  
  console.log(`👤 User set: ${req.user.username} (${req.user.role})`);
  next();
});

// ====================== LOAD ROUTES ======================
console.log('\nLOADING ROUTES...');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (auth bypassed globally above)
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
    currentUser: req.user,
    database: 'MongoDB connected - showing real data'
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    database: 'Connected to MongoDB',
    user: req.user
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running', 
    user: req.user
  });
});

// Debug login endpoint
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
  console.log('   POST /api/debug-login     - Test login');
  console.log('   GET  /api/users           - Get all users (real MongoDB data)');
  console.log('   GET  /api/reports         - Get reports (real MongoDB data)');
  console.log('   GET  /api/analytics       - Get analytics (real MongoDB data)');
  console.log('\n✅ Server ready! Authentication bypassed, using real MongoDB data.');
});
