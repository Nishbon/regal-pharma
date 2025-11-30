const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Submit daily report
router.post('/daily', [
  body('report_date').isDate().withMessage('Valid date is required'),
  body('region').notEmpty().withMessage('Region is required'),
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary too long')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }

  const {
    report_date,
    region,
    dentists,
    physiotherapists,
    gynecologists,
    internists,
    general_practitioners,
    pediatricians,
    dermatologists,
    pharmacies,
    dispensaries,
    orders_count,
    orders_value,
    summary
  } = req.body;

  // Check if report already exists for this date
  db.get(
    'SELECT id FROM daily_reports WHERE user_id = ? AND report_date = ?',
    [req.user.id, report_date],
    (err, existingReport) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }

      if (existingReport) {
        return res.status(400).json({ 
          success: false, 
          message: 'Report already submitted for this date' 
        });
      }

      const sql = `INSERT INTO daily_reports (
        user_id, report_date, region, dentists, physiotherapists, gynecologists,
        internists, general_practitioners, pediatricians, dermatologists,
        pharmacies, dispensaries, orders_count, orders_value, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.run(sql, [
        req.user.id, report_date, region,
        dentists || 0, physiotherapists || 0, gynecologists || 0,
        internists || 0, general_practitioners || 0, pediatricians || 0,
        dermatologists || 0, pharmacies || 0, dispensaries || 0,
        orders_count || 0, orders_value || 0, summary || ''
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to save report' 
          });
        }

        res.status(201).json({
          success: true,
          message: 'Report submitted successfully',
          data: { reportId: this.lastID }
        });
      });
    }
  );
});

// Get user's reports with pagination (FOR MEDREP REPORTS PAGE)
router.get('/my-reports', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT * FROM daily_reports 
    WHERE user_id = ? 
    ORDER BY report_date DESC 
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) as total FROM daily_reports WHERE user_id = ?`;

  db.get(countSql, [req.user.id], (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    db.all(sql, [req.user.id, limit, offset], (err, reports) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            page,
            limit,
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        }
      });
    });
  });
});

// Get report by ID
router.get('/:id', (req, res) => {
  const sql = `
    SELECT dr.*, u.name as user_name 
    FROM daily_reports dr 
    JOIN users u ON dr.user_id = u.id 
    WHERE dr.id = ? AND (dr.user_id = ? OR ? = 'supervisor')
  `;

  db.get(sql, [req.params.id, req.user.id, req.user.role], (err, report) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    res.json({
      success: true,
      data: report
    });
  });
});

// Update report
router.put('/:id', [
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary too long')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }

  const {
    dentists, physiotherapists, gynecologists, internists,
    general_practitioners, pediatricians, dermatologists,
    pharmacies, dispensaries, orders_count, orders_value, summary
  } = req.body;

  // Verify report belongs to user
  db.get(
    'SELECT user_id FROM daily_reports WHERE id = ?',
    [req.params.id],
    (err, report) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }

      if (!report) {
        return res.status(404).json({ 
          success: false, 
          message: 'Report not found' 
        });
      }

      if (report.user_id !== req.user.id && req.user.role !== 'supervisor') {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to update this report' 
        });
      }

      const sql = `
        UPDATE daily_reports SET
          dentists = ?, physiotherapists = ?, gynecologists = ?,
          internists = ?, general_practitioners = ?, pediatricians = ?,
          dermatologists = ?, pharmacies = ?, dispensaries = ?,
          orders_count = ?, orders_value = ?, summary = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(sql, [
        dentists, physiotherapists, gynecologists,
        internists, general_practitioners, pediatricians,
        dermatologists, pharmacies, dispensaries,
        orders_count, orders_value, summary,
        req.params.id
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to update report' 
          });
        }

        res.json({
          success: true,
          message: 'Report updated successfully'
        });
      });
    }
  );
});

module.exports = router;