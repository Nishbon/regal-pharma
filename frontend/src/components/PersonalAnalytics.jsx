import React, { useState, useEffect } from 'react'
import { reportsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const PersonalAnalytics = () => {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [timeRange, setTimeRange] = useState('week')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📊 Loading analytics data for time range:', timeRange)
      
      // Get all reports (we'll filter by date on the frontend)
      const response = await reportsAPI.getMyReports(1, 100) // Get up to 100 reports
      console.log('📈 Analytics API response:', response.data)
      
      if (response.data.success) {
        // Handle different response structures
        let reportsData = []
        if (response.data.data?.reports) {
          reportsData = response.data.data.reports
        } else if (Array.isArray(response.data.data)) {
          reportsData = response.data.data
        } else {
          reportsData = response.data.data?.data || []
        }
        
        console.log('📋 Found reports for analytics:', reportsData.length)
        setReports(reportsData)
      } else {
        setError('Failed to load analytics data')
      }
    } catch (error) {
      console.error('❌ Error loading analytics:', error)
      setError(error.response?.data?.message || 'Failed to load analytics data')
    }
    setLoading(false)
  }

  // Filter reports based on time range
  const getFilteredReports = () => {
    if (!reports.length) return []
    
    const now = new Date()
    const cutoffDate = new Date()
    
    if (timeRange === 'week') {
      cutoffDate.setDate(now.getDate() - 7)
    } else if (timeRange === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1)
    } else {
      cutoffDate.setMonth(now.getMonth() - 3) // Default to 3 months
    }
    
    return reports.filter(report => {
      try {
        const reportDate = new Date(report.report_date || report.createdAt)
        return reportDate >= cutoffDate
      } catch {
        return false
      }
    })
  }

  // Calculate daily/weekly/monthly summaries
  const calculateAnalytics = () => {
    const filteredReports = getFilteredReports()
    
    if (filteredReports.length === 0) {
      return {
        totals: {
          doctors: 0,
          pharmacies: 0,
          dispensaries: 0,
          orders: 0,
          value: 0,
          reports: 0
        },
        dailyData: [],
        monthlyData: []
      }
    }

    // Calculate totals
    const totals = filteredReports.reduce((acc, report) => {
      const doctors = 
        (report.dentists || 0) +
        (report.physiotherapists || 0) +
        (report.gynecologists || 0) +
        (report.internists || 0) +
        (report.general_practitioners || 0) +
        (report.pediatricians || 0) +
        (report.dermatologists || 0)
      
      const pharmacies = (report.pharmacies || 0)
      const dispensaries = (report.dispensaries || 0)
      const orders = (report.orders_count || 0)
      const value = (report.orders_value || 0)
      
      return {
        doctors: acc.doctors + doctors,
        pharmacies: acc.pharmacies + pharmacies,
        dispensaries: acc.dispensaries + dispensaries,
        orders: acc.orders + orders,
        value: acc.value + value,
        reports: acc.reports + 1
      }
    }, { doctors: 0, pharmacies: 0, dispensaries: 0, orders: 0, value: 0, reports: 0 })

    // Group by day for weekly view
    const dailyData = filteredReports.reduce((groups, report) => {
      try {
        const date = new Date(report.report_date).toISOString().split('T')[0]
        
        const doctors = 
          (report.dentists || 0) +
          (report.physiotherapists || 0) +
          (report.gynecologists || 0) +
          (report.internists || 0) +
          (report.general_practitioners || 0) +
          (report.pediatricians || 0) +
          (report.dermatologists || 0)
        
        if (!groups[date]) {
          groups[date] = {
            date,
            total_doctors: 0,
            total_pharmacies: 0,
            total_dispensaries: 0,
            total_orders: 0,
            total_value: 0
          }
        }
        
        groups[date].total_doctors += doctors
        groups[date].total_pharmacies += (report.pharmacies || 0)
        groups[date].total_dispensaries += (report.dispensaries || 0)
        groups[date].total_orders += (report.orders_count || 0)
        groups[date].total_value += (report.orders_value || 0)
      } catch (e) {
        console.warn('Error processing report date:', e)
      }
      
      return groups
    }, {})

    // Group by month for monthly view
    const monthlyData = filteredReports.reduce((groups, report) => {
      try {
        const date = new Date(report.report_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        
        const doctors = 
          (report.dentists || 0) +
          (report.physiotherapists || 0) +
          (report.gynecologists || 0) +
          (report.internists || 0) +
          (report.general_practitioners || 0) +
          (report.pediatricians || 0) +
          (report.dermatologists || 0)
        
        if (!groups[monthKey]) {
          groups[monthKey] = {
            month: monthName,
            total_doctors: 0,
            total_pharmacies: 0,
            total_dispensaries: 0,
            total_orders: 0,
            total_value: 0,
            report_count: 0
          }
        }
        
        groups[monthKey].total_doctors += doctors
        groups[monthKey].total_pharmacies += (report.pharmacies || 0)
        groups[monthKey].total_dispensaries += (report.dispensaries || 0)
        groups[monthKey].total_orders += (report.orders_count || 0)
        groups[monthKey].total_value += (report.orders_value || 0)
        groups[monthKey].report_count += 1
      } catch (e) {
        console.warn('Error processing report for monthly data:', e)
      }
      
      return groups
    }, {})

    return {
      totals,
      dailyData: Object.values(dailyData).sort((a, b) => new Date(b.date) - new Date(a.date)),
      monthlyData: Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month))
    }
  }

  const { totals, dailyData, monthlyData } = calculateAnalytics()
  const currentData = timeRange === 'week' ? dailyData : monthlyData

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        color: 'white',
        fontSize: '18px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div>Loading your analytics...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        <button
          onClick={loadAnalyticsData}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '50px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔄 Refresh
        </button>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          My Performance Analytics 📈
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          {user?.name || 'User'} • {user?.region || 'All Regions'} • {totals.reports} reports analyzed
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '15px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Time Range Selector */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px' 
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'white',
          padding: '5px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {['week', 'month', '3months'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '12px 25px',
                border: 'none',
                background: timeRange === range ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: timeRange === range ? 'white' : '#666',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                textTransform: 'capitalize',
                fontSize: '1em',
                transition: 'all 0.3s ease'
              }}
            >
              {range === '3months' ? 'Last 3 Months' : `This ${range}`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <StatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#3498db"
          icon="👨‍⚕️"
        />
        <StatCard 
          value={totals.pharmacies + totals.dispensaries} 
          label="Pharmacies & Dispensaries"
          color="#2ecc71"
          icon="💊"
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders Received"
          color="#e74c3c"
          icon="📦"
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Order Value"
          color="#f39c12"
          icon="💰"
        />
      </div>

      {/* Analytics Content */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '25px' 
        }}>
          <h2 style={{ 
            margin: '0', 
            color: '#2c3e50',
            fontSize: '1.6em'
          }}>
            {timeRange === 'week' ? '📅 Daily Performance' : 
             timeRange === 'month' ? '📅 Monthly Performance' : 
             '📅 Last 3 Months Performance'}
          </h2>
          <div style={{ 
            fontSize: '0.9em', 
            color: '#7f8c8d',
            background: '#f8f9fa',
            padding: '5px 15px',
            borderRadius: '20px'
          }}>
            {currentData.length} {timeRange === 'week' ? 'days' : 'months'} of data
          </div>
        </div>

        {currentData.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#7f8c8d'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px', opacity: '0.5' }}>📊</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
              No Data Available
            </h3>
            <p style={{ margin: '0', fontSize: '1.1em', maxWidth: '400px', margin: '0 auto 20px' }}>
              {reports.length === 0 
                ? "You haven't submitted any reports yet. Start by submitting your first daily report!"
                : `You have ${reports.length} total reports, but none in the selected time period.`
              }
            </p>
            {reports.length === 0 && (
              <button 
                onClick={() => window.location.href = '/daily-report'}
                style={{
                  display: 'inline-block',
                  padding: '12px 30px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
              >
                Submit Your First Report
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.95em'
            }}>
              <thead>
                <tr style={{ 
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    {timeRange === 'week' ? 'Date' : 'Month'}
                  </th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Doctors</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Pharmacies</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Dispensaries</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Orders</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Value (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((item, index) => (
                  <AnalyticsRow 
                    key={item.date || item.month} 
                    item={item} 
                    index={index}
                    timeRange={timeRange}
                  />
                ))}
              </tbody>
              {/* Totals Row */}
              <tfoot>
                <tr style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 20%)',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  <td style={{ padding: '15px', textAlign: 'left' }}>
                    <strong>Total</strong>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {currentData.reduce((sum, item) => sum + (item.total_doctors || 0), 0)}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {currentData.reduce((sum, item) => sum + (item.total_pharmacies || 0), 0)}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {currentData.reduce((sum, item) => sum + (item.total_dispensaries || 0), 0)}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {currentData.reduce((sum, item) => sum + (item.total_orders || 0), 0)}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    {currentData.reduce((sum, item) => sum + (item.total_value || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      {currentData.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2d3436' }}>💡 Performance Insights</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px',
            color: '#2d3436'
          }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📊 Average Daily Doctors:</strong> {Math.round(totals.doctors / Math.max(totals.reports, 1))}
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📈 Order Conversion Rate:</strong> {totals.doctors > 0 ? ((totals.orders / totals.doctors) * 100).toFixed(1) : 0}%
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>💰 Average Order Value:</strong> RWF {Math.round(totals.value / Math.max(totals.orders, 1)).toLocaleString()}
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📅 Activity Days:</strong> {totals.reports} days ({Math.round((totals.reports / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)) * 100)}% active)
            </div>
          </div>
        </div>
      )}

      {/* Data Source Info */}
      <div style={{
        background: '#f8f9fa',
        padding: '15px 20px',
        borderRadius: '10px',
        fontSize: '0.9em',
        color: '#7f8c8d',
        textAlign: 'center'
      }}>
        <strong>ℹ️ Data Source:</strong> Based on {reports.length} total reports from your account. 
        Showing {currentData.length} {timeRange === 'week' ? 'daily' : 'monthly'} entries.
      </div>
    </div>
  )
}

// Analytics Row Component
const AnalyticsRow = ({ item, index, timeRange }) => {
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      if (timeRange === 'week') {
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric'
        })
      }
      return item.month || date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } catch {
      return 'Invalid Date'
    }
  }

  const dateLabel = timeRange === 'week' ? formatDate(item.date) : item.month

  return (
    <tr style={{ 
      borderBottom: '1px solid #e9ecef',
      background: index % 2 === 0 ? '#f8f9fa' : 'white',
      transition: 'background-color 0.2s ease'
    }}>
      <td style={{ 
        padding: '15px', 
        fontWeight: '500', 
        color: '#2c3e50',
        minWidth: '120px'
      }}>
        {dateLabel}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#3498db', 
        fontWeight: '600',
        fontSize: '1.1em'
      }}>
        {item.total_doctors || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#2ecc71', 
        fontWeight: '600',
        fontSize: '1.1em'
      }}>
        {item.total_pharmacies || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#27ae60', 
        fontWeight: '600',
        fontSize: '1.1em'
      }}>
        {item.total_dispensaries || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#e74c3c', 
        fontWeight: '600',
        fontSize: '1.1em'
      }}>
        {item.total_orders || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'right', 
        color: '#f39c12', 
        fontWeight: '600',
        fontSize: '1.1em',
        minWidth: '120px'
      }}>
        {(item.total_value || 0).toLocaleString()}
      </td>
    </tr>
  )
}

// Stat Card Component
const StatCard = ({ value, label, color, icon }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    textAlign: 'center',
    borderTop: `4px solid ${color}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 5px 20px rgba(0,0,0,0.12)'
    }
  }}>
    <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>{icon}</div>
    <div style={{ 
      fontSize: '1.8em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '8px'
    }}>
      {value}
    </div>
    <div style={{ color: '#7f8c8d', fontSize: '0.9em' }}>{label}</div>
  </div>
)

export default PersonalAnalytics
