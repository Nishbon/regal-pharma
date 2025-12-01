const express = require('express');
const { body, validationResult } = require('express-validator');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ====================== SUBMIT DAILY REPORT ======================
router.post('/daily', authenticateToken, [
  body('report_date').isISO8601().withMessage('Valid date is required'),
  body('region').notEmpty().trim().withMessage('Region is required'),
  body('dentists').optional().isInt({ min: 0 }).withMessage('Dentists must be a positive number'),
  body('physiotherapists').optional().isInt({ min: 0 }).withMessage('Physiotherapists must be a positive number'),
  body('gynecologists').optional().isInt({ min: 0 }).withMessage('Gynecologists must be a positive number'),
  body('internists').optional().isInt({ min: 0 }).withMessage('Internists must be a positive number'),
  body('general_practitioners').optional().isInt({ min: 0 }).withMessage('General practitioners must be a positive number'),
  body('pediatricians').optional().isInt({ min: 0 }).withMessage('Pediatricians must be a positive number'),
  body('dermatologists').optional().isInt({ min: 0 }).withMessage('Dermatologists must be a positive number'),
  body('pharmacies').optional().isInt({ min: 0 }).withMessage('Pharmacies must be a positive number'),
  body('dispensaries').optional().isInt({ min: 0 }).withMessage('Dispensaries must be a positive number'),
  body('orders_count').optional().isInt({ min: 0 }).withMessage('Orders count must be a positive number'),
  body('orders_value').optional().isFloat({ min: 0 }).withMessage('Orders value must be a positive number'),
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary cannot exceed 1000 characters')
], async (req, res) => {
  try {
    console.log('📝 Daily report submission started');
    console.log('👤 User from auth:', req.user);
    console.log('📦 Request body:', req.body);

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    // Extract data from request body with defaults
    const reportData = {
      report_date: req.body.report_date,
      region: req.body.region.trim(),
      dentists: parseInt(req.body.dentists) || 0,
      physiotherapists: parseInt(req.body.physiotherapists) || 0,
      gynecologists: parseInt(req.body.gynecologists) || 0,
      internists: parseInt(req.body.internists) || 0,
      general_practitioners: parseInt(req.body.general_practitioners) || 0,
      pediatricians: parseInt(req.body.pediatricians) || 0,
      dermatologists: parseInt(req.body.dermatologists) || 0,
      pharmacies: parseInt(req.body.pharmacies) || 0,
      dispensaries: parseInt(req.body.dispensaries) || 0,
      orders_count: parseInt(req.body.orders_count) || 0,
      orders_value: parseFloat(req.body.orders_value) || 0,
      summary: (req.body.summary || '').trim()
    };

    console.log('📊 Processed report data:', reportData);

    // IMPORTANT: Get user ID from authenticated user
    const userId = req.user._id;
    console.log('👤 User ID for report:', userId);

    // Check if report already exists for this date
    const existingReport = await DailyReport.findOne({
      user_id: userId,
      report_date: new Date(reportData.report_date)
    });

    if (existingReport) {
      console.log('⚠️ Report already exists for this date');
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted a report for this date.' 
      });
    }

    // Create new report
    const report = new DailyReport({
      user_id: userId,
      report_date: new Date(reportData.report_date),
      region: reportData.region,
      dentists: reportData.dentists,
      physiotherapists: reportData.physiotherapists,
      gynecologists: reportData.gynecologists,
      internists: reportData.internists,
      general_practitioners: reportData.general_practitioners,
      pediatricians: reportData.pediatricians,
      dermatologists: reportData.dermatologists,
      pharmacies: reportData.pharmacies,
      dispensaries: reportData.dispensaries,
      orders_count: reportData.orders_count,
      orders_value: reportData.orders_value,
      summary: reportData.summary
    });

    console.log('💾 Saving report to database...');
    const savedReport = await report.save();
    console.log('✅ Report saved successfully:', savedReport._id);

    // Calculate totals for response
    const totalDoctors = 
      reportData.dentists + reportData.physiotherapists + reportData.gynecologists +
      reportData.internists + reportData.general_practitioners +
      reportData.pediatricians + reportData.dermatologists;
    
    const totalVisits = totalDoctors + reportData.pharmacies + reportData.dispensaries;

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully!',
      data: {
        report_id: savedReport._id,
        report_date: savedReport.report_date,
        region: savedReport.region,
        total_doctors: totalDoctors,
        total_visits: totalVisits,
        total_orders: savedReport.orders_count,
        order_value: savedReport.orders_value,
        summary_preview: savedReport.summary.substring(0, 100) + '...'
      }
    });

  } catch (error) {
    console.error('❌ Error saving report:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Report already exists for this date.' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Report validation failed',
        errors: messages 
      });
    }
    
    // Generic error
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save report. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
});

