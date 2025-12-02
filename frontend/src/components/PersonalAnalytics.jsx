import React, { useState, useEffect } from 'react'
import { reportsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const PersonalAnalytics = () => {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [timeRange, setTimeRange] = useState('week')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allReportsLoaded, setAllReportsLoaded] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📊 Loading analytics data for time range:', timeRange)
      
      // Try to get all reports for comprehensive analytics
      let allReports = []
      let page = 1
      const limit = 50
      
      // Load multiple pages if needed
      while (!allReportsLoaded) {
        try {
          console.log(`📄 Loading page ${page} of reports...`)
          const response = await reportsAPI.getMyReports(page, limit)
          
          if (response.data.success) {
            // Handle different response structures
            let pageReports = []
            if (response.data.data?.reports && Array.isArray(response.data.data.reports)) {
              pageReports = response.data.data.reports
            } else if (Array.isArray(response.data.data)) {
              pageReports = response.data.data
            } else {
              pageReports = response.data.data?.data || []
            }
            
            console.log(`📋 Found ${pageReports.length} reports on page ${page}`)
            
            if (pageReports.length > 0) {
              allReports = [...allReports, ...pageReports]
              page++
              
              // Stop if we got less than the limit (no more pages)
              if (pageReports.length < limit) {
                console.log('🏁 All reports loaded')
                setAllReportsLoaded(true)
                break
              }
            } else {
              console.log('🏁 No more reports to load')
              setAllReportsLoaded(true)
              break
            }
          } else {
            console.warn('API returned unsuccessful on page', page)
            break
          }
        } catch (pageError) {
          console.error(`❌ Error loading page ${page}:`, pageError)
          // Continue with what we have
          break
        }
      }
      
      // Fallback: If we couldn't load all pages, just get first page
      if (allReports.length === 0) {
        console.log('🔄 Trying single page load as fallback...')
        const fallbackResponse = await reportsAPI.getMyReports(1, 100)
        
        if (fallbackResponse.data.success) {
          if (fallbackResponse.data.data?.reports && Array.isArray(fallbackResponse.data.data.reports)) {
            allReports = fallbackResponse.data.data.reports
          } else if (Array.isArray(fallbackResponse.data.data)) {
            allReports = fallbackResponse.data.data
          } else {
            allReports = fallbackResponse.data.data?.data || []
          }
        }
      }
      
      console.log('📊 Total reports for analytics:', allReports.length)
      setReports(allReports)
      
    } catch (error) {
      console.error('❌ Error loading analytics:', error)
      console.error('Error details:', error.response?.data)
      
      let errorMessage = 'Failed to load analytics data'
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.'
      } else if (error.response?.status === 404) {
        errorMessage = 'Reports endpoint not found'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      setError(errorMessage)
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
        const reportDate = new Date(report.report_date || report.createdAt || report.updatedAt)
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
        const date = new Date(report.report_date || report.createdAt).toISOString().split('T')[0]
        
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
            displayDate: new Date(report.report_date || report.createdAt).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }),
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
        const date = new Date(report.report_date || report.createdAt)
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
            monthKey,
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
      dailyData: Object.values(dailyData)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 14), // Last 14 days max
      monthlyData: Object.values(monthlyData)
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
        .slice(0, 6) // Last 6 months max
    }
  }

  const { totals, dailyData, monthlyData } = calculateAnalytics()
  const currentData = timeRange === 'week' ? dailyData : monthlyData

  const refreshAnalytics = () => {
    setAllReportsLoaded(false)
    loadAnalyticsData()
  }

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
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={refreshAnalytics}
            style={{
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
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          My Performance Analytics 📈
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          {user?.name || 'User'} • {user?.region || 'All Regions'} • {reports.length} total reports
        </p>
        
        {/* Debug Info */}
        <div style={{ 
          marginTop: '15px', 
          fontSize: '0.85em', 
          opacity: '0.8',
          background: 'rgba(255,255,255,0.1)',
          padding: '6px 12px',
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          📊 Showing: {filteredReports.length} reports in {timeRange === 'week' ? 'weekly' : timeRange === 'month' ? 'monthly' : '3-month'} view
        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '1.2em' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={refreshAnalytics}
              style={{
                padding: '6px 12px',
                background: '#721c24',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Retry
            </button>
          </div>
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
                transition: 'all 0.3s ease',
                minWidth: '120px'
              }}
            >
              {range === '3months' ? 'Quarterly' : 
               range === 'week' ? 'Weekly' : 'Monthly'}
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
          subtitle={`${totals.reports} reports`}
        />
        <StatCard 
          value={totals.pharmacies + totals.dispensaries} 
          label="Facilities Visited"
          color="#2ecc71"
          icon="💊"
          subtitle={`${totals.pharmacies} pharmacies + ${totals.dispensaries} dispensaries`}
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders"
          color="#e74c3c"
          icon="📦"
          subtitle={totals.reports > 0 ? `${(totals.orders / totals.reports).toFixed(1)} avg per report` : 'No orders'}
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Revenue"
          color="#f39c12"
          icon="💰"
          subtitle={totals.orders > 0 ? `RWF ${Math.round(totals.value / totals.orders).toLocaleString()} avg per order` : 'No revenue'}
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
            {timeRange === 'week' ? '📅 Daily Performance (Last 14 days)' : 
             timeRange === 'month' ? '📅 Monthly Performance (Last 6 months)' : 
             '📅 Quarterly Performance'}
          </h2>
          <div style={{ 
            fontSize: '0.9em', 
            color: '#7f8c8d',
            background: '#f8f9fa',
            padding: '5px 15px',
            borderRadius: '20px'
          }}>
            {currentData.length} {timeRange === 'week' ? 'days' : 'months'} shown
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
              No Data Available for Selected Period
            </h3>
            <p style={{ margin: '0', fontSize: '1.1em', maxWidth: '500px', margin: '0 auto 20px' }}>
              {reports.length === 0 
                ? "You haven't submitted any reports yet. Start by submitting your first daily report to see your analytics!"
                : `You have ${reports.length} total reports in the system, but none in the selected ${timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : '3-month'} period.`
              }
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              {reports.length === 0 && (
                <button 
                  onClick={() => window.location.href = '/daily-report'}
                  style={{
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
              <button 
                onClick={() => setTimeRange('3months')}
                style={{
                  padding: '12px 25px',
                  background: '#f8f9fa',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  borderRadius: '25px',
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                View All Time Data
              </button>
            </div>
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
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>👨‍⚕️ Doctors</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>💊 Pharmacies</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>🏥 Dispensaries</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>📦 Orders</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>💰 Revenue (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((item, index) => (
                  <AnalyticsRow 
                    key={item.date || item.monthKey || index} 
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
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📊 Average Daily/Monthly Doctors:</strong> {Math.round(totals.doctors / Math.max(currentData.length, 1))}
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📈 Order Conversion Rate:</strong> {totals.doctors > 0 ? ((totals.orders / totals.doctors) * 100).toFixed(1) : 0}%
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>💰 Average Order Value:</strong> RWF {totals.orders > 0 ? Math.round(totals.value / totals.orders).toLocaleString() : 0}
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📅 Active Days/Months:</strong> {totals.reports} reports ({Math.round((totals.reports / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)) * 100)}% active)
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
        textAlign: 'center',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '5px' }}>
          <span>📊</span>
          <strong>Data Source:</strong> 
          <span>Based on {reports.length} total reports from your account.</span>
        </div>
        <div style={{ fontSize: '0.85em', opacity: '0.8' }}>
          Showing {currentData.length} {timeRange === 'week' ? 'daily' : 'monthly'} entries • 
          Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
    </div>
  )
}

// Analytics Row Component
const AnalyticsRow = ({ item, index, timeRange }) => {
  return (
    <tr style={{ 
      borderBottom: '1px solid #e9ecef',
      background: index % 2 === 0 ? '#f8f9fa' : 'white',
      transition: 'background-color 0.2s ease',
      ':hover': {
        background: '#e9ecef'
      }
    }}>
      <td style={{ 
        padding: '15px', 
        fontWeight: '500', 
        color: '#2c3e50',
        minWidth: '120px'
      }}>
        {timeRange === 'week' ? item.displayDate || item.date : item.month}
        {item.report_count > 0 && timeRange !== 'week' && (
          <div style={{ fontSize: '0.8em', color: '#7f8c8d', marginTop: '3px' }}>
            {item.report_count} report{item.report_count > 1 ? 's' : ''}
          </div>
        )}
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

// Enhanced Stat Card Component
const StatCard = ({ value, label, color, icon, subtitle }) => (
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
      marginBottom: '5px'
    }}>
      {value}
    </div>
    <div style={{ color: '#2c3e50', fontSize: '0.95em', fontWeight: '500', marginBottom: '5px' }}>{label}</div>
    {subtitle && (
      <div style={{ color: '#7f8c8d', fontSize: '0.8em', marginTop: '5px' }}>{subtitle}</div>
    )}
  </div>
)

export default PersonalAnalytics
