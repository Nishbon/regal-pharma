const express = require('express');
const { body, validationResult } = require('express-validator');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Submit daily report
router.post('/daily', [
  body('report_date').isISO8601().withMessage('Valid date is required'),
  body('region').notEmpty().withMessage('Region is required'),
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary too long')
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

    const {
      report_date,
      region,
      dentists = 0,
      physiotherapists = 0,
      gynecologists = 0,
      internists = 0,
      general_practitioners = 0,
      pediatricians = 0,
      dermatologists = 0,
      pharmacies = 0,
      dispensaries = 0,
      orders_count = 0,
      orders_value = 0,
      summary = ''
    } = req.body;

    // Check if report already exists for this date
    const existingReport = await DailyReport.findOne({
      user_id: req.user.id,
      report_date: new Date(report_date)
    });

    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        message: 'Report already submitted for this date' 
      });
    }

    // Create new report
    const report = new DailyReport({
      user_id: req.user.id,
      report_date: new Date(report_date),
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
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: { reportId: report._id }
    });
  } catch (error) {
    console.error('Submit report error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Report already submitted for this date' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save report' 
    });
  }
});

// Get user's reports with pagination (FOR MEDREP REPORTS PAGE)
router.get('/my-reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get reports with pagination
    const reports = await DailyReport.find({ user_id: req.user.id })
      .sort({ report_date: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await DailyReport.countDocuments({ user_id: req.user.id });

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('user_id', 'name username role'); // Populate user details

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    // Check authorization: user can access their own reports, supervisor can access all
    const canAccess = report.user_id._id.toString() === req.user.id || 
                     req.user.role === 'supervisor';

    if (!canAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this report' 
      });
    }

    // Format response to match expected structure
    const reportData = {
      ...report.toObject(),
      user_name: report.user_id.name
    };

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Update report
router.put('/:id', [
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary too long')
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

    const {
      dentists, physiotherapists, gynecologists, internists,
      general_practitioners, pediatricians, dermatologists,
      pharmacies, dispensaries, orders_count, orders_value, summary
    } = req.body;

    // Find report and verify ownership
    const report = await DailyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    // Check authorization
    const canUpdate = report.user_id.toString() === req.user.id || 
                     req.user.role === 'supervisor';

    if (!canUpdate) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this report' 
      });
    }

    // Update report fields
    const updateData = {
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
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedReport = await DailyReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: updatedReport
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update report' 
    });
  }
});

module.exports = router;