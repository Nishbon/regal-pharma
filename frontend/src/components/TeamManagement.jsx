import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI, reportsAPI } from '../services/api'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const TeamManagement = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [filter, setFilter] = useState('all') // all, active, inactive
  const [performanceData, setPerformanceData] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user?.role === 'supervisor' || user?.role === 'admin') {
      loadTeamMembers()
    }
  }, [selectedPeriod, filter])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccessMessage('')
      
      console.log(`👥 Loading team members for ${user?.name || 'supervisor'}...`)
      
      // Try different endpoints - find which one works
      let response;
      try {
        response = await usersAPI.getTeamMembers()
      } catch (e) {
        console.log('getTeamMembers failed, trying getActiveMedReps...')
        response = await usersAPI.getActiveMedReps()
      }
      
      console.log('Team members response:', response.data)
      
      if (response.data?.success) {
        const members = response.data.data || response.data.users || []
        setTeamMembers(members)
        await loadPerformanceData(members)
      } else if (response.data) {
        // Handle different response structures
        const members = response.data || []
        setTeamMembers(members)
        await loadPerformanceData(members)
      } else {
        setError('Failed to load team members: Invalid response format')
        setTeamMembers([])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
      setError(`Failed to load team data: ${error.message}`)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }

  const loadPerformanceData = async (members) => {
    try {
      const period = selectedPeriod
      const performancePromises = members.map(member => 
        getMemberPerformance(member._id || member.id, period)
      )
      
      const results = await Promise.all(performancePromises)
      setPerformanceData(results.filter(Boolean))
    } catch (error) {
      console.error('Error loading performance data:', error)
      setPerformanceData([])
    }
  }

  const getMemberPerformance = async (memberId, period = 'month') => {
    try {
      let startDate = new Date()
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setDate(startDate.getDate() - 30)
          break
        case 'quarter':
          startDate.setDate(startDate.getDate() - 90)
          break
        default:
          startDate.setDate(startDate.getDate() - 30)
      }

      // Try different endpoint formats
      let response;
      try {
        response = await reportsAPI.getReportsByDateRange(
          startDate.toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        )
      } catch (e) {
        console.log('getReportsByDateRange failed, trying getReportsByUserId...')
        response = await reportsAPI.getReportsByUserId(
          memberId,
          startDate.toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        )
      }

      const responseData = response.data || {}
      
      if (responseData.success || responseData.reports) {
        const memberReports = (responseData.data || responseData.reports || []).filter(report => 
          report.user_id?._id === memberId || 
          report.user_id === memberId ||
          report.userId === memberId
        )

        const stats = calculatePerformanceStats(memberReports)
        
        return {
          memberId,
          reports: memberReports,
          stats,
          lastActivity: memberReports.length > 0 
            ? new Date(memberReports[0].report_date || memberReports[0].date).toLocaleDateString()
            : 'No activity'
        }
      }
      return null
    } catch (error) {
      console.error(`Error getting performance for member ${memberId}:`, error)
      return null
    }
  }

  const calculatePerformanceStats = (reports) => {
    const stats = reports.reduce((acc, report) => ({
      totalReports: acc.totalReports + 1,
      totalDoctors: acc.totalDoctors + calculateTotalDoctors(report),
      totalPharmacies: acc.totalPharmacies + (report.pharmacies || 0),
      totalDispensaries: acc.totalDispensaries + (report.dispensaries || 0),
      totalOrders: acc.totalOrders + (report.orders_count || report.orders || 0),
      totalValue: acc.totalValue + (report.orders_value || report.value || 0)
    }), {
      totalReports: 0,
      totalDoctors: 0,
      totalPharmacies: 0,
      totalDispensaries: 0,
      totalOrders: 0,
      totalValue: 0
    })

    // Calculate averages
    if (stats.totalReports > 0) {
      stats.avgDoctorsPerDay = (stats.totalDoctors / stats.totalReports).toFixed(1)
      stats.avgOrdersPerDay = (stats.totalOrders / stats.totalReports).toFixed(1)
      stats.avgValuePerDay = (stats.totalValue / stats.totalReports).toFixed(0)
    } else {
      stats.avgDoctorsPerDay = 0
      stats.avgOrdersPerDay = 0
      stats.avgValuePerDay = 0
    }

    return stats
  }

  const calculateTotalDoctors = (report) => {
    // Try different field names
    const doctors = 
      (report.dentists || 0) +
      (report.physiotherapists || 0) +
      (report.gynecologists || 0) +
      (report.internists || 0) +
      (report.general_practitioners || report.generalPractitioners || 0) +
      (report.pediatricians || 0) +
      (report.dermatologists || 0)
    
    // If no doctor fields, try total_doctors field
    if (doctors === 0 && report.total_doctors) {
      return report.total_doctors
    }
    
    return doctors
  }

  const getTotals = () => {
    if (!teamMembers || teamMembers.length === 0) {
      return { reports: 0, doctors: 0, orders: 0, value: 0, members: 0 }
    }
    
    return performanceData.reduce((totals, data) => ({
      reports: totals.reports + (data?.stats?.totalReports || 0),
      doctors: totals.doctors + (data?.stats?.totalDoctors || 0),
      orders: totals.orders + (data?.stats?.totalOrders || 0),
      value: totals.value + (data?.stats?.totalValue || 0),
      members: totals.members + 1
    }), { reports: 0, doctors: 0, orders: 0, value: 0, members: 0 })
  }

  // Add new team member - MODAL VERSION
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    region: '',
    phone: '',
    role: 'medrep'
  })

  const addTeamMember = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Basic validation
      if (!newMember.name || !newMember.email || !newMember.username || !newMember.password) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const response = await usersAPI.create({
        name: newMember.name,
        email: newMember.email,
        username: newMember.username,
        password: newMember.password,
        region: newMember.region,
        phone: newMember.phone,
        role: newMember.role
      })

      if (response.data?.success) {
        setSuccessMessage(`Team member ${newMember.name} added successfully!`)
        setNewMember({
          name: '',
          email: '',
          username: '',
          password: '',
          region: '',
          phone: '',
          role: 'medrep'
        })
        setShowAddModal(false)
        loadTeamMembers()
      } else {
        setError(response.data?.message || 'Failed to add team member')
      }
    } catch (error) {
      console.error('Error adding team member:', error)
      setError(error.response?.data?.message || 'Failed to add team member')
    } finally {
      setLoading(false)
    }
  }

  // Toggle active status
  const toggleActiveStatus = async (memberId, currentStatus, memberName) => {
    try {
      if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} ${memberName}?`)) {
        setLoading(true)
        
        if (currentStatus) {
          await usersAPI.deactivateUser(memberId)
          setSuccessMessage(`${memberName} has been deactivated`)
        } else {
          await usersAPI.activateUser(memberId)
          setSuccessMessage(`${memberName} has been activated`)
        }
        
        loadTeamMembers()
      }
    } catch (error) {
      console.error('Error updating member status:', error)
      setError(error.response?.data?.message || 'Failed to update member status')
      setLoading(false)
    }
  }

  // Refresh data
  const refreshData = () => {
    loadTeamMembers()
  }

  if (!user || (user.role !== 'supervisor' && user.role !== 'admin')) {
    return (
      <div className="team-management-container">
        <div className="access-denied">
          <div className="access-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>
            You don't have permission to access Team Management.
            <br />
            This section is only available for supervisors and administrators.
          </p>
        </div>
      </div>
    )
  }

  if (loading && teamMembers.length === 0) {
    return (
      <div className="team-management-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading team management...</div>
      </div>
    )
  }

  const totals = getTotals()
  const filteredMembers = teamMembers.filter(member => {
    if (filter === 'active') return member.is_active !== false && member.status !== 'inactive'
    if (filter === 'inactive') return member.is_active === false || member.status === 'inactive'
    return true
  })

  return (
    <div className="team-management-container">
      {/* Header */}
      <div className="management-header">
        <div className="header-content">
          <div>
            <h1>Team Management Dashboard</h1>
            <p className="header-subtitle">
              {user?.name || 'Supervisor'} • Manage and monitor team performance
            </p>
            
            <div className="debug-info">
              Showing: {selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : 'Quarterly'} data • {filteredMembers.length} team members
            </div>
          </div>
          <div className="header-actions">
            <button onClick={refreshData} className="refresh-button">
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

      {/* Success Message */}
      {successMessage && (
        <div className="success-card">
          <div className="success-content">
            <div className="success-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="success-text">{successMessage}</div>
            <button onClick={() => setSuccessMessage('')} className="success-close">
              &times;
            </button>
          </div>
        </div>
      )}

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
            <button onClick={() => setError('')} className="error-close">
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <div className="range-buttons">
          {['week', 'month', 'quarter'].map(range => (
            <button
              key={range}
              onClick={() => setSelectedPeriod(range)}
              className={`range-button ${selectedPeriod === range ? 'active' : ''}`}
            >
              This {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <TeamStatCard 
          value={teamMembers.length} 
          label="Total MedReps"
          color="#3b82f6"
          icon="👥"
        />
        <TeamStatCard 
          value={totals.reports} 
          label="Total Reports"
          color="#8b5cf6"
          icon="📝"
        />
        <TeamStatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#10b981"
          icon="👨‍⚕️"
        />
        <TeamStatCard 
          value={totals.orders} 
          label="Total Orders"
          color="#f59e0b"
          icon="📦"
        />
        <TeamStatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Revenue"
          color="#ef4444"
          icon="💰"
        />
      </div>

      {/* Filter and Action Bar */}
      <div className="action-bar">
        <div className="filter-buttons">
          {['all', 'active', 'inactive'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`filter-button ${filter === status ? 'active' : ''}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} Members
            </button>
          ))}
        </div>
        <div className="action-buttons">
          <button onClick={() => setShowAddModal(true)} className="add-member-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add New Member
          </button>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="team-grid">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h4>No Team Members Found</h4>
            <p>No members found with the current filter. Try changing the filter or add new members.</p>
            <button onClick={() => setShowAddModal(true)} className="add-first-button">
              Add Your First Team Member
            </button>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const performance = performanceData.find(p => p?.memberId === (member._id || member.id))
            const memberRank = performance ? 
              performanceData
                .filter(p => p?.stats?.totalValue > 0)
                .sort((a, b) => (b?.stats?.totalValue || 0) - (a?.stats?.totalValue || 0))
                .findIndex(p => p.memberId === (member._id || member.id)) + 1 : 0
            
            return (
              <TeamMemberCard 
                key={member._id || member.id} 
                member={member} 
                performance={performance}
                rank={memberRank}
                onToggle={() => toggleActiveStatus(
                  member._id || member.id, 
                  member.is_active !== false && member.status !== 'inactive',
                  member.name
                )}
              />
            )
          })
        )}
      </div>

      {/* Performance Insights */}
      {performanceData.length > 0 && (
        <div className="insights-card">
          <div className="card-header">
            <h3>Performance Insights</h3>
          </div>
          <div className="insights-grid">
            <InsightCard 
              title="Average Reports per Member" 
              value={(totals.reports / (teamMembers.length || 1)).toFixed(1)}
              unit="reports"
              icon="📊"
              color="#3b82f6"
            />
            <InsightCard 
              title="Average Order Value" 
              value={`RWF ${Math.round(totals.value / (totals.orders || 1)).toLocaleString()}`}
              unit="per order"
              icon="💰"
              color="#10b981"
            />
            <InsightCard 
              title="Doctors per Report" 
              value={(totals.doctors / (totals.reports || 1)).toFixed(1)}
              unit="doctors"
              icon="👨‍⚕️"
              color="#f59e0b"
            />
            <InsightCard 
              title="Active Regions" 
              value={new Set(teamMembers.filter(m => m.region).map(m => m.region)).size}
              unit="regions"
              icon="🌍"
              color="#8b5cf6"
            />
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={newMember.username}
                  onChange={(e) => setNewMember({...newMember, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label>Region</label>
                <input
                  type="text"
                  value={newMember.region}
                  onChange={(e) => setNewMember({...newMember, region: e.target.value})}
                  placeholder="Enter region"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                >
                  <option value="medrep">Medical Representative</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddModal(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={addTeamMember} className="save-button" disabled={loading}>
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Team Member Card Component
const TeamMemberCard = ({ member, performance, rank, onToggle }) => (
  <div className="member-card">
    <div className="member-header">
      <div className="member-avatar">
        {member.name?.charAt(0) || 'U'}
      </div>
      <div className="member-info">
        <div className="member-name-row">
          <div className="member-name">{member.name || 'Unknown'}</div>
          {rank > 0 && rank <= 3 && (
            <span className="rank-badge" style={{
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
          {member.region || 'Unknown Region'}
          <span className={`status-badge ${
            member.is_active === false || member.status === 'inactive' ? 'inactive' : 'active'
          }`}>
            {member.is_active === false || member.status === 'inactive' ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div>
    </div>
    
    {performance ? (
      <>
        <div className="performance-stats">
          <div className="stat-item">
            <div className="stat-value">{performance.stats.totalReports}</div>
            <div className="stat-label">Reports</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{performance.stats.totalDoctors}</div>
            <div className="stat-label">Doctors</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{performance.stats.totalOrders}</div>
            <div className="stat-label">Orders</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">RWF {performance.stats.totalValue.toLocaleString()}</div>
            <div className="stat-label">Value</div>
          </div>
        </div>
        
        <div className="activity-info">
          Last activity: {performance.lastActivity}
        </div>
      </>
    ) : (
      <div className="no-data">
        <div className="no-data-icon">📊</div>
        <div className="no-data-text">No activity data available</div>
      </div>
    )}
    
    <div className="member-actions">
      <button onClick={onToggle} className={`action-button toggle ${
        member.is_active === false || member.status === 'inactive' ? 'activate' : 'deactivate'
      }`}>
        {member.is_active === false || member.status === 'inactive' ? 'Activate' : 'Deactivate'}
      </button>
    </div>
  </div>
)

// Team Stat Card Component
const TeamStatCard = ({ value, label, color, icon }) => (
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

// CSS Styles - ADD THESE TO YOUR EXISTING STYLES
const additionalStyles = `
/* Success Card */
.success-card {
  background: #d4efdf;
  color: #27ae60;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 1px solid #a9dfbf;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.success-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #27ae60;
  flex-shrink: 0;
}

.success-text {
  flex: 1;
  font-weight: 500;
}

.success-close, .error-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.success-close:hover, .error-close:hover {
  background: rgba(0,0,0,0.1);
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-buttons {
  display: flex;
  gap: 10px;
}

.filter-button {
  padding: 10px 24px;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

.filter-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.filter-button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.add-member-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.add-member-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.add-first-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 32px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-first-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 2px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #475569;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: white;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  padding: 16px 24px 24px;
  border-top: 2px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button {
  padding: 10px 20px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background: #f1f5f9;
}

.save-button {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.save-button:hover:not(:disabled) {
  background: #2563eb;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  grid-column: 1 / -1;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 12px 0;
  color: #475569;
  font-size: 20px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 auto 24px;
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  max-width: 400px;
}
`

// Add to existing styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = additionalStyles
  document.head.appendChild(styleSheet)
}

export default TeamManagement
