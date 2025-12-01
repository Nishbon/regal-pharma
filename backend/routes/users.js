// backend/routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
// REMOVE THIS LINE: const { requireRole } = require('../middleware/auth');

const router = express.Router();

// ====================== TEMPORARY BYPASS MIDDLEWARE ======================
const bypassAuth = (req, res, next) => {
  console.log('🔓 Bypassing auth for users route');
  
  // Extract user info from token
  const authHeader = req.headers.authorization;
  let userRole = 'medrep';
  let username = 'test';
  let userId = 'user-test';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
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
        // Continue with defaults
      }
    }
  }
  
  // Mock MongoDB ObjectId
  const mockObjectId = {
    toString: () => userId,
    _id: userId
  };
  
  // Set user on request object
  req.user = {
    _id: mockObjectId,
    id: userId,
    username: username,
    role: userRole,
    name: username === 'admin' ? 'Admin User' : 
          username === 'bonte' ? 'Bonte' : 
          username === 'john' ? 'John Doe' : 'Test User'
  };
  
  console.log(`✅ Users user set: ${username} (${userRole})`);
  next();
};

// Apply bypassAuth to ALL routes
router.use(bypassAuth);

// Get all users (supervisor only) - BYPASSED
router.get('/', async (req, res) => {
  try {
    console.log('👥 Fetching all users requested by:', req.user.username);
    
    // Mock users data for testing
    const mockUsers = [
      {
        _id: 'user-1',
        username: 'admin',
        name: 'Admin User',
        email: 'admin@regalpharma.com',
        role: 'supervisor',
        region: 'HQ',
        is_active: true,
        createdAt: new Date('2024-01-01')
      },
      {
        _id: 'user-2',
        username: 'bonte',
        name: 'Bonte',
        email: 'bonte@regalpharma.com',
        role: 'medrep',
        region: 'North',
        is_active: true,
        createdAt: new Date('2024-01-02')
      },
      {
        _id: 'user-3',
        username: 'john',
        name: 'John Doe',
        email: 'john@regalpharma.com',
        role: 'medrep',
        region: 'South',
        is_active: true,
        createdAt: new Date('2024-01-03')
      },
      {
        _id: 'user-4',
        username: 'sarah',
        name: 'Sarah Smith',
        email: 'sarah@regalpharma.com',
        role: 'medrep',
        region: 'East',
        is_active: true,
        createdAt: new Date('2024-01-04')
      }
    ];

    // Filter out password field
    const usersWithoutPassword = mockUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      success: true,
      data: usersWithoutPassword,
      requested_by: req.user.username,
      note: 'Auth bypassed - returning mock data'
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user by ID - BYPASSED
router.get('/:id', async (req, res) => {
  try {
    console.log('👤 Fetching user:', req.params.id);
    
    // Mock user data
    const mockUser = {
      _id: req.params.id,
      username: req.params.id.includes('admin') ? 'admin' : 
               req.params.id.includes('bonte') ? 'bonte' : 
               req.params.id.includes('john') ? 'john' : 'user',
      name: req.params.id.includes('admin') ? 'Admin User' : 
            req.params.id.includes('bonte') ? 'Bonte' : 
            req.params.id.includes('john') ? 'John Doe' : 'Test User',
      email: `${req.params.id.includes('admin') ? 'admin' : 
              req.params.id.includes('bonte') ? 'bonte' : 
              req.params.id.includes('john') ? 'john' : 'test'}@regalpharma.com`,
      role: req.params.id.includes('admin') ? 'supervisor' : 'medrep',
      region: req.params.id.includes('admin') ? 'HQ' : 
              req.params.id.includes('bonte') ? 'North' : 
              req.params.id.includes('john') ? 'South' : 'Test Region',
      is_active: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15')
    };

    if (!mockUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Remove password field
    const { password, ...userWithoutPassword } = mockUser;

    res.json({
      success: true,
      data: userWithoutPassword,
      note: 'Mock data - database bypassed'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Create new user - BYPASSED
router.post('/', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['medrep', 'supervisor']).withMessage('Role must be medrep or supervisor')
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

    const { username, password, name, email, role, region } = req.body;

    console.log('➕ Creating new user:', username);

    // Mock response
    const mockUserId = `user-${Date.now()}-${username}`;

    res.status(201).json({
      success: true,
      message: 'User created successfully (Debug Mode)',
      data: { 
        userId: mockUserId,
        username: username,
        name: name,
        email: email,
        role: role,
        region: region
      },
      note: 'Database save bypassed for testing'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user - BYPASSED
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required')
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

    console.log('✏️ Updating user:', req.params.id);
    console.log('📝 Update data:', req.body);

    // Mock updated user
    const mockUpdatedUser = {
      _id: req.params.id,
      username: req.params.id.includes('admin') ? 'admin' : 'testuser',
      name: req.body.name || 'Updated User',
      email: req.body.email || 'updated@regalpharma.com',
      role: req.body.role || 'medrep',
      region: req.body.region || 'Updated Region',
      is_active: req.body.is_active !== undefined ? req.body.is_active : true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'User updated successfully (Debug Mode)',
      data: mockUpdatedUser,
      note: 'Database update bypassed for testing'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user' 
    });
  }
});

// Delete user (soft delete) - BYPASSED
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting user:', req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully (Debug Mode)',
      data: {
        userId: req.params.id,
        action: 'soft_delete',
        is_active: false
      },
      note: 'Database delete bypassed for testing'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user' 
    });
  }
});

// Test endpoint
router.get('/test/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Users API is working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Get current user profile
router.get('/profile/me', async (req, res) => {
  res.json({
    success: true,
    data: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
