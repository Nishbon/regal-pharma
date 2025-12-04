import React, { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const TeamAnalytics = () => {
  const { user } = useAuth()
  const [teamPerformance, setTeamPerformance] = useState([])
  const [regionPerformance, setRegionPerformance] = useState([])
  const [timeRange, setTimeRange] = useState('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTeamAnalytics()
  }, [timeRange])

  const loadTeamAnalytics = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log(`📊 Loading team analytics for ${user?.username || 'supervisor'}, time range: ${timeRange}`)
      
      const [teamResponse, regionResponse] = await Promise.all([
        analyticsAPI.getTeamPerformance(timeRange),
        analyticsAPI.getRegionPerformance()
      ])

      console.log('Team response:', teamResponse.data)
      console.log('Region response:', regionResponse.data)

      if (teamResponse.data.success) {
        setTeamPerformance(teamResponse.data.data || [])
      } else {
        setError(`Team data: ${teamResponse.data.message || 'Failed to load team data'}`)
        setTeamPerformance([])
      }

      if (regionResponse.data.success) {
        setRegionPerformance(regionResponse.data.data || [])
      } else {
        setRegionPerformance([])
      }
    } catch (error) {
      console.error('Failed to load team analytics:', error)
      setError('Failed to load analytics data. Please try again.')
      setTeamPerformance([])
      setRegionPerformance([])
    } finally {
      setLoading(false)
    }
  }

  const getTotals = () => {
    if (!teamPerformance || teamPerformance.length === 0) {
      return { doctors: 0, pharmacies: 0, orders: 0, value: 0, reps: 0, reports: 0 }
    }
    
    return teamPerformance.reduce((totals, user) => ({
      doctors: totals.doctors + (user.total_doctors || 0),
      pharmacies: totals.pharmacies + (user.total_pharmacies || 0),
      orders: totals.orders + (user.total_orders || 0),
      value: totals.value + (user.total_value || 0),
      reps: totals.reps + 1,
      reports: totals.reports + (user.reports_count || 0)
    }), { doctors: 0, pharmacies: 0, orders: 0, value: 0, reps: 0, reports: 0 })
  }

  const refreshData = () => {
    setLoading(true)
    loadTeamAnalytics()
  }

  if (loading) {
    return (
      <div className="team-analytics-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading team analytics...</div>
      </div>
    )
  }

  const totals = getTotals()

  return (
    <div className="team-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div>
            <h1>Team Analytics Dashboard</h1>
            <p className="header-subtitle">
              {user?.name || 'Supervisor'} • Comprehensive team performance overview
            </p>
            
            {/* Debug Info */}
            <div className="debug-info">
              Showing: {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'} data • {teamPerformance.length} team members
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={refreshData}
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
            <div className="error-text">{error}</div>
          </div>
          <button 
            onClick={refreshData}
            className="error-retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <div className="range-buttons">
          {['week', 'month', 'quarter'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`range-button ${timeRange === range ? 'active' : ''}`}
            >
              This {range}
            </button>
          ))}
        </div>
      </div>

      {/* Team Summary Cards */}
      <div className="stats-grid">
        <StatCard 
          value={totals.reps} 
          label="Active MedReps"
          color="#3b82f6"
          icon="👥"
        />
        <StatCard 
          value={totals.reports} 
          label="Total Reports"
          color="#8b5cf6"
          icon="📝"
        />
        <StatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#10b981"
          icon="👨‍⚕️"
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders"
          color="#f59e0b"
          icon="📦"
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Revenue"
          color="#ef4444"
          icon="💰"
        />
      </div>

      {/* Main Content */}
      <div className="analytics-content">
        {/* Team Performance */}
        <div className="analytics-card">
          <div className="card-header">
            <div className="header-title">
              <h3>Team Performance</h3>
              <div className="data-count">
                {teamPerformance.length} team members
              </div>
            </div>
          </div>
          
          {teamPerformance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>No Team Data Available</h4>
              <p>Team members haven't submitted any reports in the selected time period.</p>
              <button
                onClick={refreshData}
                className="refresh-data-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.51 9.00001C4.01717 7.5668 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55977 10.0083 3.22426C11.4911 2.88875 13.0348 2.93436 14.4952 3.35677C15.9556 3.77918 17.2853 4.56471 18.36 5.64001L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0656 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Refresh Data
              </button>
            </div>
          ) : (
            <div className="team-list">
              {teamPerformance.map((user, index) => (
                <TeamMemberCard 
                  key={user.user_id || index} 
                  user={user} 
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Regional Performance */}
        <div className="analytics-card">
          <div className="card-header">
            <div className="header-title">
              <h3>Regional Performance</h3>
              <div className="data-count">
                {regionPerformance.length} regions
              </div>
            </div>
          </div>
          
          {regionPerformance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11C13.1046 11 14 10.1046 14 9C14 7.89543 13.1046 7 12 7C10.8954 7 10 7.89543 10 9C10 10.1046 10.8954 11 12 11Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>No Regional Data Available</h4>
              <p>No regional performance data available.</p>
            </div>
          ) : (
            <div className="region-list">
              {regionPerformance.map((region, index) => (
                <RegionCard 
                  key={region.region || index} 
                  region={region} 
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="insights-card">
        <div className="card-header">
          <h3>Performance Insights</h3>
        </div>
        <div className="insights-grid">
          <InsightCard 
            title="Average Doctors per Rep" 
            value={Math.round(totals.doctors / (totals.reps || 1))}
            unit="doctors"
            icon="👨‍⚕️"
            color="#3b82f6"
          />
          <InsightCard 
            title="Order Conversion Rate" 
            value={((totals.orders / totals.doctors) * 100 || 0).toFixed(1)}
            unit="%"
            icon="📊"
            color="#10b981"
          />
          <InsightCard 
            title="Average Order Value" 
            value={`RWF ${Math.round(totals.value / (totals.orders || 1)).toLocaleString()}`}
            unit="per order"
            icon="💰"
            color="#f59e0b"
          />
          <InsightCard 
            title="Active Regions" 
            value={new Set(teamPerformance.map(u => u.region)).size}
            unit="regions"
            icon="🌍"
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Export Section */}
      <div className="export-card">
        <div className="card-header">
          <h3>Export Reports</h3>
        </div>
        <div className="export-grid">
          <ExportButton 
            icon="📊"
            title="Export Team Report" 
            description="Generate comprehensive PDF report for the entire team"
            onClick={() => alert('Team report export feature coming soon!')}
            color="#3b82f6"
          />
          <ExportButton 
            icon="📈"
            title="Export Analytics" 
            description="Export detailed analytics data to Excel format"
            onClick={() => alert('Analytics export feature coming soon!')}
            color="#10b981"
          />
          <ExportButton 
            icon="🌍"
            title="Export Regional Data" 
            description="Generate regional performance reports"
            onClick={() => alert('Regional report export feature coming soon!')}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  )
}

// Team Member Card Component
const TeamMemberCard = ({ user, rank }) => (
  <div className="member-card">
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
          <div className="member-name">{user.user_name}</div>
          {rank <= 3 && (
            <span className="rank-label" style={{
              background: rank === 1 ? '#fef3c7' : 
                         rank === 2 ? '#f1f5f9' : '#fef3c7',
              color: rank === 1 ? '#92400e' : 
                     rank === 2 ? '#475569' : '#92400e'
            }}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          )}
        </div>
        <div className="member-meta">
          {user.region || 'Unknown Region'} • {user.reports_count || 0} reports
          {user.user_email && ` • ${user.user_email}`}
        </div>
      </div>
    </div>
    
    <div className="member-performance">
      <div className="performance-value">
        RWF {(user.total_value || 0).toLocaleString()}
      </div>
      <div className="performance-details">
        {user.total_doctors || 0} doctors • {user.total_orders || 0} orders
      </div>
    </div>
  </div>
)

// Region Card Component
const RegionCard = ({ region, rank }) => (
  <div className="region-card">
    <div className="region-info">
      <div className="rank-badge region-rank">
        {rank}
      </div>
      
      <div className="region-details">
        <div className="region-name">
          {region.region || 'Unknown Region'}
        </div>
        <div className="region-meta">
          {region.active_reps || 0} active reps • {region.report_count || 0} reports
        </div>
      </div>
    </div>
    
    <div className="region-performance">
      <div className="performance-value">
        RWF {(region.total_value || 0).toLocaleString()}
      </div>
      <div className="performance-details">
        {region.total_doctors || 0} doctors • {region.total_orders || 0} orders
      </div>
    </div>
  </div>
)

// Stat Card Component
const StatCard = ({ value, label, color, icon }) => (
  <div className="team-stat-card" style={{ borderColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: `${color}15` }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value" style={{ color: color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)

// Insight Card Component
const InsightCard = ({ title, value, unit, icon, color }) => (
  <div className="insight-item">
    <div className="insight-icon" style={{ background: color }}>
      {icon}
    </div>
    <div>
      <div className="insight-title">{title}</div>
      <div className="insight-value" style={{ color: color }}>
        {value} <span className="insight-unit">{unit}</span>
      </div>
    </div>
  </div>
)

// Export Button Component
const ExportButton = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    className="export-button"
    style={{ borderColor: color }}
  >
    <span className="export-icon" style={{ color: color }}>{icon}</span>
    <div className="export-content">
      <div className="export-title">{title}</div>
      <div className="export-description">{description}</div>
      <div className="export-cta" style={{ color: color }}>
        Click to export →
      </div>
    </div>
  </button>
)

// CSS Styles
const styles = `
.team-analytics-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Loading State */
.team-analytics-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  flex-direction: column;
  gap: 20px;
}

.team-analytics-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.team-analytics-loading .loading-text {
  color: #3b82f6;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Header */
.analytics-header {
  background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 16px;
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
  font-weight: 500;
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
  flex-shrink: 0;
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
  min-width: 120px;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.team-stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-left: 4px solid;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.team-stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.team-stat-card .stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.team-stat-card .stat-content {
  flex: 1;
  min-width: 0;
}

.team-stat-card .stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.team-stat-card .stat-label {
  font-size: 14px;
  color: #475569;
  font-weight: 600;
  line-height: 1.3;
}

/* Analytics Content */
.analytics-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

@media (max-width: 1024px) {
  .analytics-content {
    grid-template-columns: 1fr;
  }
}

/* Analytics Card */
.analytics-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.analytics-card .card-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analytics-card h3 {
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
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-state h4 {
  margin: 0 0 12px 0;
  color: #475569;
  font-size: 18px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 auto 24px;
  font-size: 15px;
  max-width: 400px;
  line-height: 1.6;
}

.refresh-data-button {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.refresh-data-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.refresh-data-button svg {
  width: 16px;
  height: 16px;
}

/* Team List */
.team-list,
.region-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  flex: 1;
}

.team-list::-webkit-scrollbar,
.region-list::-webkit-scrollbar {
  width: 6px;
}

.team-list::-webkit-scrollbar-track,
.region-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.team-list::-webkit-scrollbar-thumb,
.region-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.team-list::-webkit-scrollbar-thumb:hover,
.region-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Member Card */
.member-card,
.region-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.member-card:hover,
.region-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateX(4px);
}

.member-info,
.region-info {
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

.region-rank {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.member-details,
.region-details {
  flex: 1;
  min-width: 0;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.member-name,
.region-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  textOverflow: ellipsis;
}

.rank-label {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.member-meta,
.region-meta {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  textOverflow: ellipsis;
}

.member-performance,
.region-performance {
  text-align: right;
  min-width: 140px;
  flex-shrink: 0;
}

.performance-value {
  font-weight: 600;
  color: #10b981;
  font-size: 16px;
  margin-bottom: 4px;
}

.performance-details {
  font-size: 13px;
  color: #64748b;
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

.insights-card .card-header h3 {
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
  padding: 16px;
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
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
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
  line-height: 1.4;
}

.insight-unit {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.8;
}

/* Export Card */
.export-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.export-button {
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

.export-button:hover {
  background: #f8fafc;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.export-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.export-content {
  flex: 1;
}

.export-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  font-size: 18px;
}

.export-description {
  font-size: 15px;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 16px;
}

.export-cta {
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .team-analytics-container {
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
  
  .error-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .error-retry {
    align-self: flex-end;
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
    grid-template-columns: repeat(2, 1fr);
  }
  
  .analytics-card {
    padding: 24px;
  }
  
  .member-card,
  .region-card {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .member-performance,
  .region-performance {
    text-align: left;
    width: 100%;
  }
  
  .insights-grid {
    grid-template-columns: 1fr;
  }
  
  .export-grid {
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
  
  .member-name,
  .region-name {
    font-size: 14px;
  }
  
  .performance-value {
    font-size: 14px;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default TeamAnalytics
