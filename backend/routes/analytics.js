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

// ====================== GET WEEKLY STATS FOR USER ======================
router.get('/weekly', async (req, res) => {
  try {
    console.log(`📊 Weekly stats requested by user ID: ${req.user.id}`);
    
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
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$report_date' } },
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
    
    console.log(`✅ Found ${weeklyStats.length} weekly reports for ${req.user.username}`);
    
    res.json({
      success: true,
      data: weeklyStats,
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name
      }
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching weekly stats'
    });
  }
});

// ====================== GET MONTHLY STATS FOR USER ======================
router.get('/monthly', async (req, res) => {
  try {
    console.log(`📈 Monthly stats requested by user ID: ${req.user.id}`);
    
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
    
    console.log(`✅ Found ${monthlyStats.length} months of data for ${req.user.username}`);
    
    res.json({
      success: true,
      data: monthlyStats,
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name
      }
    });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching monthly stats'
    });
  }
});

// ====================== SUPERVISOR ANALYTICS - TEAM PERFORMANCE ======================
router.get('/team-performance', requireSupervisor, async (req, res) => {
  try {
    console.log(`👥 Team performance requested by supervisor: ${req.user.username}`);
    
    const { period = 'month' } = req.query;
    
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'quarter') {
      startDate.setDate(startDate.getDate() - 90);
    } else {
      startDate = null;
    }
    
    const dateFilter = startDate ? { report_date: { $gte: startDate } } : {};
    
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
          username: '$username',
          email: '$email',
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
    
    console.log(`✅ Found team performance data for ${teamPerformance.length} medreps`);
    
    res.json({
      success: true,
      data: teamPerformance,
      requested_by: req.user.username,
      count: teamPerformance.length,
      period: period
    });
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching team performance'
    });
  }
});

// ====================== REGION-WISE ANALYTICS ======================
router.get('/region-performance', requireSupervisor, async (req, res) => {
  try {
    console.log(`🗺️ Region performance requested by: ${req.user.username}`);
    
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

    console.log(`✅ Found region performance for ${regionPerformance.length} regions`);
    
    res.json({
      success: true,
      data: regionPerformance,
      requested_by: req.user.username,
      period: 'last_30_days'
    });
  } catch (error) {
    console.error('Region performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching region performance'
    });
  }
});

// ====================== DASHBOARD SUMMARY STATS ======================
router.get('/dashboard-summary', async (req, res) => {
  try {
    console.log(`📊 Dashboard summary requested by: ${req.user.username} (${req.user.role})`);
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    
    // User's today stats
    const todayStats = await DailyReport.findOne({
      user_id: req.user.id,
      report_date: { $gte: startOfDay }
    });
    
    // User's weekly stats
    const weeklyAgg = await DailyReport.aggregate([
      {
        $match: {
          user_id: req.user.id,
          report_date: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          total_doctors: {
            $sum: {
              $add: [
                '$dentists', '$physiotherapists', '$gynecologists', '$internists',
                '$general_practitioners', '$pediatricians', '$dermatologists'
              ]
            }
          },
          total_visits: {
            $sum: {
              $add: [
                '$dentists', '$physiotherapists', '$gynecologists', '$internists',
                '$general_practitioners', '$pediatricians', '$dermatologists',
                '$pharmacies', '$dispensaries'
              ]
            }
          },
          total_orders: { $sum: '$orders_count' },
          total_value: { $sum: '$orders_value' },
          report_count: { $sum: 1 }
        }
      }
    ]);
    
    const userStats = {
      today: todayStats ? {
        doctors: todayStats.dentists + todayStats.physiotherapists + todayStats.gynecologists +
                todayStats.internists + todayStats.general_practitioners +
                todayStats.pediatricians + todayStats.dermatologists,
        pharmacies: todayStats.pharmacies,
        dispensaries: todayStats.dispensaries,
        orders: todayStats.orders_count,
        value: todayStats.orders_value,
        hasReport: true
      } : { 
        doctors: 0, pharmacies: 0, dispensaries: 0, orders: 0, value: 0, hasReport: false 
      },
      weekly: weeklyAgg[0] || { 
        total_doctors: 0, total_visits: 0, total_orders: 0, total_value: 0, report_count: 0 
      }
    };
    
    // Team stats for supervisors
    let teamStats = {};
    if (req.user.role === 'supervisor' || req.user.role === 'admin') {
      const activeMedreps = await User.countDocuments({ 
        role: 'medrep', 
        is_active: true 
      });
      
      const teamWeeklyStats = await DailyReport.aggregate([
        {
          $match: {
            report_date: { $gte: startOfWeek }
          }
        },
        {
          $group: {
            _id: null,
            total_reports: { $sum: 1 },
            total_orders: { $sum: '$orders_count' },
            total_value: { $sum: '$orders_value' },
            active_users: { $addToSet: '$user_id' }
          }
        }
      ]);
      
      teamStats = {
        active_medreps: activeMedreps,
        weekly_reports: teamWeeklyStats[0]?.total_reports || 0,
        weekly_orders: teamWeeklyStats[0]?.total_orders || 0,
        weekly_value: teamWeeklyStats[0]?.total_value || 0,
        active_reporting_users: teamWeeklyStats[0]?.active_users?.length || 0
      };
    }
    
    res.json({
      success: true,
      data: {
        user: userStats,
        team: teamStats,
        user_info: {
          id: req.user.id,
          username: req.user.username,
          name: req.user.name,
          role: req.user.role,
          region: req.user.region
        }
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard summary'
    });
  }
});

module.exports = router;
