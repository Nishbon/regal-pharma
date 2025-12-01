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

// Test if middleware loads
console.log('\n1. Testing middleware loading...');
try {
  const { authenticateToken, requireRole } = require('./middleware/auth');
  console.log('✅ Middleware loaded successfully');
} catch (error) {
  console.error('❌ Failed to load middleware:', error.message);
  console.error('Stack:', error.stack);
}

// Test if models load
console.log('\n2. Testing model loading...');
try {
  const User = require('./models/User');
  const DailyReport = require('./models/DailyReport');
  console.log('✅ Models loaded successfully');
} catch (error) {
  console.error('❌ Failed to load models:', error.message);
  console.error('Stack:', error.stack);
}

// Security middleware
app.use(helmet());
app.use(compression());

// Morgan logging based on environment
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

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

// Add a simple test route that bypasses everything
app.get('/api/debug-simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple debug route works',
    timestamp: new Date().toISOString(),
    routesLoaded: `${routesLoaded}/${totalRoutes}`
  });
});

// Simple test login (bypasses auth routes)
app.post('/api/debug-login', (req, res) => {
  const { username, password } = req.body;
  
  const testUsers = {
    'admin': { password: 'admin123', name: 'Admin', role: 'supervisor' },
    'bonte': { password: 'bonte123', name: 'Bonte', role: 'medrep' }
  };
  
  const user = testUsers[username];
  
  if (user && user.password === password) {
    res.json({
      success: true,
      message: 'Login successful (debug route)',
      token: 'debug-token-' + Date.now(),
      user: {
        username: username,
        name: user.name,
        role: user.role
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    routesLoaded: routesLoaded
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!',
      error: err.message,
      stack: err.stack 
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 MongoDB Connected: ${process.env.MONGODB_URI ? 'Yes' : 'No'}`);
  console.log(`🔑 JWT_SECRET set: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
});