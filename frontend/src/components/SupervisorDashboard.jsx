import React, { useState, useEffect } from 'react'
import { reportsAPI, usersAPI, analyticsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const SupervisorDashboard = () => {
  const { user } = useAuth()
  const [teamReports, setTeamReports] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState('month')

  useEffect(() => {
    loadTeamData()
  }, [timeRange])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('👑 Loading supervisor dashboard data...')
      
      const usersResponse = await usersAPI.getAll()
      console.log('👥 Users response:', usersResponse.data)
      
      if (usersResponse.data.success) {
        const usersData = usersResponse.data.data || []
        setAllUsers(usersData)
        
        try {
          const teamPerformanceResponse = await analyticsAPI.getTeamPerformance(timeRange)
          console.log('📊 Team performance API response:', teamPerformanceResponse.data)
          
          if (teamPerformanceResponse.data.success) {
            const teamData = teamPerformanceResponse.data.data || []
            setTeamReports(teamData)
          } else {
            await loadTeamDataManually(usersData)
          }
        } catch (analyticsError) {
          console.log('Analytics API failed, using manual calculation:', analyticsError)
          await loadTeamDataManually(usersData)
        }
      }
    } catch (error) {
      console.error('❌ Error loading team data:', error)
      setError(error.response?.data?.message || 'Failed to load team data')
    }
    setLoading(false)
  }

  const loadTeamDataManually = async (usersData) => {
    try {
      const allReportsResponse = await reportsAPI.getAll()
      console.log('📋 All reports response:', allReportsResponse.data)
      
      if (allReportsResponse.data.success) {
        const allReports = allReportsResponse.data.data || []
        console.log('📊 Total reports found:', allReports.length)
        
        const now = new Date()
        const cutoffDate = new Date()
        
        if (timeRange === 'week') {
          cutoffDate.setDate(now.getDate() - 7)
        } else if (timeRange === 'month') {
          cutoffDate.setDate(now.getDate() - 30)
        } else {
          cutoffDate.setDate(now.getDate() - 90)
        }
        
        const filteredReports = allReports.filter(report => {
          try {
            const reportDate = new Date(report.report_date || report.createdAt)
            return reportDate >= cutoffDate
          } catch (e) {
            return false
          }
        })
        
        console.log('📅 Reports in time range:', filteredReports.length)
        
        const reportsByUser = {}
        
        filteredReports.forEach(report => {
          try {
            const userId = report.user_id?._id || report.user_id
            
            if (!reportsByUser[userId]) {
              reportsByUser[userId] = {
                user_id: userId,
                reports: [],
                total_doctors: 0,
                total_pharmacies: 0,
                total_dispensaries: 0,
                total_orders: 0,
                total_value: 0
              }
            }
            
            reportsByUser[userId].reports.push(report)
            
            const doctors = 
              (report.dentists || 0) +
              (report.physiotherapists || 0) +
              (report.gynecologists || 0) +
              (report.internists || 0) +
              (report.general_practitioners || 0) +
              (report.pediatricians || 0) +
              (report.dermatologists || 0)
            
            reportsByUser[userId].total_doctors += doctors
            reportsByUser[userId].total_pharmacies += (report.pharmacies || 0)
            reportsByUser[userId].total_dispensaries += (report.dispensaries || 0)
            reportsByUser[userId].total_orders += (report.orders_count || 0)
            reportsByUser[userId].total_value += (report.orders_value || 0)
          } catch (err) {
            console.warn('Error processing report:', err)
          }
        })
        
        const performanceData = Object.values(reportsByUser)
          .map(userData => {
            const userInfo = usersData.find(u => 
              u._id === userData.user_id || u.id === userData.user_id
            )
            
            if (!userInfo) return null
            
            return {
              user_id: userData.user_id,
              user_name: userInfo?.name || 'Unknown User',
              user_email: userInfo?.email,
              region: userInfo?.region || 'Unknown',
              reports_count: userData.reports.length,
              total_doctors: userData.total_doctors,
              total_pharmacies: userData.total_pharmacies,
              total_dispensaries: userData.total_dispensaries,
              total_orders: userData.total_orders,
              total_value: userData.total_value
            }
          })
          .filter(Boolean)
        
        console.log('📈 Team performance data (manual):', performanceData)
        setTeamReports(performanceData)
      }
    } catch (manualError) {
      console.error('Manual calculation failed:', manualError)
      setTeamReports([])
    }
  }

  const downloadMonthlyReport = async (userId = null) => {
    const userName = userId 
      ? allUsers.find(u => u._id === userId || u.id === userId)?.name 
      : 'All Team'
    alert(`📊 Generating monthly PDF report for ${userName}\n\nThis feature will generate a comprehensive PDF report with detailed performance metrics.`)
  }

  const getTopPerformer = () => {
    if (teamReports.length === 0) return null
    return teamReports.reduce((top, current) => 
      (current.total_value || 0) > (top.total_value || 0) ? current : top
    )
  }

  const refreshDashboard = () => {
    setLoading(true)
    loadTeamData()
  }

  if (loading && teamReports.length === 0) {
    return (
      <div className="supervisor-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading team dashboard...</div>
      </div>
    )
  }

  const activeMedReps = allUsers.filter(user => user.role === 'medrep' && user.is_active !== false)
  const topPerformer = getTopPerformer()
  const totals = teamReports.reduce((acc, user) => ({
    doctors: acc.doctors + (user.total_doctors || 0),
    pharmacies: acc.pharmacies + (user.total_pharmacies || 0),
    dispensaries: acc.dispensaries + (user.total_dispensaries || 0),
    orders: acc.orders + (user.total_orders || 0),
    value: acc.value + (user.total_value || 0),
    reports: acc.reports + (user.reports_count || 0)
  }), { 
    doctors: 0, 
    pharmacies: 0, 
    dispensaries: 0, 
    orders: 0, 
    value: 0,
    reports: 0 
  })

  return (
    <div className="supervisor-container">
      {/* Header */}
      <div className="supervisor-header">
        <div className="header-content">
          <div>
            <h1>Team Management Dashboard</h1>
            <p className="header-subtitle">
              {user?.name || 'Supervisor'} • {activeMedReps.length} active medreps • {teamReports.length} team members with reports
            </p>
            
            {/* Debug Info */}
            <div className="debug-info">
              Showing: {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'} data
            </div>
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
            onClick={refreshDashboard}
            className="error-retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="stats-grid">
        <StatCard 
          value={activeMedReps.length} 
          label="Active MedReps"
          color="#3b82f6"
          icon="👥"
        />
        <StatCard 
          value={teamReports.length} 
          label="Reporting MedReps"
          color="#10b981"
          icon="📊"
        />
        <StatCard 
          value={totals.reports} 
          label="Total Reports"
          color="#f59e0b"
          icon="📝"
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Team Revenue"
          color="#8b5cf6"
          icon="💰"
        />
      </div>

      {/* Data Section */}
      <div className="dashboard-content">
        {/* Top Performer Card */}
        <div className="performer-card">
          <div className="card-header">
            <h3>Top Performer</h3>
          </div>
          
          {topPerformer ? (
            <div className="performer-content">
              <div className="performer-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="performer-name">
                {topPerformer.user_name}
              </div>
              <div className="performer-details">
                {topPerformer.region} • {topPerformer.reports_count} reports
              </div>
              
              <div className="performer-stats">
                <div className="stat-highlight">
                  <div className="stat-value-highlight">
                    RWF {(topPerformer.total_value || 0).toLocaleString()}
                  </div>
                  <div className="stat-label-highlight">Total Revenue</div>
                </div>
                
                <div className="stat-breakdown">
                  <div className="stat-item-breakdown">
                    <div className="stat-value-breakdown">{topPerformer.total_doctors || 0}</div>
                    <div className="stat-label-breakdown">Doctors</div>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item-breakdown">
                    <div className="stat-value-breakdown">{topPerformer.total_orders || 0}</div>
                    <div className="stat-label-breakdown">Orders</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-performer">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17H15M9 13H15M9 9H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="empty-title">No performance data available</div>
              <div className="empty-text">Submit reports to see team performance</div>
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div className="team-card">
          <div className="card-header">
            <div className="header-title">
              <h3>Team Performance</h3>
              <div className="time-range-label">
                {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'}
              </div>
            </div>
            <div className="header-controls">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-select"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="3months">Last 3 Months</option>
              </select>
              <button
                onClick={refreshDashboard}
                className="update-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.51 9.00001C4.01717 7.5668 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55977 10.0083 3.22426C11.4911 2.88875 13.0348 2.93436 14.4952 3.35677C15.9556 3.77918 17.2853 4.56471 18.36 5.64001L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0656 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Update
              </button>
            </div>
          </div>
          
          {teamReports.length === 0 ? (
            <div className="empty-team">
              <div className="empty-icon">👥</div>
              <h4>No Team Data Available</h4>
              <p>
                {activeMedReps.length > 0 
                  ? 'Team members haven\'t submitted any reports in the selected time period.'
                  : 'No active medical representatives found in the system.'
                }
              </p>
            </div>
          ) : (
            <div className="team-list">
              {teamReports.map((member, index) => (
                <TeamMemberCard 
                  key={member.user_id || index} 
                  member={member} 
                  onDownloadReport={downloadMonthlyReport}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      {teamReports.length > 0 && (
        <div className="team-stats-card">
          <div className="card-header">
            <h3>Team Statistics</h3>
          </div>
          <div className="stats-details">
            <div className="stat-detail">
              <div className="stat-icon-detail">💰</div>
              <div>
                <div className="stat-title-detail">Average Revenue per Rep</div>
                <div className="stat-value-detail">RWF {Math.round(totals.value / Math.max(teamReports.length, 1)).toLocaleString()}</div>
              </div>
            </div>
            <div className="stat-detail">
              <div className="stat-icon-detail">📊</div>
              <div>
                <div className="stat-title-detail">Active Reporting</div>
                <div className="stat-value-detail">{teamReports.length} of {activeMedReps.length} active ({Math.round((teamReports.length / Math.max(activeMedReps.length, 1)) * 100)}%)</div>
              </div>
            </div>
            <div className="stat-detail">
              <div className="stat-icon-detail">📝</div>
              <div>
                <div className="stat-title-detail">Average Reports per Rep</div>
                <div className="stat-value-detail">{Math.round(totals.reports / Math.max(teamReports.length, 1))} reports</div>
              </div>
            </div>
            <div className="stat-detail">
              <div className="stat-icon-detail">🏥</div>
              <div>
                <div className="stat-title-detail">Total Doctor Visits</div>
                <div className="stat-value-detail">{totals.doctors} visits • {totals.pharmacies + totals.dispensaries} pharmacy visits</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Actions */}
      <div className="actions-card">
        <div className="card-header">
          <h3>Management Actions</h3>
        </div>
        <div className="actions-grid">
          <ActionButton 
            icon="📥"
            title="Export Team Report" 
            description="Generate comprehensive PDF report for the entire team with performance analytics"
            onClick={() => downloadMonthlyReport()}
            color="#3b82f6"
          />
          <ActionButton 
            icon="📊"
            title="Detailed Analytics" 
            description="View detailed analytics and performance trends for your team"
            onClick={() => window.location.href = '/analytics'}
            color="#10b981"
          />
          <ActionButton 
            icon="👥"
            title="Team Management" 
            description="Manage team members, roles, and assignments"
            onClick={() => window.location.href = '/users'}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ value, label, color, icon }) => (
  <div className="supervisor-stat-card" style={{ borderColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: `${color}15` }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value" style={{ color: color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)

// Team Member Card Component
const TeamMemberCard = ({ member, onDownloadReport, rank }) => (
  <div className="team-member-card">
    <div className="member-info">
      <div className="rank-badge" style={{
        background: rank <= 3 ? 
          rank === 1 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
          rank === 2 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
          'linear-gradient(135deg, #92400e 0%, #78350f 100%)' :
          'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
      }}>
        {rank}
      </div>
      
      <div className="member-details">
        <div className="member-header">
          <div className="member-name">{member.user_name}</div>
          {rank <= 3 && (
            <span className="rank-label" style={{
              background: rank === 1 ? '#fef3c7' : 
                         rank === 2 ? '#f1f5f9' : '#fef3c7',
              color: rank === 1 ? '#92400e' : 
                     rank === 2 ? '#475569' : '#92400e'
            }}>
              {rank === 1 ? '🥇 Top' : rank === 2 ? '🥈 2nd' : '🥉 3rd'}
            </span>
          )}
        </div>
        <div className="member-meta">
          {member.region} • {member.reports_count || 0} reports
          {member.user_email && ` • ${member.user_email}`}
        </div>
      </div>
    </div>
    
    <div className="member-performance">
      <div className="performance-stats">
        <div className="revenue-stat">
          <div className="revenue-value">
            RWF {(member.total_value || 0).toLocaleString()}
          </div>
          <div className={`revenue-dot ${member.total_value > 0 ? 'active' : 'inactive'}`}></div>
        </div>
        <div className="performance-meta">
          <span>{member.total_doctors || 0} doctors</span>
          <span className="meta-divider">•</span>
          <span>{member.total_orders || 0} orders</span>
        </div>
      </div>
      <button
        onClick={() => onDownloadReport(member.user_id)}
        className="download-button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Report
      </button>
    </div>
  </div>
)

// Action Button Component
const ActionButton = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    className="management-action"
    style={{ borderColor: color }}
  >
    <span className="action-icon" style={{ color: color }}>{icon}</span>
    <div className="action-content">
      <div className="action-title">{title}</div>
      <div className="action-description">{description}</div>
      <div className="action-cta" style={{ color: color }}>
        Click to open →
      </div>
    </div>
  </button>
)

// CSS Styles
const styles = `
.supervisor-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Loading State */
.supervisor-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  flex-direction: column;
  gap: 20px;
}

.supervisor-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.supervisor-loading .loading-text {
  color: #3b82f6;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Header */
.supervisor-header {
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

.supervisor-header h1 {
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.supervisor-stat-card {
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

.supervisor-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.supervisor-stat-card .stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.supervisor-stat-card .stat-content {
  flex: 1;
  min-width: 0;
}

.supervisor-stat-card .stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.supervisor-stat-card .stat-label {
  font-size: 14px;
  color: #475569;
  font-weight: 600;
  line-height: 1.3;
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
.performer-card,
.team-card,
.actions-card,
.team-stats-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.card-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

/* Performer Card */
.performer-content {
  text-align: center;
}

.performer-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px auto;
  color: white;
  box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3);
}

.performer-icon svg {
  width: 32px;
  height: 32px;
}

.performer-name {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.performer-details {
  color: #64748b;
  margin-bottom: 24px;
  font-size: 15px;
}

.performer-stats {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #bbf7d0;
}

.stat-highlight {
  margin-bottom: 20px;
}

.stat-value-highlight {
  color: #16a34a;
  font-weight: 700;
  font-size: 24px;
  margin-bottom: 8px;
}

.stat-label-highlight {
  color: #15803d;
  font-size: 14px;
  font-weight: 500;
}

.stat-breakdown {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px dashed #bbf7d0;
}

.stat-item-breakdown {
  text-align: center;
  flex: 1;
}

.stat-value-breakdown {
  color: #3b82f6;
  font-weight: 600;
  font-size: 18px;
  margin-bottom: 4px;
}

.stat-label-breakdown {
  font-size: 12px;
  color: #64748b;
}

.stat-divider {
  width: 1px;
  background: #bbf7d0;
  margin: 0 20px;
}

.empty-performer {
  text-align: center;
  color: #64748b;
  padding: 40px 20px;
}

.empty-performer .empty-icon svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
  color: #64748b;
}

/* Team Card */
.team-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-range-label {
  font-size: 14px;
  color: #64748b;
  background: #f8fafc;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.time-select {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  font-weight: 500;
  color: #475569;
  transition: border-color 0.2s ease;
}

.time-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.update-button {
  padding: 10px 16px;
  background: #f8fafc;
  color: #3b82f6;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.update-button:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.update-button svg {
  width: 16px;
  height: 16px;
}

.empty-team {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-team .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-team h4 {
  margin: 0 0 12px 0;
  color: #475569;
  font-size: 18px;
  font-weight: 600;
}

.empty-team p {
  margin: 0 auto;
  font-size: 15px;
  max-width: 400px;
  line-height: 1.6;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.team-list::-webkit-scrollbar {
  width: 6px;
}

.team-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.team-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.team-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Team Member Card */
.team-member-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.team-member-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateX(4px);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.rank-badge {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.member-details {
  flex: 1;
  min-width: 0;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.member-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-label {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.member-meta {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  textOverflow: ellipsis;
}

.member-performance {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.performance-stats {
  text-align: right;
  min-width: 120px;
}

.revenue-stat {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 6px;
}

.revenue-value {
  color: #16a34a;
  font-weight: 600;
  font-size: 16px;
}

.revenue-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.revenue-dot.active {
  background: #10b981;
}

.revenue-dot.inactive {
  background: #94a3b8;
}

.performance-meta {
  font-size: 13px;
  color: #64748b;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.meta-divider {
  opacity: 0.5;
}

.download-button {
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
}

.download-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.download-button svg {
  width: 16px;
  height: 16px;
}

/* Team Stats Card */
.team-stats-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
  margin-bottom: 30px;
}

.team-stats-card .card-header h3 {
  color: #92400e;
}

.stats-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-detail {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  transition: transform 0.2s ease;
}

.stat-detail:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.9);
}

.stat-icon-detail {
  font-size: 20px;
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-title-detail {
  font-weight: 600;
  color: #92400e;
  font-size: 14px;
  margin-bottom: 4px;
}

.stat-value-detail {
  color: #92400e;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

/* Actions Card */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.management-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
  background: white;
  border: 2px solid;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  width: 100%;
  height: 100%;
}

.management-action:hover {
  background: #f8fafc;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.action-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.action-content {
  flex: 1;
}

.action-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  font-size: 18px;
}

.action-description {
  font-size: 15px;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 16px;
}

.action-cta {
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .supervisor-container {
    padding: 16px;
  }
  
  .supervisor-header {
    padding: 24px;
  }
  
  .supervisor-header h1 {
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
  
  .team-card .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-controls {
    width: 100%;
  }
  
  .time-select {
    flex: 1;
  }
  
  .team-member-card {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .member-performance {
    width: 100%;
    justify-content: space-between;
  }
  
  .performance-stats {
    min-width: auto;
  }
  
  .stats-details {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .rank-badge {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .member-name {
    font-size: 14px;
  }
  
  .revenue-value {
    font-size: 14px;
  }
  
  .download-button {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .download-button svg {
    width: 14px;
    height: 14px;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default SupervisorDashboard
