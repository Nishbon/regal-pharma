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

  useEffect(() => {
    if (user?.role === 'supervisor' || user?.role === 'admin') {
      loadTeamMembers()
    }
  }, [selectedPeriod, filter])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log(`👥 Loading team members for ${user?.name || 'supervisor'}...`)
      
      if (user?.role === 'supervisor' || user?.role === 'admin') {
        const response = await usersAPI.getActiveMedReps()
        
        console.log('Team members response:', response.data)
        
        if (response.data.success) {
          const members = response.data.data || []
          setTeamMembers(members)
          await loadPerformanceData(members)
        } else {
          setError(`Failed to load team members: ${response.data.message || 'Unknown error'}`)
          setTeamMembers([])
        }
      } else {
        setTeamMembers([])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
      setError('Failed to load team data. Please try again.')
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

      const response = await reportsAPI.getReportsByDateRange(
        startDate.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )

      if (response.data.success) {
        const memberReports = response.data.data.filter(report => 
          report.user_id?._id === memberId || report.user_id === memberId
        )

        const stats = calculatePerformanceStats(memberReports)
        
        return {
          memberId,
          reports: memberReports,
          stats,
          lastActivity: memberReports.length > 0 
            ? new Date(memberReports[0].report_date).toLocaleDateString()
            : 'No activity'
        }
      }
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
      totalOrders: acc.totalOrders + (report.orders_count || 0),
      totalValue: acc.totalValue + (report.orders_value || 0)
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

  const getTotals = () => {
    if (!teamMembers || teamMembers.length === 0) {
      return { reports: 0, doctors: 0, orders: 0, value: 0, members: 0 }
    }
    
    return performanceData.reduce((totals, data) => ({
      reports: totals.reports + data.stats.totalReports,
      doctors: totals.doctors + data.stats.totalDoctors,
      orders: totals.orders + data.stats.totalOrders,
      value: totals.value + data.stats.totalValue,
      members: totals.members + 1
    }), { reports: 0, doctors: 0, orders: 0, value: 0, members: 0 })
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(20)
    doc.text('Team Performance Report', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 30)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 37)
    doc.text(`Generated by: ${user?.name || 'Supervisor'}`, 20, 44)

    const tableData = performanceData.map((data, index) => {
      const member = teamMembers.find(m => m._id === data.memberId || m.id === data.memberId)
      return [
        index + 1,
        member?.name || 'Unknown',
        member?.region || 'N/A',
        data.stats.totalReports,
        data.stats.totalDoctors,
        data.stats.totalOrders,
        `RWF ${data.stats.totalValue.toLocaleString()}`,
        data.lastActivity
      ]
    })

    autoTable(doc, {
      head: [['#', 'Name', 'Region', 'Reports', 'Doctors', 'Orders', 'Value', 'Last Activity']],
      body: tableData,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        6: { cellWidth: 35 }
      }
    })

    const totals = getTotals()
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('Team Totals:', 20, finalY)
    doc.setFont(undefined, 'normal')
    doc.text(`Total Reports: ${totals.reports}`, 20, finalY + 8)
    doc.text(`Total Doctors Visited: ${totals.doctors}`, 20, finalY + 16)
    doc.text(`Total Orders: ${totals.orders}`, 20, finalY + 24)
    doc.text(`Total Value: RWF ${totals.value.toLocaleString()}`, 20, finalY + 32)

    doc.save(`Team-Performance-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const exportMemberPDF = (member, performance) => {
    if (!performance) return

    const doc = new jsPDF()
    
    doc.setFontSize(20)
    doc.text(`${member.name} - Performance Report`, 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 30)
    doc.text(`Region: ${member.region || 'N/A'}`, 20, 37)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 44)

    doc.setFontSize(14)
    doc.text('Performance Summary', 20, 60)
    
    const summaryData = [
      ['Total Reports', performance.stats.totalReports],
      ['Total Doctors Visited', performance.stats.totalDoctors],
      ['Total Pharmacies Visited', performance.stats.totalPharmacies],
      ['Total Dispensaries Visited', performance.stats.totalDispensaries],
      ['Total Orders', performance.stats.totalOrders],
      ['Total Order Value', `RWF ${performance.stats.totalValue.toLocaleString()}`],
      ['Average Doctors/Day', performance.stats.avgDoctorsPerDay],
      ['Average Orders/Day', performance.stats.avgOrdersPerDay],
      ['Average Value/Day', `RWF ${performance.stats.avgValuePerDay}`]
    ]

    autoTable(doc, {
      body: summaryData,
      startY: 70,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 60 }
      }
    })

    if (performance.reports.length > 0) {
      const recentY = doc.lastAutoTable.finalY + 15
      doc.setFontSize(14)
      doc.text('Recent Reports', 20, recentY)

      const reportData = performance.reports.slice(0, 10).map(report => [
        new Date(report.report_date).toLocaleDateString(),
        calculateTotalDoctors(report),
        report.pharmacies || 0,
        report.dispensaries || 0,
        report.orders_count || 0,
        `RWF ${(report.orders_value || 0).toLocaleString()}`,
        report.summary?.substring(0, 30) + (report.summary?.length > 30 ? '...' : '') || ''
      ])

      autoTable(doc, {
        head: [['Date', 'Doctors', 'Pharmacy', 'Dispensary', 'Orders', 'Value', 'Notes']],
        body: reportData,
        startY: recentY + 5,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          6: { cellWidth: 40 }
        }
      })
    }

    doc.save(`${member.name}-Performance-${selectedPeriod}.pdf`)
  }

  const addTeamMember = () => {
    alert('Add team member functionality would open a form here')
  }

  const toggleActiveStatus = async (memberId, currentStatus) => {
    try {
      if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this team member?`)) {
        const endpoint = currentStatus ? 'deactivate' : 'activate'
        await usersAPI.updateUserStatus(memberId, endpoint)
        loadTeamMembers()
      }
    } catch (error) {
      console.error('Error updating member status:', error)
      alert('Failed to update member status')
    }
  }

  const refreshData = () => {
    setLoading(true)
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

  if (loading) {
    return (
      <div className="team-management-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading team management...</div>
      </div>
    )
  }

  const totals = getTotals()
  const filteredMembers = teamMembers.filter(member => {
    if (filter === 'active') return member.is_active !== false
    if (filter === 'inactive') return member.is_active === false
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
              Showing: {selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : 'Quarterly'} data • {teamMembers.length} team members
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
          <button onClick={refreshData} className="error-retry">
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

      {/* Filter Section */}
      <div className="filter-section">
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
      </div>

      {/* Main Content */}
      <div className="management-content">
        {/* Team Members */}
        <div className="management-card">
          <div className="card-header">
            <div className="header-title">
              <h3>Team Members</h3>
              <div className="data-count">
                {filteredMembers.length} members • {performanceData.length} with data
              </div>
            </div>
            <div className="header-actions">
              <button onClick={addTeamMember} className="add-member-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add Member
              </button>
              <button onClick={exportToPDF} className="export-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export All
              </button>
            </div>
          </div>
          
          {filteredMembers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>No Team Members Found</h4>
              <p>Start building your team by adding medical representatives.</p>
              <button onClick={addTeamMember} className="refresh-data-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add First Member
              </button>
            </div>
          ) : (
            <div className="team-grid">
              {filteredMembers.map((member, index) => {
                const performance = performanceData.find(p => p.memberId === (member._id || member.id))
                const rank = performance ? 
                  performanceData
                    .filter(p => p.stats.totalValue > 0)
                    .sort((a, b) => b.stats.totalValue - a.stats.totalValue)
                    .findIndex(p => p.memberId === (member._id || member.id)) + 1 : 0
                
                return (
                  <TeamMemberCard 
                    key={member._id || member.id} 
                    member={member} 
                    performance={performance}
                    rank={rank}
                    onExport={() => exportMemberPDF(member, performance)}
                    onToggle={() => toggleActiveStatus(member._id || member.id, member.is_active !== false)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Performance Insights */}
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
              value={new Set(teamMembers.map(m => m.region)).size}
              unit="regions"
              icon="🌍"
              color="#8b5cf6"
            />
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="export-card">
        <div className="card-header">
          <h3>Export Reports</h3>
        </div>
        <div className="export-grid">
          <ExportOption 
            icon="📊"
            title="Export Team Report" 
            description="Generate comprehensive PDF report for the entire team"
            onClick={exportToPDF}
            color="#3b82f6"
          />
          <ExportOption 
            icon="📈"
            title="Export Individual Reports" 
            description="Export detailed performance reports for each member"
            onClick={() => alert('Individual report export coming soon!')}
            color="#10b981"
          />
          <ExportOption 
            icon="🌍"
            title="Export by Region" 
            description="Generate regional performance reports"
            onClick={() => alert('Regional report export coming soon!')}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  )
}

// Team Member Card Component
const TeamMemberCard = ({ member, performance, rank, onExport, onToggle }) => (
  <div className="member-card">
    <div className="member-header">
      <div className="member-avatar">
        {member.name.charAt(0)}
      </div>
      <div className="member-info">
        <div className="member-name-row">
          <div className="member-name">{member.name}</div>
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
          <span className={`status-badge ${member.is_active === false ? 'inactive' : 'active'}`}>
            {member.is_active === false ? 'Inactive' : 'Active'}
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
      <button onClick={onExport} className="action-button export">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export
      </button>
      <button onClick={onToggle} className={`action-button toggle ${member.is_active === false ? 'activate' : 'deactivate'}`}>
        {member.is_active === false ? 'Activate' : 'Deactivate'}
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

// Export Option Component
const ExportOption = ({ icon, title, description, onClick, color }) => (
  <button onClick={onClick} className="export-option" style={{ borderColor: color }}>
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
/* Base Styles */
.team-management-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Loading State */
.team-management-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  flex-direction: column;
  gap: 20px;
}

.team-management-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.team-management-loading .loading-text {
  color: #3b82f6;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Access Denied */
.access-denied {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  max-width: 600px;
  margin: 40px auto;
}

.access-icon {
  font-size: 80px;
  margin-bottom: 20px;
  color: #ef4444;
}

.access-denied h2 {
  color: #1e293b;
  margin-bottom: 16px;
  font-size: 24px;
  font-weight: 600;
}

.access-denied p {
  color: #64748b;
  font-size: 16px;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
}

/* Header */
.management-header {
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

.management-header h1 {
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

/* Filter Section */
.filter-section {
  margin-bottom: 30px;
  text-align: center;
}

.filter-buttons {
  display: inline-flex;
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

/* Management Content */
.management-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

@media (max-width: 1024px) {
  .management-content {
    grid-template-columns: 1fr;
  }
}

/* Management Card */
.management-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.management-card .card-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.management-card h3 {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.add-member-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
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

.export-button {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.export-button:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* Team Grid */
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* Member Card */
.member-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.member-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.member-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.member-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
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

.rank-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.member-meta {
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.status-badge.active {
  background: #d4efdf;
  color: #27ae60;
}

.status-badge.inactive {
  background: #fadbd8;
  color: #c0392b;
}

/* Performance Stats */
.performance-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-value {
  font-weight: 600;
  color: #3b82f6;
  font-size: 18px;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.activity-info {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 16px;
}

/* No Data */
.no-data {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px dashed #e2e8f0;
  margin-bottom: 16px;
}

.no-data-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.no-data-text {
  font-size: 14px;
  color: #94a3b8;
}

/* Member Actions */
.member-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.action-button.export {
  background: #3b82f6;
  color: white;
}

.action-button.export:hover {
  background: #2563eb;
}

.action-button.toggle {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.action-button.toggle:hover {
  background: #f1f5f9;
}

.action-button.activate {
  background: #10b981;
  color: white;
}

.action-button.activate:hover {
  background: #059669;
}

.action-button.deactivate {
  background: #ef4444;
  color: white;
}

.action-button.deactivate:hover {
  background: #dc2626;
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
  margin: 0 auto;
}

.refresh-data-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Insights Card */
.insights-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 32px;
  border-radius: 16px;
  border: 1px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
  height: fit-content;
}

.insights-card .card-header h3 {
  color: #92400e;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr;
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

.export-option {
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

.export-option:hover {
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
  .team-management-container {
    padding: 16px;
  }
  
  .management-header {
    padding: 24px;
  }
  
  .management-header h1 {
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
  
  .filter-buttons {
    width: 100%;
  }
  
  .filter-button {
    flex: 1;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .management-card {
    padding: 24px;
  }
  
  .team-grid {
    grid-template-columns: 1fr;
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
  
  .member-avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .member-name {
    font-size: 14px;
  }
  
  .performance-stats {
    grid-template-columns: 1fr;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default TeamManagement
