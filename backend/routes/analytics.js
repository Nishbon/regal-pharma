const express = require('express');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get weekly stats for user (FOR MEDREP DASHBOARD)
router.get('/weekly', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyStats = await DailyReport.aggregate([
      {
        $match: {
          user_id: req.user.id,
          report_date: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: '$report_date',
          total_doctors: {
            $sum: {
              $add: [
                '$dentists', '$physiotherapists', '$gynecologists', '$internists',
                '$general_practitioners', '$pediatricians', '$dermatologists'
              ]
            }
          },
          total_pharmacies: { $sum: '$pharmacies' },
          total_dispensaries: { $sum: '$dispensaries' },
          total_orders: { $sum: '$orders_count' },
          total_value: { $sum: '$orders_value' }
        }
      },
      {
        $project: {
          report_date: '$_id',
          total_doctors: 1,
          total_pharmacies: 1,
          total_dispensaries: 1,
          total_orders: 1,
          total_value: 1,
          _id: 0
        }
      },
      { $sort: { report_date: -1 } }
    ]);

    res.json({
      success: true,
      data: weeklyStats
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Get monthly stats for user (FOR MEDREP ANALYTICS)
router.get('/monthly', async (req, res) => {
  try {
    const monthlyStats = await DailyReport.aggregate([
      {
        $match: {
          user_id: req.user.id
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$report_date' },
            month: { $month: '$report_date' }
          },
          total_doctors: {
            $sum: {
              $add: [
                '$dentists', '$physiotherapists', '$gynecologists', '$internists',
                '$general_practitioners', '$pediatricians', '$dermatologists'
              ]
            }
          },
          total_pharmacies: { $sum: '$pharmacies' },
          total_dispensaries: { $sum: '$dispensaries' },
          total_orders: { $sum: '$orders_count' },
          total_value: { $sum: '$orders_value' }
        }
      },
      {
        $project: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month'
                }
              }
            }
          },
          total_doctors: 1,
          total_pharmacies: 1,
          total_dispensaries: 1,
          total_orders: 1,
          total_value: 1,
          _id: 0
        }
      },
      { $sort: { month: -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: monthlyStats
    });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Supervisor analytics - team performance
router.get('/team-performance', requireRole(['supervisor']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = {};
    if (period === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter.report_date = { $gte: oneWeekAgo };
    } else if (period === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      dateFilter.report_date = { $gte: oneMonthAgo };
    }

    const teamPerformance = await User.aggregate([
      {
        $match: {
          role: 'medrep',
          is_active: true
        }
      },
      {
        $lookup: {
          from: 'dailyreports',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user_id', '$$userId'] },
                ...dateFilter
              }
            }
          ],
          as: 'reports'
        }
      },
      {
        $project: {
          user_id: '$_id',
          user_name: '$name',
          region: '$region',
          reports_count: { $size: '$reports' },
          total_doctors: {
            $sum: {
              $map: {
                input: '$reports',
                as: 'report',
                in: {
                  $add: [
                    '$$report.dentists', '$$report.physiotherapists', '$$report.gynecologists',
                    '$$report.internists', '$$report.general_practitioners', 
                    '$$report.pediatricians', '$$report.dermatologists'
                  ]
                }
              }
            }
          },
          total_pharmacies: { $sum: '$reports.pharmacies' },
          total_dispensaries: { $sum: '$reports.dispensaries' },
          total_orders: { $sum: '$reports.orders_count' },
          total_value: { $sum: '$reports.orders_value' }
        }
      },
      { $sort: { total_value: -1 } }
    ]);

    res.json({
      success: true,
      data: teamPerformance
    });
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

// Region-wise analytics
router.get('/region-performance', requireRole(['supervisor']), async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const regionPerformance = await DailyReport.aggregate([
      {
        $match: {
          report_date: { $gte: oneMonthAgo }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $group: {
          _id: '$user.region',
          active_reps: { $addToSet: '$user_id' },
          total_doctors: {
            $sum: {
              $add: [
                '$dentists', '$physiotherapists', '$gynecologists', '$internists',
                '$general_practitioners', '$pediatricians', '$dermatologists'
              ]
            }
          },
          total_pharmacies: { $sum: '$pharmacies' },
          total_dispensaries: { $sum: '$dispensaries' },
          total_orders: { $sum: '$orders_count' },
          total_value: { $sum: '$orders_value' }
        }
      },
      {
        $project: {
          region: '$_id',
          active_reps: { $size: '$active_reps' },
          total_doctors: 1,
          total_pharmacies: 1,
          total_dispensaries: 1,
          total_orders: 1,
          total_value: 1,
          _id: 0
        }
      },
      { $sort: { total_value: -1 } }
    ]);

    res.json({
      success: true,
      data: regionPerformance
    });
  } catch (error) {
    console.error('Region performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
});

module.exports = router;