const express = require('express');
const { body, validationResult } = require('express-validator');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
// REMOVE THIS LINE: const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ====================== TEMPORARY BYPASS MIDDLEWARE ======================
const bypassAuth = (req, res, next) => {
  console.log('🔓 Bypassing auth for reports route');
  
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
  
  console.log(`✅ Reports user set: ${username} (${userRole})`);
  next();
};

// ====================== SUBMIT DAILY REPORT ======================
// CHANGED: authenticateToken → bypassAuth
router.post('/daily', bypassAuth, [
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
    console.log('👤 User:', req.user.username);
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

    // For testing, simulate saving without actual DB
    console.log('💾 Simulating report save...');
    
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

    // Calculate totals for response
    const totalDoctors = 
      reportData.dentists + reportData.physiotherapists + reportData.gynecologists +
      reportData.internists + reportData.general_practitioners +
      reportData.pediatricians + reportData.dermatologists;
    
    const totalVisits = totalDoctors + reportData.pharmacies + reportData.dispensaries;

    // Create mock response (skip actual DB save for testing)
    const mockReportId = `report-${Date.now()}-${req.user.username}`;

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully! (Debug Mode)',
      data: {
        report_id: mockReportId,
        report_date: reportData.report_date,
        region: reportData.region,
        total_doctors: totalDoctors,
        total_visits: totalVisits,
        total_orders: reportData.orders_count,
        order_value: reportData.orders_value,
        summary_preview: reportData.summary.substring(0, 100) + '...',
        user: req.user.username,
        note: 'Database save bypassed for testing'
      }
    });

  } catch (error) {
    console.error('❌ Error in report submission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Report submission failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ====================== GET USER'S REPORTS ======================
// CHANGED: authenticateToken → bypassAuth
router.get('/my-reports', bypassAuth, async (req, res) => {
  try {
    console.log('📋 Fetching reports for user:', req.user.username);
    
    // Mock data for testing
    const mockReports = [
      {
        _id: 'report-1',
        report_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        region: 'North',
        dentists: 2,
        physiotherapists: 1,
        gynecologists: 0,
        internists: 1,
        general_practitioners: 3,
        pediatricians: 1,
        dermatologists: 0,
        pharmacies: 2,
        dispensaries: 1,
        orders_count: 4,
        orders_value: 3200,
        summary: 'Productive day with 4 orders placed.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        _id: 'report-2',
        report_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        region: 'North',
        dentists: 1,
        physiotherapists: 0,
        gynecologists: 2,
        internists: 0,
        general_practitioners: 2,
        pediatricians: 0,
        dermatologists: 1,
        pharmacies: 3,
        dispensaries: 0,
        orders_count: 3,
        orders_value: 2800,
        summary: 'Good response from new clinics.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    // Calculate totals for each report
    const reportsWithTotals = mockReports.map(report => ({
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    res.json({
      success: true,
      data: {
        reports: reportsWithTotals,
        pagination: {
          page,
          limit,
          total: mockReports.length,
          pages: 1
        }
      },
      user: req.user.username,
      note: 'Mock data - database bypassed'
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
// CHANGED: authenticateToken → bypassAuth
router.get('/:id', bypassAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching report:', req.params.id);
    
    // Mock report data
    const mockReport = {
      _id: req.params.id,
      report_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      region: 'North',
      dentists: 2,
      physiotherapists: 1,
      gynecologists: 0,
      internists: 1,
      general_practitioners: 3,
      pediatricians: 1,
      dermatologists: 0,
      pharmacies: 2,
      dispensaries: 1,
      orders_count: 4,
      orders_value: 3200,
      summary: 'Productive day with 4 orders placed.',
      user_id: {
        _id: 'user-bonte',
        name: 'Bonte',
        username: 'bonte',
        role: 'medrep',
        region: 'North'
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    };

    // Calculate totals
    const reportWithTotals = {
      ...mockReport,
      total_doctors: 
        mockReport.dentists + mockReport.physiotherapists + mockReport.gynecologists +
        mockReport.internists + mockReport.general_practitioners +
        mockReport.pediatricians + mockReport.dermatologists,
      total_pharmacy_visits: mockReport.pharmacies + mockReport.dispensaries,
      total_visits: 
        mockReport.dentists + mockReport.physiotherapists + mockReport.gynecologists +
        mockReport.internists + mockReport.general_practitioners +
        mockReport.pediatricians + mockReport.dermatologists +
        mockReport.pharmacies + mockReport.dispensaries,
      user_name: mockReport.user_id.name
    };

    res.json({
      success: true,
      data: reportWithTotals,
      note: 'Mock data - database bypassed'
    });
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch report' 
    });
  }
});

// ====================== TEST ENDPOINT ======================
router.get('/test/health', bypassAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Reports API is working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
