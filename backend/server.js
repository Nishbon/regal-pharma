require('dotenv').config(); // Add this at the very top
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

const { authenticateToken } = require('./middleware/auth');

const app = express();

// Connect to MongoDB
connectDB();

// DEBUG: Comprehensive logging
console.log('\n' + '='.repeat(50));
console.log('DEBUG: STARTING ROUTE LOADING PROCESS');
console.log('='.repeat(50));

// Security middleware
app.use(helmet());
app.use(compression());

// Morgan logging based on environment
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ====================== IMPORTANT FIX ======================
// CORS configuration for Render
const allowedOrigins = [
  'https://regal-pharma-frontend.onrender.com',  // Your Render frontend
  'http://localhost:5173',  // Vite default
  'http://localhost:3000',  // Create React App default
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
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

// Handle preflight requests
app.options('*', cors(corsOptions));
// ====================== END FIX ======================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Load routes with individual try/catch
console.log('\n3. Loading routes individually...');

let routesLoaded = 0;
const totalRoutes = 4;

try {
  console.log('   - Loading auth routes...');
  app.use('/api/auth', authRoutes);
  console.log('   ✅ Auth routes loaded');
  routesLoaded++;
} catch (error) {
  console.error('   ❌ Auth routes failed:', error.message);
  console.error('   Stack:', error.stack);
}

try {
  console.log('   - Loading report routes...');
  app.use('/api/reports', authenticateToken, reportRoutes);
  console.log('   ✅ Report routes loaded');
  routesLoaded++;
} catch (error) {
  console.error('   ❌ Report routes failed:', error.message);
  console.error('   Stack:', error.stack);
}

try {
  console.log('   - Loading analytics routes...');
  app.use('/api/analytics', authenticateToken, analyticsRoutes);
  console.log('   ✅ Analytics routes loaded');
  routesLoaded++;
} catch (error) {
  console.error('   ❌ Analytics routes failed:', error.message);
  console.error('   Stack:', error.stack);
}

try {
  console.log('   - Loading user routes...');
  app.use('/api/users', authenticateToken, userRoutes);
  console.log('   ✅ User routes loaded');
  routesLoaded++;
} catch (error) {
  console.error('   ❌ User routes failed:', error.message);
  console.error('   Stack:', error.stack);
}

console.log('\n' + '='.repeat(50));
console.log(`DEBUG SUMMARY: ${routesLoaded}/${totalRoutes} routes loaded`);
console.log('='.repeat(50) + '\n');

// ====================== ADD THESE ENDPOINTS ======================
// 1. Root endpoint (for Render health checks)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Regal Pharma API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 2. Public health check (for Render monitoring)
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    routesLoaded: routesLoaded,
    corsAllowedOrigins: allowedOrigins
  });
});

// 3. API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Server is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    routesLoaded: routesLoaded
  });
});

// 4. Debug login endpoint (temporary for testing)
app.post('/api/debug-login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Debug login attempt:', { username, password });
  
  // Test users for development
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
    // Generate a simple token (in production, use JWT)
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

// 5. Simple debug route
app.get('/api/debug-simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple debug route works',
    timestamp: new Date().toISOString(),
    routesLoaded: `${routesLoaded}/${totalRoutes}`,
    cors: 'enabled',
    requestHeaders: req.headers
  });
});
// ====================== END NEW ENDPOINTS ======================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false, 
      message: 'CORS Error: Origin not allowed',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: err.message,
      stack: err.stack 
    });
  }
});

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
      'POST /api/debug-login',
      'GET  /api/debug-simple',
      'POST /api/auth/login',
      'GET  /api/auth/profile',
      'POST /api/reports/daily',
      'GET  /api/reports/my-reports'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 MongoDB Connected: ${process.env.MONGODB_URI ? 'Yes' : 'No'}`);
  console.log(`🔑 JWT_SECRET set: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
  console.log('\n📋 Allowed CORS Origins:');
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log('\n🔍 Test Endpoints:');
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Debug Login:  http://localhost:${PORT}/api/debug-login`);
  console.log(`   Simple Debug: http://localhost:${PORT}/api/debug-simple`);
  console.log('\n✅ Server ready!');
});