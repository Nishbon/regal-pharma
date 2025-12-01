const express = require('express');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
// REMOVE THIS LINE: const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Temporary bypass middleware - ADD THIS
const bypassAuth = (req, res, next) => {
  console.log('🔓 Bypassing auth for analytics route');
  
  // Extract user info from token if available
  const authHeader = req.headers.authorization;
  let userRole = 'medrep';
  let username = 'test';
  let userId = 'user-test';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    console.log('📝 Token received:', token.substring(0, 30) + '...');
    
    if (token.includes('debug-token-')) {
      const parts = token.split('-');
      username = parts.length >= 4 ? parts[3] : 'test';
      userId = `user-${username}`;
      userRole = username === 'admin' ? 'supervisor' : 'medrep';
    } else if (token.includes('debug-signature')) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          username = payload.username || 'test';
          userId = payload.userId || `user-${username}`;
          userRole = payload.role || 'medrep';
        }
      } catch (e) {
        console.log('Could not parse JWT token');
      }
    }
  }
  
  // Set user on request object
  req.user = {
    id: userId,
    username: username,
    role: userRole,
    name: username === 'admin' ? 'Admin User' : 
          username === 'bonte' ? 'Bonte' : 
          username === 'john' ? 'John Doe' : 'Test User'
  };
  
  console.log(`✅ User set: ${username} (${userRole})`);
  next();
};

// Apply bypassAuth to ALL routes in this file
router.use(bypassAuth);

// Get weekly stats for user (FOR MEDREP DASHBOARD)
router.get('/weekly', async (req, res) => {
  try {
    console.log('📊 Weekly stats requested by:', req.user.username);
    
    // For testing, return mock data
    const mockWeeklyStats = [
      {
        report_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        total_doctors: 8,
        total_pharmacies: 3,
        total_dispensaries: 2,
        total_orders: 5,
        total_value: 4500
      },
      {
        report_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        total_doctors: 6,
        total_pharmacies: 4,
        total_dispensaries: 1,
        total_orders: 3,
        total_value: 3200
      },
      // Add more mock data as needed
    ];
    
    res.json({
      success: true,
      data: mockWeeklyStats,
      user: req.user
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get monthly stats for user (FOR MEDREP ANALYTICS)
router.get('/monthly', async (req, res) => {
  try {
    console.log('📈 Monthly stats requested by:', req.user.username);
    
    // Mock monthly data
    const mockMonthlyStats = [
      {
        month: '2024-01',
        total_doctors: 45,
        total_pharmacies: 22,
        total_dispensaries: 15,
        total_orders: 38,
        total_value: 28500
      },
      {
        month: '2023-12',
        total_doctors: 42,
        total_pharmacies: 20,
        total_dispensaries: 12,
        total_orders: 35,
        total_value: 26500
      },
    ];
    
    res.json({
      success: true,
      data: mockMonthlyStats,
      user: req.user
    });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error'
    });
  }
});

// Supervisor analytics - team performance
// REMOVED: requireRole(['supervisor'])
router.get('/team-performance', async (req, res) => {
  try {
    console.log('👥 Team performance requested by:', req.user.username);
    
    // Allow access to everyone for testing
    // In production, you'd check: if (req.user.role !== 'supervisor') return res.status(403)...
    
    const mockTeamPerformance = [
      {
        user_id: 'user-bonte',
        user_name: 'Bonte',
        region: 'North',
        reports_count: 15,
        total_doctors: 45,
        total_pharmacies: 22,
        total_dispensaries: 15,
        total_orders: 38,
        total_value: 28500
      },
      {
        user_id: 'user-john',
        user_name: 'John Doe',
        region: 'South',
        reports_count: 12,
        total_doctors: 38,
        total_pharmacies: 18,
        total_dispensaries: 10,
        total_orders: 28,
        total_value: 22000
      },
    ];
    
    res.json({
      success: true,
      data: mockTeamPerformance,
      requested_by: req.user.username,
      note: 'Auth bypassed for testing'
    });
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error'
    });
  }
});

// Region-wise analytics
// REMOVED: requireRole(['supervisor'])
router.get('/region-performance', async (req, res) => {
  try {
    console.log('🗺️ Region performance requested by:', req.user.username);
    
    const mockRegionPerformance = [
      {
        region: 'North',
        active_reps: 3,
        total_doctors: 120,
        total_pharmacies: 45,
        total_dispensaries: 28,
        total_orders: 95,
        total_value: 85000
      },
      {
        region: 'South',
        active_reps: 2,
        total_doctors: 85,
        total_pharmacies: 32,
        total_dispensaries: 20,
        total_orders: 68,
        total_value: 62000
      },
    ];
    
    res.json({
      success: true,
      data: mockRegionPerformance,
      requested_by: req.user.username
    });
  } catch (error) {
    console.error('Region performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error'
    });
  }
});

// Add a simple test endpoint
router.get('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'Analytics API is working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
