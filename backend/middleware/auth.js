// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

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

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Verify user still exists and is active
    db.get('SELECT id, username, name, role, region FROM users WHERE id = ? AND is_active = 1', 
      [user.id], (err, dbUser) => {
        if (err || !dbUser) {
          return res.status(403).json({ 
            success: false, 
            message: 'User not found or inactive' 
          });
        }
        
        req.user = dbUser;
        next();
      });
  });
};

// ADD THIS MISSING FUNCTION:
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