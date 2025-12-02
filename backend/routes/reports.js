const express = require('express');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const router = express.Router();

// ====================== HELPER: Check Supervisor Role ======================
const requireSupervisor = (req, res, next) => {
  if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Supervisor or admin role required.'
    });
  }
  next();
};

// ====================== GET USER'S OWN REPORTS ======================
router.get('/my-reports', async (req, res) => {
  try {
    console.log(`📋 Fetching reports for user ID: ${req.user.id}`);
    
    // Get query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Use REAL user ID from JWT token
    const [reports, total] = await Promise.all([
      DailyReport.find({ user_id: req.user.id })
        .sort({ report_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DailyReport.countDocuments({ user_id: req.user.id })
    ]);
    
    console.log(`✅ Found ${reports.length} reports for user ${req.user.username}`);
    
    res.json({
      success: true,
      data: {
        reports: reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        region: req.user.region
      }
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
});

// ====================== GET ALL REPORTS (SUPERVISORS ONLY) ======================
router.get('/all', requireSupervisor, async (req, res) => {
  try {
    console.log(`👨‍💼 Supervisor ${req.user.username} fetching all reports`);
    
    const reports = await DailyReport.find({})
      .populate('user_id', 'name username email region role')
      .sort({ report_date: -1 })
      .limit(100)
      .lean();
    
    console.log(`📊 Found ${reports.length} total reports in database`);
    
    res.json({
      success: true,
      data: reports,
      count: reports.length,
      supervisor: req.user.username
    });
  } catch (error) {
    console.error('Error fetching all reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
});

// ====================== CREATE NEW REPORT ======================
router.post('/create', async (req, res) => {
  try {
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
    
    console.log(`📝 User ${req.user.username} creating report`);
    console.log('Received data:', req.body);
    
    // Check if report already exists for this user on this date
    if (report_date) {
      const existingReport = await DailyReport.findOne({
        user_id: req.user.id,
        report_date: new Date(report_date)
      });
      
      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a report for this date'
        });
      }
    }
    
    // Create new report with current model structure
    const newReport = new DailyReport({
      user_id: req.user.id,
      report_date: report_date ? new Date(report_date) : new Date(),
      region: region || user?.region || 'Unknown',
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
    
    await newReport.save();
    
    console.log(`✅ Report created successfully for ${req.user.username}`);
    console.log('Report details:', {
      user: req.user.username,
      date: newReport.report_date,
      region: newReport.region,
      total_doctors: newReport.total_doctors,
      orders: newReport.orders_count
    });
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: newReport
    });
  } catch (error) {
    console.error('Error creating report:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a report for this date'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
});

// ====================== GET REPORT BY ID ======================
router.get('/:id', async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id).lean();
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Check if user owns this report or is supervisor
    if (report.user_id.toString() !== req.user.id && 
        req.user.role !== 'supervisor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this report'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report'
    });
  }
});

// ====================== UPDATE REPORT ======================
router.put('/:id', async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Check if user owns this report
    if (report.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reports'
      });
    }
    
    // Update report
    const updatedData = req.body;
    Object.assign(report, updatedData);
    await report.save();
    
    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report'
    });
  }
});

// ====================== DELETE REPORT ======================
router.delete('/:id', async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Check if user owns this report or is supervisor
    if (report.user_id.toString() !== req.user.id && 
        req.user.role !== 'supervisor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this report'
      });
    }
    
    await report.deleteOne();
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report'
    });
  }
});

// ====================== GET REPORTS BY DATE RANGE ======================
router.get('/date-range/:start/:end', async (req, res) => {
  try {
    const startDate = new Date(req.params.start);
    const endDate = new Date(req.params.end);
    
    // Build query based on user role
    let query = {
      report_date: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Regular users only see their own reports
    if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
      query.user_id = req.user.id;
    }
    
    const reports = await DailyReport.find(query)
      .populate('user_id', 'name username region')
      .sort({ report_date: -1 })
      .lean();
    
    res.json({
      success: true,
      data: reports,
      count: reports.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error fetching reports by date:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
});

module.exports = router;
