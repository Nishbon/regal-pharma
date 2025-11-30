const express = require('express');
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get weekly stats for user (FOR MEDREP DASHBOARD)
router.get('/weekly', (req, res) => {
  let sql = `
    SELECT 
      SUM(dentists + physiotherapists + gynecologists + internists + 
          general_practitioners + pediatricians + dermatologists) as total_doctors,
      SUM(pharmacies) as total_pharmacies,
      SUM(dispensaries) as total_dispensaries,
      SUM(orders_count) as total_orders,
      SUM(orders_value) as total_value,
      report_date
    FROM daily_reports 
    WHERE user_id = ? AND report_date >= date('now', '-7 days')
    GROUP BY report_date 
    ORDER BY report_date DESC
  `;

  db.all(sql, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({
      success: true,
      data: rows
    });
  });
});

// Get monthly stats for user (FOR MEDREP ANALYTICS)
router.get('/monthly', (req, res) => {
  let sql = `
    SELECT 
      strftime('%Y-%m', report_date) as month,
      SUM(dentists + physiotherapists + gynecologists + internists + 
          general_practitioners + pediatricians + dermatologists) as total_doctors,
      SUM(pharmacies) as total_pharmacies,
      SUM(dispensaries) as total_dispensaries,
      SUM(orders_count) as total_orders,
      SUM(orders_value) as total_value
    FROM daily_reports 
    WHERE user_id = ?
    GROUP BY strftime('%Y-%m', report_date)
    ORDER BY month DESC
    LIMIT 12
  `;

  db.all(sql, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({
      success: true,
      data: rows
    });
  });
});

// Supervisor analytics - team performance
router.get('/team-performance', requireRole(['supervisor']), (req, res) => {
  const { period = 'month' } = req.query;
  
  let dateFilter = '';
  if (period === 'week') {
    dateFilter = 'AND dr.report_date >= date("now", "-7 days")';
  } else if (period === 'month') {
    dateFilter = 'AND dr.report_date >= date("now", "-30 days")';
  }

  const sql = `
    SELECT 
      u.id as user_id,
      u.name as user_name,
      u.region,
      COUNT(dr.id) as reports_count,
      SUM(dr.dentists + dr.physiotherapists + dr.gynecologists + dr.internists + 
          dr.general_practitioners + dr.pediatricians + dr.dermatologists) as total_doctors,
      SUM(dr.pharmacies) as total_pharmacies,
      SUM(dr.dispensaries) as total_dispensaries,
      SUM(dr.orders_count) as total_orders,
      SUM(dr.orders_value) as total_value
    FROM users u
    LEFT JOIN daily_reports dr ON u.id = dr.user_id ${dateFilter}
    WHERE u.role = 'medrep' AND u.is_active = 1
    GROUP BY u.id, u.name, u.region
    ORDER BY total_value DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({
      success: true,
      data: rows
    });
  });
});

// Region-wise analytics
router.get('/region-performance', requireRole(['supervisor']), (req, res) => {
  const sql = `
    SELECT 
      region,
      COUNT(DISTINCT user_id) as active_reps,
      SUM(dentists + physiotherapists + gynecologists + internists + 
          general_practitioners + pediatricians + dermatologists) as total_doctors,
      SUM(pharmacies) as total_pharmacies,
      SUM(dispensaries) as total_dispensaries,
      SUM(orders_count) as total_orders,
      SUM(orders_value) as total_value
    FROM daily_reports 
    WHERE report_date >= date("now", "-30 days")
    GROUP BY region
    ORDER BY total_value DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({
      success: true,
      data: rows
    });
  });
});

module.exports = router;