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
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    try {
      // Look for _id in decoded token, not id
      const userId = decoded._id || decoded.id; // Try both for compatibility
      
      if (!userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid token format' 
        });
      }

      // Verify user still exists and is active in MongoDB
      const user = await User.findOne({ 
        _id: userId,  // ← Using userId which could be _id or id
        is_active: true 
      }).select('-password');

      if (!user) {
        return res.status(403).json({ 
          success: false, 
          message: 'User not found or inactive' 
        });
      }
      
      // Convert MongoDB document to plain object and add to request
      req.user = user.toObject();
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error during authentication' 
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
