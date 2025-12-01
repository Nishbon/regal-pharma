const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Get all users - FETCH REAL DATA
router.get('/', async (req, res) => {
  try {
    console.log('👥 Fetching ALL users from MongoDB');
    
    // Fetch real users from database
    const users = await User.find({})
      .select('-password') // Exclude password
      .sort({ name: 1 })
      .lean();
    
    console.log(`✅ Found ${users.length} users in database`);
    
    res.json({
      success: true,
      data: users,
      count: users.length,
      requested_by: req.user.username
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: error.message 
    });
  }
});

// Get current user profile
router.get('/profile/me', async (req, res) => {
  try {
    // Try to find user in database by username
    const dbUser = await User.findOne({ username: req.user.username })
      .select('-password')
      .lean();
    
    if (dbUser) {
      res.json({
        success: true,
        data: dbUser,
        source: 'MongoDB'
      });
    } else {
      // Return debug user if not in database
      res.json({
        success: true,
        data: req.user,
        source: 'Debug user'
      });
    }
  } catch (error) {
    res.json({
      success: true,
      data: req.user,
      source: 'Debug (fallback)'
    });
  }
});

// Get active medreps only
router.get('/active-medreps', async (req, res) => {
  try {
    console.log('👥 Fetching active medreps from MongoDB');
    
    const medreps = await User.find({ 
      role: 'medrep',
      is_active: true 
    })
    .select('name username email region role createdAt')
    .sort({ name: 1 })
    .lean();
    
    console.log(`✅ Found ${medreps.length} active medreps`);
    
    res.json({
      success: true,
      data: medreps,
      count: medreps.length
    });
  } catch (error) {
    console.error('Error fetching medreps:', error);
    res.status(500).json({
      success: false,
      message: 'Database error'
    });
  }
});

// Get supervisors only
router.get('/supervisors', async (req, res) => {
  try {
    const supervisors = await User.find({ 
      role: 'supervisor',
      is_active: true 
    })
    .select('name username email region')
    .lean();
    
    res.json({
      success: true,
      data: supervisors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error'
    });
  }
});

module.exports = router;
