const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Find user in MongoDB (case-insensitive search)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }, 
      is_active: true 
    });
    
    if (!user) {
      console.log(`❌ Login failed: User "${username}" not found`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`❌ Login failed: Incorrect password for "${username}"`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create JWT token with more user info
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        username: user.username, 
        role: user.role,
        name: user.name,
        email: user.email,
        region: user.region
      }, 
      process.env.JWT_SECRET, // Use from environment variable
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
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register new user (supervisor/admin only)
router.post('/register', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['medrep', 'supervisor', 'admin']).withMessage('Invalid role'),
  body('region').optional().trim()
], async (req, res) => {
  try {
    // Check if requester is supervisor/admin (from auth middleware)
    if (!req.user || !req.user.isAuthenticated || 
        (req.user.role !== 'supervisor' && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only supervisors/admins can register new users'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password, name, email, role, region } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      email,
      role,
      region: region || 'General',
      is_active: true,
      createdBy: req.user.id // Track who created this user
    });

    await newUser.save();

    console.log(`✅ New user registered: ${username} (${role}) by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          region: newUser.region,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.user || !req.user.isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Fetch fresh user data from database
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logout successful' 
  });
});

module.exports = router;
