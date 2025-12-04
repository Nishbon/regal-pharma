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
  const filteredReports = getFilteredReports()

  const refreshAnalytics = () => {
    setAllReportsLoaded(false)
    loadAnalyticsData()
  }

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading your analytics...</div>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div>
            <h1>My Performance Analytics</h1>
            <p className="header-subtitle">
              {user?.name || 'User'} • {user?.region || 'All Regions'} • {reports.length} total reports
            </p>
            
            {/* Debug Info */}
            <div className="debug-info">
              Showing: {filteredReports.length} reports in {timeRange === 'week' ? 'weekly' : timeRange === 'month' ? 'monthly' : '3-month'} view
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={refreshAnalytics}
              className="refresh-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 9.00001C4.01717 7.5668 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55977 10.0083 3.22426C11.4911 2.88875 13.0348 2.93436 14.4952 3.35677C15.9556 3.77918 17.2853 4.56471 18.36 5.64001L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0656 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-card">
          <div className="error-content">
            <div className="error-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="error-text">
              <div className="error-title">Error</div>
              <div>{error}</div>
            </div>
          </div>
          <button 
            onClick={refreshAnalytics}
            className="error-retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <div className="range-buttons">
          {['week', 'month', '3months'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`range-button ${timeRange === range ? 'active' : ''}`}
            >
              {range === '3months' ? 'Quarterly' : 
               range === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <StatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#3b82f6"
          icon="👨‍⚕️"
          subtitle={`${totals.reports} reports`}
        />
        <StatCard 
          value={totals.pharmacies + totals.dispensaries} 
          label="Facilities Visited"
          color="#10b981"
          icon="💊"
          subtitle={`${totals.pharmacies} pharmacies + ${totals.dispensaries} dispensaries`}
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders"
          color="#f59e0b"
          icon="📦"
          subtitle={totals.reports > 0 ? `${(totals.orders / totals.reports).toFixed(1)} avg per report` : 'No orders'}
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Revenue"
          color="#8b5cf6"
          icon="💰"
          subtitle={totals.orders > 0 ? `RWF ${Math.round(totals.value / totals.orders).toLocaleString()} avg per order` : 'No revenue'}
        />
      </div>

      {/* Analytics Content */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>
            {timeRange === 'week' ? 'Daily Performance (Last 14 days)' : 
             timeRange === 'month' ? 'Monthly Performance (Last 6 months)' : 
             'Quarterly Performance'}
          </h2>
          <div className="data-count">
            {currentData.length} {timeRange === 'week' ? 'days' : 'months'} shown
          </div>
        </div>

        {currentData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17H15M9 13H15M9 9H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>No Data Available for Selected Period</h3>
            <p>
              {reports.length === 0 
                ? "You haven't submitted any reports yet. Start by submitting your first daily report to see your analytics!"
                : `You have ${reports.length} total reports in the system, but none in the selected ${timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : '3-month'} period.`
              }
            </p>
            <div className="empty-actions">
              {reports.length === 0 && (
                <button 
                  onClick={() => window.location.href = '/daily-report'}
                  className="primary-button"
                >
                  Submit Your First Report
                </button>
              )}
              <button 
                onClick={() => setTimeRange('3months')}
                className="secondary-button"
              >
                View All Time Data
              </button>
            </div>
          </div>
        ) : (
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>{timeRange === 'week' ? 'Date' : 'Month'}</th>
                  <th>
                    <div className="table-header-cell">
                      <span className="table-icon">👨‍⚕️</span>
                      <span>Doctors</span>
                    </div>
                  </th>
                  <th>
                    <div className="table-header-cell">
                      <span className="table-icon">💊</span>
                      <span>Pharmacies</span>
                    </div>
                  </th>
                  <th>
                    <div className="table-header-cell">
                      <span className="table-icon">🏥</span>
                      <span>Dispensaries</span>
                    </div>
                  </th>
                  <th>
                    <div className="table-header-cell">
                      <span className="table-icon">📦</span>
                      <span>Orders</span>
                    </div>
                  </th>
                  <th>
                    <div className="table-header-cell">
                      <span className="table-icon">💰</span>
                      <span>Revenue (RWF)</span>
                    </div>
                  </th>
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
              <tfoot>
                <tr className="table-total">
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    {currentData.reduce((sum, item) => sum + (item.total_doctors || 0), 0)}
                  </td>
                  <td>
                    {currentData.reduce((sum, item) => sum + (item.total_pharmacies || 0), 0)}
                  </td>
                  <td>
                    {currentData.reduce((sum, item) => sum + (item.total_dispensaries || 0), 0)}
                  </td>
                  <td>
                    {currentData.reduce((sum, item) => sum + (item.total_orders || 0), 0)}
                  </td>
                  <td>
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
        <div className="insights-card">
          <div className="card-header">
            <h2>Performance Insights</h2>
          </div>
          <div className="insights-grid">
            <div className="insight-item">
              <div className="insight-icon">📊</div>
              <div>
                <div className="insight-title">Average Daily/Monthly Doctors</div>
                <div className="insight-value">{Math.round(totals.doctors / Math.max(currentData.length, 1))}</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon">📈</div>
              <div>
                <div className="insight-title">Order Conversion Rate</div>
                <div className="insight-value">{totals.doctors > 0 ? ((totals.orders / totals.doctors) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon">💰</div>
              <div>
                <div className="insight-title">Average Order Value</div>
                <div className="insight-value">RWF {totals.orders > 0 ? Math.round(totals.value / totals.orders).toLocaleString() : 0}</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon">📅</div>
              <div>
                <div className="insight-title">Active Days/Months</div>
                <div className="insight-value">
                  {totals.reports} reports ({Math.round((totals.reports / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)) * 100)}% active)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Info */}
      <div className="data-source">
        <div className="source-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 17H15M9 13H15M9 9H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Data Source:</span>
          <span>Based on {reports.length} total reports from your account.</span>
        </div>
        <div className="source-meta">
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
    <tr className={`analytics-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
      <td className="row-date">
        <div className="date-main">{timeRange === 'week' ? item.displayDate || item.date : item.month}</div>
        {item.report_count > 0 && timeRange !== 'week' && (
          <div className="date-count">
            {item.report_count} report{item.report_count > 1 ? 's' : ''}
          </div>
        )}
      </td>
      <td className="row-doctors">{item.total_doctors || 0}</td>
      <td className="row-pharmacies">{item.total_pharmacies || 0}</td>
      <td className="row-dispensaries">{item.total_dispensaries || 0}</td>
      <td className="row-orders">{item.total_orders || 0}</td>
      <td className="row-revenue">{(item.total_value || 0).toLocaleString()}</td>
    </tr>
  )
}

// Enhanced Stat Card Component
const StatCard = ({ value, label, color, icon, subtitle }) => (
  <div className="analytics-stat-card" style={{ borderColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: `${color}15` }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value" style={{ color: color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && (
        <div className="stat-subtitle">{subtitle}</div>
      )}
    </div>
  </div>
)

// CSS Styles
const styles = `
.analytics-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Loading State */
.analytics-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  flex-direction: column;
  gap: 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 16px;
  color: white;
  font-size: 18px;
}

.analytics-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.analytics-loading .loading-text {
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Header */
.analytics-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 40px;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.analytics-header h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-subtitle {
  margin: 0 0 12px 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
}

.debug-info {
  font-size: 14px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 8px;
  display: inline-block;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh-button {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.refresh-button svg {
  width: 16px;
  height: 16px;
}

/* Error Card */
.error-card {
  background: #fef2f2;
  color: #991b1b;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 1px solid #fecaca;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
}

.error-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.error-retry {
  padding: 8px 16px;
  background: #991b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.error-retry:hover {
  background: #7f1d1d;
}

/* Time Range Selector */
.time-range-selector {
  text-align: center;
  margin-bottom: 30px;
}

.range-buttons {
  display: inline-flex;
  background: white;
  padding: 6px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.range-button {
  padding: 12px 32px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  text-transform: capitalize;
  font-size: 15px;
  transition: all 0.3s ease;
  min-width: 140px;
}

.range-button:hover {
  background: #f8fafc;
  color: #475569;
}

.range-button.active {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.analytics-stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-top: 3px solid;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.analytics-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.analytics-stat-card .stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.analytics-stat-card .stat-content {
  flex: 1;
  min-width: 0;
}

.analytics-stat-card .stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.analytics-stat-card .stat-label {
  font-size: 14px;
  color: #475569;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}

.analytics-stat-card .stat-subtitle {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

/* Analytics Card */
.analytics-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
  border: 1px solid #e2e8f0;
}

.analytics-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.analytics-card h2 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.data-count {
  font-size: 14px;
  color: #64748b;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-state h3 {
  margin: 0 0 16px 0;
  color: #475569;
  font-size: 18px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 auto 24px;
  font-size: 15px;
  max-width: 500px;
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.primary-button {
  padding: 12px 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
  transition: all 0.3s ease;
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.secondary-button {
  padding: 12px 24px;
  background: #f8fafc;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-button:hover {
  background: #f1f5f9;
}

/* Analytics Table */
.analytics-table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.analytics-table thead {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #e2e8f0;
}

.analytics-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.table-header-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-icon {
  font-size: 16px;
}

.analytics-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

/* Table Rows */
.analytics-row {
  transition: background-color 0.2s ease;
}

.analytics-row:hover {
  background: #f8fafc;
}

.analytics-row.even {
  background: #ffffff;
}

.analytics-row.odd {
  background: #f8fafc;
}

.row-date {
  font-weight: 500;
  color: #1e293b;
  min-width: 140px;
}

.date-main {
  font-size: 15px;
  font-weight: 600;
}

.date-count {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.row-doctors { color: #3b82f6; font-weight: 600; font-size: 15px; text-align: center; }
.row-pharmacies { color: #10b981; font-weight: 600; font-size: 15px; text-align: center; }
.row-dispensaries { color: #06b6d4; font-weight: 600; font-size: 15px; text-align: center; }
.row-orders { color: #f59e0b; font-weight: 600; font-size: 15px; text-align: center; }
.row-revenue { color: #8b5cf6; font-weight: 600; font-size: 15px; text-align: right; min-width: 120px; }

/* Table Footer */
.table-total {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-weight: 600;
}

.table-total td {
  border-bottom: none;
  padding: 16px;
  font-size: 15px;
}

.table-total .row-date {
  color: white;
}

.table-total .row-doctors,
.table-total .row-pharmacies,
.table-total .row-dispensaries,
.table-total .row-orders,
.table-total .row-revenue {
  color: white;
  text-align: center;
}

.table-total .row-revenue {
  text-align: right;
}

/* Insights Card */
.insights-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 32px;
  border-radius: 16px;
  margin-bottom: 30px;
  border: 1px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
}

.insights-card .card-header h2 {
  color: #92400e;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  transition: transform 0.2s ease;
}

.insight-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.9);
}

.insight-icon {
  font-size: 24px;
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.insight-title {
  font-weight: 600;
  color: #92400e;
  font-size: 14px;
  margin-bottom: 4px;
}

.insight-value {
  color: #92400e;
  font-size: 18px;
  font-weight: 700;
}

/* Data Source */
.data-source {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
  font-size: 14px;
  color: #64748b;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.source-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
}

.source-info svg {
  opacity: 0.7;
}

.source-meta {
  font-size: 13px;
  opacity: 0.8;
}

/* Responsive */
@media (max-width: 768px) {
  .analytics-container {
    padding: 16px;
  }
  
  .analytics-header {
    padding: 24px;
  }
  
  .analytics-header h1 {
    font-size: 24px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .refresh-button {
    flex: 1;
    justify-content: center;
  }
  
  .range-buttons {
    width: 100%;
  }
  
  .range-button {
    flex: 1;
    min-width: 0;
    padding: 12px;
    font-size: 14px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .analytics-card {
    padding: 20px;
  }
  
  .analytics-card .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .data-count {
    align-self: flex-start;
  }
  
  .insights-grid {
    grid-template-columns: 1fr;
  }
  
  .analytics-table th,
  .analytics-table td {
    padding: 12px;
    font-size: 14px;
  }
  
  .empty-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .primary-button,
  .secondary-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .analytics-stat-card {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .analytics-stat-card .stat-icon {
    margin: 0 auto;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default PersonalAnalytics
