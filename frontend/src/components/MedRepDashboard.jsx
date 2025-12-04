import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { reportsAPI } from '../services/api'

const MedRepDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPharmacies: 0,
    totalOrders: 0,
    totalValue: 0,
    totalReports: 0
  })

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      console.log('🔄 Loading dashboard data...')
      setLoading(true)
      
      // Load recent reports - using pagination parameters
      const response = await reportsAPI.getMyReports(1, 10)
      console.log('📊 API Response:', response.data)
      
      if (response.data.success) {
        // Handle different response structures
        let reports = []
        
        if (response.data.data?.reports) {
          reports = response.data.data.reports
        } else if (Array.isArray(response.data.data)) {
          reports = response.data.data
        } else if (Array.isArray(response.data.data?.data)) {
          reports = response.data.data.data
        } else if (response.data.data) {
          reports = [response.data.data]
        }
        
        console.log('📋 Found reports:', reports.length)
        setRecentReports(reports)
        
        // Calculate stats
        const totalStats = reports.reduce((acc, report) => ({
          totalDoctors: acc.totalDoctors + calculateTotalDoctors(report),
          totalPharmacies: acc.totalPharmacies + (report.pharmacies || 0) + (report.dispensaries || 0),
          totalOrders: acc.totalOrders + (report.orders_count || 0),
          totalValue: acc.totalValue + (report.orders_value || 0),
          totalReports: acc.totalReports + 1
        }), {
          totalDoctors: 0,
          totalPharmacies: 0,
          totalOrders: 0,
          totalValue: 0,
          totalReports: 0
        })
        
        setStats(totalStats)
      } else {
        console.warn('API returned unsuccessful response:', response.data)
        // Fallback: Try to get all reports and filter by user
        await tryFallbackLoad()
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      console.error('Error details:', error.response?.data || error.message)
      // Fallback on error
      await tryFallbackLoad()
    } finally {
      setLoading(false)
    }
  }

  // Fallback method if getMyReports fails
  const tryFallbackLoad = async () => {
    try {
      console.log('🔄 Trying fallback load method...')
      const allResponse = await reportsAPI.getAll()
      
      if (allResponse.data.success) {
        const allReports = allResponse.data.data || []
        console.log('📋 Total reports from getAll:', allReports.length)
        
        // Filter reports for current user
        const userId = user?._id || user?.id
        const myReports = allReports.filter(report => {
          const reportUserId = report.user_id?._id || report.user_id || report.user
          return reportUserId === userId
        })
        
        console.log('👤 Filtered reports for current user:', myReports.length)
        setRecentReports(myReports)
        
        // Calculate stats
        const totalStats = myReports.reduce((acc, report) => ({
          totalDoctors: acc.totalDoctors + calculateTotalDoctors(report),
          totalPharmacies: acc.totalPharmacies + (report.pharmacies || 0) + (report.dispensaries || 0),
          totalOrders: acc.totalOrders + (report.orders_count || 0),
          totalValue: acc.totalValue + (report.orders_value || 0),
          totalReports: acc.totalReports + 1
        }), {
          totalDoctors: 0,
          totalPharmacies: 0,
          totalOrders: 0,
          totalValue: 0,
          totalReports: 0
        })
        
        setStats(totalStats)
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
      // Use empty data
      setRecentReports([])
      setStats({
        totalDoctors: 0,
        totalPharmacies: 0,
        totalOrders: 0,
        totalValue: 0,
        totalReports: 0
      })
    }
  }

  // Listen for report submission events
  useEffect(() => {
    loadDashboardData()
    
    const handleReportSubmitted = () => {
      console.log('📢 Report submitted event received, refreshing dashboard...')
      loadDashboardData()
    }
    
    window.addEventListener('reportSubmitted', handleReportSubmitted)
    
    return () => {
      window.removeEventListener('reportSubmitted', handleReportSubmitted)
    }
  }, [lastRefresh])

  // Calculate total doctors from a report
  const calculateTotalDoctors = (report) => {
    if (!report) return 0
    return (
      (report.dentists || 0) +
      (report.physiotherapists || 0) +
      (report.gynecologists || 0) +
      (report.internists || 0) +
      (report.general_practitioners || 0) +
      (report.pediatricians || 0) +
      (report.dermatologists || 0)
    )
  }

  // Navigation handlers
  const navigateToDailyReport = () => navigate('/daily-report')
  const navigateToReports = () => navigate('/reports')
  const navigateToAnalytics = () => navigate('/analytics')
  const navigateToProfile = () => navigate('/profile')

  // Refresh dashboard
  const refreshDashboard = () => {
    console.log('🔄 Manual refresh triggered')
    setLastRefresh(Date.now())
  }

  // Handle logout
  const handleLogout = () => {
    logout()
  }

  if (loading && recentReports.length === 0) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Welcome back, {user?.name || 'User'}! 👋</h1>
            <p className="header-subtitle">
              {user?.role === 'supervisor' ? 'Supervisor' : 'Medical Representative'} • 
              {user?.region ? ` ${user.region} Region` : ''} • 
              {stats.totalReports > 0 ? ` ${stats.totalReports} reports` : ' No reports yet'}
            </p>
          </div>
          <div className="header-actions">
            <button
              onClick={refreshDashboard}
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

      {/* Stats Summary */}
      <div className="stats-grid">
        <StatCard 
          icon="📋"
          value={stats.totalReports} 
          label="Total Reports"
          color="#3b82f6"
        />
        <StatCard 
          icon="👨‍⚕️"
          value={stats.totalDoctors} 
          label="Doctors Visited"
          color="#10b981"
        />
        <StatCard 
          icon="💊"
          value={stats.totalPharmacies} 
          label="Pharmacies Visited"
          color="#f59e0b"
        />
        <StatCard 
          icon="💰"
          value={`RWF ${stats.totalValue.toLocaleString()}`} 
          label="Total Orders Value"
          color="#8b5cf6"
        />
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Quick Actions */}
        <div className="quick-actions-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="actions-grid">
            <ActionButton 
              icon="📝"
              text="Submit Daily Report" 
              onClick={navigateToDailyReport}
              color="#3b82f6"
            />
            <ActionButton 
              icon="📊"
              text="View All Reports" 
              onClick={navigateToReports}
              color="#10b981"
            />
            <ActionButton 
              icon="📈"
              text="Performance Analytics" 
              onClick={navigateToAnalytics}
              color="#f59e0b"
            />
            <ActionButton 
              icon="👤"
              text="My Profile" 
              onClick={navigateToProfile}
              color="#8b5cf6"
            />
            <ActionButton 
              icon="🚪"
              text="Logout" 
              onClick={handleLogout}
              color="#64748b"
            />
          </div>
        </div>

        {/* Recent Reports */}
        <div className="reports-card">
          <div className="card-header">
            <h3>Recent Reports</h3>
          </div>
          
          {recentReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h4>No Reports Yet</h4>
              <p>You haven't submitted any daily reports yet.</p>
              <button 
                onClick={navigateToDailyReport}
                className="primary-button"
              >
                Submit Your First Report
              </button>
            </div>
          ) : (
            <div className="reports-list">
              {recentReports.map((report, index) => (
                <ReportCard key={report._id || report.id || index} report={report} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="tips-card">
        <div className="card-header">
          <h3>Performance Tips</h3>
        </div>
        <div className="tips-grid">
          <div className="tip-item">
            <div className="tip-icon">📅</div>
            <div>
              <div className="tip-title">Plan Ahead</div>
              <div className="tip-text">Schedule your visits efficiently</div>
            </div>
          </div>
          <div className="tip-item">
            <div className="tip-icon">📝</div>
            <div>
              <div className="tip-title">Detailed Notes</div>
              <div className="tip-text">Document specific doctor feedback</div>
            </div>
          </div>
          <div className="tip-item">
            <div className="tip-icon">🔄</div>
            <div>
              <div className="tip-title">Follow Up</div>
              <div className="tip-text">Maintain regular contact with key clinics</div>
            </div>
          </div>
          <div className="tip-item">
            <div className="tip-icon">📊</div>
            <div>
              <div className="tip-title">Analyze</div>
              <div className="tip-text">Review your weekly performance patterns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ icon, value, label, color }) => (
  <div className="stat-card" style={{ borderColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: `${color}15` }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value" style={{ color: color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)

// Action Button Component
const ActionButton = ({ icon, text, onClick, color }) => (
  <button 
    onClick={onClick}
    className="action-button"
    style={{ backgroundColor: color }}
  >
    <span className="action-icon">{icon}</span>
    <span className="action-text">{text}</span>
    <span className="action-arrow">→</span>
  </button>
)

// Report Card Component
const ReportCard = ({ report }) => {
  const totalDoctors = (
    (report.dentists || 0) +
    (report.physiotherapists || 0) +
    (report.gynecologists || 0) +
    (report.internists || 0) +
    (report.general_practitioners || 0) +
    (report.pediatricians || 0) +
    (report.dermatologists || 0)
  )
  
  const totalVisits = totalDoctors + (report.pharmacies || 0) + (report.dispensaries || 0)
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <div className="report-card">
      <div className="report-main">
        <div className="report-icon">
          {report.orders_count > 0 ? '📦' : '📋'}
        </div>
        <div className="report-details">
          <div className="report-title">
            {formatDate(report.report_date)}
          </div>
          <div className="report-subtitle">
            {report.region || 'No region'} • {totalVisits} total visits
          </div>
          
          {report.summary && (
            <div className="report-summary">
              {report.summary.length > 80 ? report.summary.substring(0, 80) + '...' : report.summary}
            </div>
          )}
        </div>
      </div>
      
      <div className="report-stats">
        <div className="stat-row">
          <span className="orders-count">
            {report.orders_count || 0} orders
          </span>
          <div className={`status-dot ${report.orders_count > 0 ? 'active' : 'inactive'}`}></div>
        </div>
        <div className="orders-value">
          RWF {(report.orders_value || 0).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// CSS Styles
const styles = `
.dashboard-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Loading State */
.dashboard-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  flex-direction: column;
  gap: 20px;
}

.dashboard-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.dashboard-loading .loading-text {
  color: #3b82f6;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dashboard Header */
.dashboard-header {
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

.dashboard-header h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-top: 3px solid;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* Dashboard Content */
.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
  margin-bottom: 30px;
}

@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

/* Cards */
.quick-actions-card,
.reports-card,
.tips-card {
  background: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-header {
  margin-bottom: 24px;
}

.card-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

/* Quick Actions */
.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  color: white;
  border-radius: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  font-size: 15px;
  width: 100%;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.action-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.action-button:hover::before {
  left: 100%;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.action-icon {
  font-size: 20px;
  margin-right: 15px;
  width: 30px;
  flex-shrink: 0;
}

.action-text {
  font-size: 15px;
  font-weight: 500;
  flex: 1;
}

.action-arrow {
  font-size: 18px;
  opacity: 0.7;
  transition: transform 0.3s ease;
}

.action-button:hover .action-arrow {
  transform: translateX(4px);
  opacity: 1;
}

/* Reports Card */
.reports-card {
  min-height: 300px;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Report Card */
.report-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.report-card:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
  transform: translateX(4px);
}

.report-main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.report-icon {
  font-size: 20px;
  background: #3b82f6;
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-details {
  flex: 1;
}

.report-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 16px;
  margin-bottom: 4px;
}

.report-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.report-summary {
  font-size: 14px;
  color: #475569;
  margin-top: 8px;
  padding: 8px;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #10b981;
  line-height: 1.5;
}

.report-stats {
  text-align: right;
  min-width: 120px;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 4px;
}

.orders-count {
  color: #10b981;
  font-weight: 600;
  font-size: 15px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.active {
  background: #10b981;
}

.status-dot.inactive {
  background: #94a3b8;
}

.orders-value {
  font-size: 14px;
  color: #64748b;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 10px;
  border: 2px dashed #cbd5e1;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 10px 0;
  color: #475569;
  font-size: 18px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 15px;
}

.primary-button {
  display: inline-block;
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

/* Tips Card */
.tips-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fbbf24;
}

.tips-card .card-header h3 {
  color: #92400e;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.tip-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tip-title {
  font-weight: 600;
  color: #92400e;
  font-size: 15px;
  margin-bottom: 4px;
}

.tip-text {
  color: #92400e;
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.4;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header {
    padding: 24px;
  }
  
  .dashboard-header h1 {
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
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .tip-item {
    flex-direction: column;
    text-align: center;
  }
  
  .tip-icon {
    margin: 0 auto;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .report-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .report-stats {
    text-align: left;
    width: 100%;
  }
  
  .stat-row {
    justify-content: flex-start;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default MedRepDashboard