// ====================== GET USER'S REPORTS ======================
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching reports for user:', req.user._id);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get reports with pagination
    const reports = await DailyReport.find({ user_id: req.user._id })
      .sort({ report_date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain objects

    // Get total count for pagination
    const total = await DailyReport.countDocuments({ user_id: req.user._id });

    // Calculate totals for each report
    const reportsWithTotals = reports.map(report => ({
      ...report,
      total_doctors: 
        report.dentists + report.physiotherapists + report.gynecologists +
        report.internists + report.general_practitioners +
        report.pediatricians + report.dermatologists,
      total_pharmacy_visits: report.pharmacies + report.dispensaries,
      total_visits: 
        report.dentists + report.physiotherapists + report.gynecologists +
        report.internists + report.general_practitioners +
        report.pediatricians + report.dermatologists +
        report.pharmacies + report.dispensaries
    }));

    res.json({
      success: true,
      data: {
        reports: reportsWithTotals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reports' 
    });
  }
});

// ====================== GET SINGLE REPORT ======================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching report:', req.params.id);
    
    const report = await DailyReport.findById(req.params.id)
      .populate('user_id', 'name username role region')
      .lean();

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    // Check authorization
    const canAccess = report.user_id._id.toString() === req.user._id.toString() || 
                     req.user.role === 'supervisor';

    if (!canAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this report' 
      });
    }

    // Calculate totals
    const reportWithTotals = {
      ...report,
      total_doctors: 
        report.dentists + report.physiotherapists + report.gynecologists +
        report.internists + report.general_practitioners +
        report.pediatricians + report.dermatologists,
      total_pharmacy_visits: report.pharmacies + report.dispensaries,
      total_visits: 
        report.dentists + report.physiotherapists + report.gynecologists +
        report.internists + report.general_practitioners +
        report.pediatricians + report.dermatologists +
        report.pharmacies + report.dispensaries,
      user_name: report.user_id.name
    };

    res.json({
      success: true,
      data: reportWithTotals
    });
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch report' 
    });
  }
});

// ====================== UPDATE REPORT ======================
router.put('/:id', authenticateToken, [
  body('summary').optional().isLength({ max: 1000 }).withMessage('Summary cannot exceed 1000 characters')
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

    // Find the report
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

    // Prepare update data
    const updateData = {};
    const numberFields = [
      'dentists', 'physiotherapists', 'gynecologists', 'internists',
      'general_practitioners', 'pediatricians', 'dermatologists',
      'pharmacies', 'dispensaries', 'orders_count', 'orders_value'
    ];

    // Process each field
    numberFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = parseInt(req.body[field]) || 0;
      }
    });

    if (req.body.summary !== undefined) {
      updateData.summary = req.body.summary.trim();
    }

    if (req.body.region !== undefined) {
      updateData.region = req.body.region.trim();
    }

    // Update the report
    const updatedReport = await DailyReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
        context: 'query' 
      }
    );

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: updatedReport
    });
  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update report' 
    });
  }
});

module.exports = router;
