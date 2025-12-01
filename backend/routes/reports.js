// backend/routes/reports.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Submit daily report - WITH AUTHENTICATION
router.post('/daily', authenticateToken, [
  body('report_date').isISO8601().withMessage('Valid date is required'),
  body('region').notEmpty().withMessage('Region is required'),
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary too long')
], async (req, res) => {
  try {
    // Debug logging
    console.log('🔐 User from token:', req.user);
    console.log('📝 Request body:', req.body);
    console.log('📅 User ID for report:', req.user._id);

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

    // IMPORTANT: Use req.user._id (MongoDB document)
    const userId = req.user._id;
    
    // Check if report already exists for this date
    const existingReport = await DailyReport.findOne({
      user_id: userId,
      report_date: new Date(report_date)
    });

    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        message: 'Report already submitted for this date' 
      });
    }

    // Create new report - FIXED: Use userId (MongoDB ObjectId)
    const report = new DailyReport({
      user_id: userId, // This is MongoDB ObjectId
      report_date: new Date(report_date),
      region,
      dentists: parseInt(dentists) || 0,
      physiotherapists: parseInt(physiotherapists) || 0,
      gynecologists: parseInt(gynecologists) || 0,
      internists: parseInt(internists) || 0,
      general_practitioners: parseInt(general_practitioners) || 0,
      pediatricians: parseInt(pediatricians) || 0,
      dermatologists: parseInt(dermatologists) || 0,
      pharmacies: parseInt(pharmacies) || 0,
      dispensaries: parseInt(dispensaries) || 0,
      orders_count: parseInt(orders_count) || 0,
      orders_value: parseInt(orders_value) || 0,
      summary: summary || ''
    });

    await report.save();
    console.log('✅ Report saved successfully:', report._id);

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: { 
        reportId: report._id,
        report_date: report.report_date,
        total_doctors: report.total_doctors,
        total_visits: report.total_pharmacy_visits + report.total_doctors
      }
    });
  } catch (error) {
    console.error('❌ Submit report error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Report already submitted for this date' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: messages 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's reports with pagination (FOR MEDREP REPORTS PAGE)
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get reports with pagination
    const reports = await DailyReport.find({ user_id: req.user._id })
      .sort({ report_date: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await DailyReport.countDocuments({ user_id: req.user._id });

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
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('user_id', 'name username role region');

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    // Check authorization: user can access their own reports, supervisor can access all
    const canAccess = report.user_id._id.toString() === req.user._id.toString() || 
                     req.user.role === 'supervisor';

    if (!canAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this report' 
      });
    }

    // Format response
    const reportData = report.toObject();
    reportData.user_name = report.user_id.name;

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
router.put('/:id', authenticateToken, [
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

    // Find report
    const report = await DailyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    // Check authorization
    const canUpdate = report.user_id.toString() === req.user._id.toString() || 
                     req.user.role === 'supervisor';

    if (!canUpdate) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this report' 
      });
    }

    // Update report fields
    const updateData = {};
    
    // Only update fields that are provided
    const fields = [
      'dentists', 'physiotherapists', 'gynecologists', 'internists',
      'general_practitioners', 'pediatricians', 'dermatologists',
      'pharmacies', 'dispensaries', 'orders_count', 'orders_value', 'summary'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
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
