const express = require('express');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const router = express.Router();

// Get weekly stats for user - FETCH REAL DATA
router.get('/weekly', async (req, res) => {
  try {
    console.log('📊 Weekly stats requested by:', req.user.username);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Try to find user in database
    const dbUser = await User.findOne({ username: req.user.username });
    
    let weeklyStats = [];
    
    if (dbUser) {
      // Fetch real data for this user
      weeklyStats = await DailyReport.aggregate([
        {
          $match: {
            user_id: dbUser._id,
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
      
      console.log(`✅ Found ${weeklyStats.length} weekly reports for ${req.user.username}`);
    } else {
      // If user not in DB, return empty array
      console.log(`⚠️ User ${req.user.username} not found in database, returning empty stats`);
    }
    
    res.json({
      success: true,
      data: weeklyStats,
      user: req.user.username,
      source: dbUser ? 'MongoDB' : 'Debug user (no data)'
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get monthly stats for user - FETCH REAL DATA
router.get('/monthly', async (req, res) => {
  try {
    console.log('📈 Monthly stats requested by:', req.user.username);
    
    const dbUser = await User.findOne({ username: req.user.username });
    
    let monthlyStats = [];
    
    if (dbUser) {
      monthlyStats = await DailyReport.aggregate([
        {
          $match: {
            user_id: dbUser._id
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
      
      console.log(`✅ Found monthly stats for ${req.user.username}`);
    }
    
    res.json({
      success: true,
      data: monthlyStats,
      user: req.user.username
    });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error'
    });
  }
});

// Supervisor analytics - team performance - FETCH REAL DATA
router.get('/team-performance', async (req, res) => {
  try {
    console.log('👥 Team performance requested by:', req.user.username);
    
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
    
    // Fetch REAL team performance from MongoDB
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
      period: period,
      source: 'MongoDB'
    });
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Region-wise analytics - FETCH REAL DATA
router.get('/region-performance', async (req, res) => {
  try {
    console.log('🗺️ Region performance requested by:', req.user.username);
    
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
      source: 'MongoDB'
    });
  } catch (error) {
    console.error('Region performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error'
    });
  }
});

// Dashboard summary stats - FETCH REAL DATA
router.get('/dashboard-summary', async (req, res) => {
  try {
    console.log('📊 Dashboard summary requested by:', req.user.username);
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    const startOfMonth = new Date(today.setDate(today.getDate() - 30));
    
    // Get user from database
    const dbUser = await User.findOne({ username: req.user.username });
    
    let userStats = {};
    let teamStats = {};
    
    if (dbUser) {
      // User's today stats
      const todayStats = await DailyReport.findOne({
        user_id: dbUser._id,
        report_date: { $gte: startOfDay }
      });
      
      // User's weekly stats
      const weeklyAgg = await DailyReport.aggregate([
        {
          $match: {
            user_id: dbUser._id,
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
            total_value: { $sum: '$orders_value' }
          }
        }
      ]);
      
      userStats = {
        today: todayStats ? {
          doctors: todayStats.dentists + todayStats.physiotherapists + todayStats.gynecologists +
                  todayStats.internists + todayStats.general_practitioners +
                  todayStats.pediatricians + todayStats.dermatologists,
          pharmacies: todayStats.pharmacies,
          dispensaries: todayStats.dispensaries,
          orders: todayStats.orders_count,
          value: todayStats.orders_value
        } : { doctors: 0, pharmacies: 0, dispensaries: 0, orders: 0, value: 0 },
        weekly: weeklyAgg[0] || { total_doctors: 0, total_visits: 0, total_orders: 0, total_value: 0 }
      };
    }
    
    // If supervisor, get team stats
    if (req.user.role === 'supervisor') {
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
            total_value: { $sum: '$orders_value' }
          }
        }
      ]);
      
      teamStats = {
        active_medreps: activeMedreps,
        weekly_reports: teamWeeklyStats[0]?.total_reports || 0,
        weekly_orders: teamWeeklyStats[0]?.total_orders || 0,
        weekly_value: teamWeeklyStats[0]?.total_value || 0
      };
    }
    
    res.json({
      success: true,
      data: {
        user: userStats,
        team: teamStats,
        user_role: req.user.role,
        username: req.user.username
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database error'
    });
  }
});

// Add a simple test endpoint
router.get('/test', async (req, res) => {
  // Test database connection
  const userCount = await User.countDocuments();
  const reportCount = await DailyReport.countDocuments();
  
  res.json({
    success: true,
    message: 'Analytics API is working',
    user: req.user,
    database_stats: {
      users: userCount,
      reports: reportCount
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
