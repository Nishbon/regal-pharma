const express = require('express');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User'); // ADD THIS IMPORT
const router = express.Router();

// Get user's reports - FETCH REAL DATA
router.get('/my-reports', async (req, res) => {
  try {
    console.log(`📋 Fetching reports for: ${req.user.username}`);
    
    // Since we don't have real user IDs in debug mode, fetch all reports or filter by username
    let query = {};
    
    // If we have a username in the token, try to find user first
    if (req.user.username && req.user.username !== 'guest') {
      const user = await User.findOne({ username: req.user.username }).lean();
      if (user) {
        query.user_id = user._id;
      }
    }
    
    const reports = await DailyReport.find(query)
      .sort({ report_date: -1 })
      .limit(20)
      .lean();
    
    console.log(`✅ Found ${reports.length} reports in database`);
    
    res.json({
      success: true,
      data: reports,
      count: reports.length,
      user: req.user.username
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Database error'
    });
  }
});

// Get all reports (for supervisors)
router.get('/all', async (req, res) => {
  try {
    const reports = await DailyReport.find({})
      .populate('user_id', 'name username region')
      .sort({ report_date: -1 })
      .limit(50)
      .lean();
    
    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error'
    });
  }
});

// Add more routes as needed
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Reports API is working',
    user: req.user
  });
});

// CRITICAL: Add this export statement
module.exports = router;
