const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'medical-reporting-system-secret-key-2023';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    try {
      console.log('🔑 Decoded JWT token:', decoded);
      
      // Your login route stores user data with _id field
      const userId = decoded._id; // This is what your login route stores
      
      if (!userId) {
        console.error('❌ No _id found in JWT token');
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid token format - no user ID found' 
        });
      }

      console.log('🔍 Looking for user in database with ID:', userId);
      
      // Find user in database
      const user = await User.findOne({ 
        _id: userId,
        is_active: { $ne: false }
      }).select('-password');

      if (!user) {
        console.error('❌ User not found in database with ID:', userId);
        return res.status(403).json({ 
          success: false, 
          message: 'User not found or account is inactive' 
        });
      }
      
      console.log('✅ User found:', user.username, user.role);
      
      // Convert to plain object
      const userObj = user.toObject();
      
      // CRITICAL: Ensure _id is properly set (it should already be, but double-check)
      console.log('👤 User object before setting req.user:', {
        _id: userObj._id,
        id: userObj.id,
        username: userObj.username,
        role: userObj.role
      });
      
      // Set on request
      req.user = userObj;
      
      console.log('📋 req.user set with:', {
        _id: req.user._id,
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
      
      next();
    } catch (error) {
      console.error('❌ Auth middleware error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error during authentication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
