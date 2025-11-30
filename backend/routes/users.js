// backend/routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (supervisor only)
router.get('/', requireRole(['supervisor']), (req, res) => {
  const sql = `
    SELECT id, username, name, email, role, region, is_active, created_at 
    FROM users 
    ORDER BY name
  `;

  db.all(sql, [], (err, users) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({
      success: true,
      data: users
    });
  });
});

// Get user by ID
router.get('/:id', requireRole(['supervisor']), (req, res) => {
  const sql = `
    SELECT id, username, name, email, role, region, is_active, created_at 
    FROM users 
    WHERE id = ?
  `;

  db.get(sql, [req.params.id], (err, user) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

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
  });
});

// Create new user (supervisor only)
router.post('/', [
  requireRole(['supervisor']),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['medrep', 'supervisor']).withMessage('Role must be medrep or supervisor')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }

  const { username, password, name, email, role, region } = req.body;

  // Check if username already exists
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const sql = `
      INSERT INTO users (username, password, name, email, role, region) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [username, hashedPassword, name, email, role, region], function(err) {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create user' 
        });
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { userId: this.lastID }
      });
    });
  });
});

// Update user
router.put('/:id', [
  requireRole(['supervisor']),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }

  const { name, email, role, region, is_active } = req.body;

  const sql = `
    UPDATE users 
    SET name = ?, email = ?, role = ?, region = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;

  db.run(sql, [name, email, role, region, is_active, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update user' 
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  });
});

// Delete user (soft delete)
router.delete('/:id', requireRole(['supervisor']), (req, res) => {
  const sql = 'UPDATE users SET is_active = 0 WHERE id = ?';

  db.run(sql, [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user' 
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  });
});

module.exports = router;