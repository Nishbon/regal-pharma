const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medical-reporting-system-secret-key-2023';

// ====================== LOGIN ENDPOINT ======================
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body.username);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Find user (case-insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }, 
      is_active: true 
    });
    
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`❌ Wrong password for: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Create JWT token - Use _id
    const token = jwt.sign(
      { 
        _id: user._id.toString(),
        username: user.username, 
        role: user.role,
        name: user.name,
        email: user.email,
        region: user.region
      }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Login successful: ${user.username} (${user.role})`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          region: user.region,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ====================== LOGOUT ENDPOINT ======================
router.post('/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logout successful' 
  });
});

// ====================== TEST ENDPOINT ======================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working',
    endpoints: [
      'POST /login',
      'POST /logout'
    ]
  });
});

module.exports = router;
