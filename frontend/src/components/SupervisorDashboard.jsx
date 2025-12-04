import React, { useState, useEffect } from 'react'
import { reportsAPI, usersAPI, analyticsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const SupervisorDashboard = () => {
  const { user } = useAuth()
  const [teamReports, setTeamReports] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [timeRange, setTimeRange] = useState('month')

  useEffect(() => {
    loadTeamData()
  }, [timeRange])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccessMessage('')
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
              total_value: userData.total_value,
              reports: userData.reports
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

  // PDF EXPORT FUNCTIONS
  const exportTeamPDF = () => {
    try {
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(20)
      doc.text('Team Performance Report - Supervisor Dashboard', 20, 20)
      
      // Subtitle
      doc.setFontSize(12)
      doc.text(`Period: ${timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'}`, 20, 30)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 37)
      doc.text(`Generated by: ${user?.name || 'Supervisor'}`, 20, 44)
      doc.text(`Total Team Members: ${teamReports.length}`, 20, 51)

      // Check if we have team data
      if (teamReports.length === 0) {
        doc.text('No team performance data available', 20, 70)
      } else {
        // Team Performance Table
        const tableData = teamReports.map((member, index) => [
          index + 1,
          member.user_name || 'Unknown',
          member.region || 'N/A',
          member.reports_count || 0,
          member.total_doctors || 0,
          member.total_orders || 0,
          `RWF ${(member.total_value || 0).toLocaleString()}`,
          `RWF ${Math.round((member.total_value || 0) / Math.max(member.reports_count, 1)).toLocaleString()}`
        ])

        autoTable(doc, {
          head: [['#', 'Name', 'Region', 'Reports', 'Doctors', 'Orders', 'Total Value', 'Avg/Report']],
          body: tableData,
          startY: 60,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            7: { cellWidth: 25 }
          }
        })

        // Add team totals
        const totals = teamReports.reduce((acc, member) => ({
          doctors: acc.doctors + (member.total_doctors || 0),
          orders: acc.orders + (member.total_orders || 0),
          value: acc.value + (member.total_value || 0),
          reports: acc.reports + (member.reports_count || 0)
        }), { doctors: 0, orders: 0, value: 0, reports: 0 })

        const finalY = doc.lastAutoTable?.finalY || 90
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.text('Team Performance Summary:', 20, finalY + 10)
        doc.setFont(undefined, 'normal')
        doc.text(`Total Reports: ${totals.reports}`, 20, finalY + 18)
        doc.text(`Total Doctors Visited: ${totals.doctors}`, 20, finalY + 26)
        doc.text(`Total Orders: ${totals.orders}`, 20, finalY + 34)
        doc.text(`Total Revenue: RWF ${totals.value.toLocaleString()}`, 20, finalY + 42)
        doc.text(`Average Revenue per Report: RWF ${Math.round(totals.value / Math.max(totals.reports, 1)).toLocaleString()}`, 20, finalY + 50)
        
        // Add top performer
        if (teamReports.length > 0) {
          const topPerformer = teamReports.reduce((top, current) => 
            (current.total_value || 0) > (top.total_value || 0) ? current : top
          )
          
          doc.setFont(undefined, 'bold')
          doc.text('Top Performer:', 20, finalY + 65)
          doc.setFont(undefined, 'normal')
          doc.text(`Name: ${topPerformer.user_name}`, 20, finalY + 73)
          doc.text(`Region: ${topPerformer.region || 'N/A'}`, 20, finalY + 81)
          doc.text(`Revenue: RWF ${(topPerformer.total_value || 0).toLocaleString()}`, 20, finalY + 89)
          doc.text(`Reports: ${topPerformer.reports_count || 0}`, 20, finalY + 97)
        }
      }

      // Save PDF
      doc.save(`Team-Performance-Report-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`)
      
      setSuccessMessage('Team performance report exported successfully!')
    } catch (error) {
      console.error('Error exporting team PDF:', error)
      setError('Failed to export team report. Please try again.')
    }
  }

  const exportMemberPDF = (memberId) => {
    try {
      const member = teamReports.find(m => m.user_id === memberId)
      if (!member) {
        setError('Member not found in performance data')
        return
      }

      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(20)
      doc.text(`${member.user_name} - Performance Report`, 20, 20)
      
      // Subtitle
      doc.setFontSize(12)
      doc.text(`Period: ${timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'}`, 20, 30)
      doc.text(`Region: ${member.region || 'N/A'}`, 20, 37)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 44)
      doc.text(`Generated by: ${user?.name || 'Supervisor'}`, 20, 51)

      // Performance Summary
      doc.setFontSize(14)
      doc.text('Performance Summary', 20, 65)
      
      const summaryData = [
        ['Total Reports', member.reports_count || 0],
        ['Total Doctors Visited', member.total_doctors || 0],
        ['Total Pharmacies Visited', member.total_pharmacies || 0],
        ['Total Dispensaries Visited', member.total_dispensaries || 0],
        ['Total Orders', member.total_orders || 0],
        ['Total Revenue', `RWF ${(member.total_value || 0).toLocaleString()}`],
        ['Average Doctors/Report', Math.round((member.total_doctors || 0) / Math.max(member.reports_count, 1))],
        ['Average Orders/Report', Math.round((member.total_orders || 0) / Math.max(member.reports_count, 1))],
        ['Average Revenue/Report', `RWF ${Math.round((member.total_value || 0) / Math.max(member.reports_count, 1)).toLocaleString()}`]
      ]

      autoTable(doc, {
        body: summaryData,
        startY: 75,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 60 }
        }
      })

      // Recent Reports if available
      if (member.reports && member.reports.length > 0) {
        const recentY = doc.lastAutoTable?.finalY + 15 || 120
        doc.setFontSize(14)
        doc.text('Recent Reports', 20, recentY)

        const reportData = member.reports.slice(0, 10).map(report => {
          const reportDate = new Date(report.report_date || report.createdAt)
          return [
            reportDate.toLocaleDateString(),
            calculateTotalDoctors(report),
            report.pharmacies || 0,
            report.dispensaries || 0,
            report.orders_count || 0,
            `RWF ${(report.orders_value || 0).toLocaleString()}`,
            (report.summary || '').substring(0, 40) + ((report.summary || '').length > 40 ? '...' : '')
          ]
        })

        autoTable(doc, {
          head: [['Date', 'Doctors', 'Pharmacy', 'Dispensary', 'Orders', 'Value', 'Notes']],
          body: reportData,
          startY: recentY + 5,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            6: { cellWidth: 50 }
          }
        })
      }

      doc.save(`${member.user_name.replace(/[^a-z0-9]/gi, '_')}-Performance-${timeRange}.pdf`)
      setSuccessMessage(`${member.user_name}'s report exported successfully!`)
    } catch (error) {
      console.error('Error exporting member PDF:', error)
      setError('Failed to export member report. Please try again.')
    }
  }

  // Helper function for calculating doctors
  const calculateTotalDoctors = (report) => {
    if (!report) return 0
    const doctors = 
      (report.dentists || 0) +
      (report.physiotherapists || 0) +
      (report.gynecologists || 0) +
      (report.internists || 0) +
      (report.general_practitioners || 0) +
      (report.pediatricians || 0) +
      (report.dermatologists || 0)
    
    return doctors
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
            <button
              onClick={exportTeamPDF}
              className="export-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Team Report
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
            <div className="error-text">
              <div className="error-title">Error</div>
              <div>{error}</div>
            </div>
            <button onClick={() => setError('')} className="error-close">
              &times;
            </button>
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
                  onDownloadReport={exportMemberPDF}
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

      {/* Export Actions */}
      <div className="actions-card">
        <div className="card-header">
          <h3>Export Options</h3>
        </div>
        <div className="actions-grid">
          <ActionButton 
            icon="📊"
            title="Export Team Report" 
            description="Generate comprehensive PDF report for the entire team with performance analytics"
            onClick={exportTeamPDF}
            color="#3b82f6"
          />
          <ActionButton 
            icon="📈"
            title="Export All Member Reports" 
            description="Export individual PDF reports for each team member"
            onClick={() => {
              teamReports.forEach((member, index) => {
                setTimeout(() => exportMemberPDF(member.user_id), index * 1000)
              })
              setSuccessMessage('Exporting all member reports...')
            }}
            color="#10b981"
          />
          <ActionButton 
            icon="📋"
            title="Export Performance Summary" 
            description="Export executive summary report with key metrics"
            onClick={() => {
              // Create a summary report
              try {
                const doc = new jsPDF()
                
                doc.setFontSize(20)
                doc.text('Team Performance Executive Summary', 20, 20)
                
                doc.setFontSize(12)
                doc.text(`Period: ${timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'}`, 20, 30)
                doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 37)
                doc.text(`Team Size: ${activeMedReps.length} active members`, 20, 44)
                doc.text(`Reporting: ${teamReports.length} members with data`, 20, 51)
                doc.text(`Total Reports: ${totals.reports}`, 20, 58)
                doc.text(`Total Revenue: RWF ${totals.value.toLocaleString()}`, 20, 65)
                doc.text(`Average Revenue/Report: RWF ${Math.round(totals.value / Math.max(totals.reports, 1)).toLocaleString()}`, 20, 72)
                
                if (topPerformer) {
                  doc.text('Top Performer:', 20, 82)
                  doc.text(`• ${topPerformer.user_name}: RWF ${(topPerformer.total_value || 0).toLocaleString()}`, 25, 89)
                }
                
                doc.save(`Team-Summary-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`)
                setSuccessMessage('Executive summary exported successfully!')
              } catch (error) {
                setError('Failed to export summary')
              }
            }}
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
        Export PDF
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
        Click to export →
      </div>
    </div>
  </button>
)

// Add these CSS styles for PDF export
const pdfExportStyles = `
/* Export Button in Header */
.export-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.export-button svg {
  width: 16px;
  height: 16px;
}

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
  animation: slideIn 0.3s ease;
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
  transition: background 0.2s ease;
}

.success-close:hover, .error-close:hover {
  background: rgba(0,0,0,0.1);
}

/* Error Card Updates */
.error-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-close {
  margin-left: 16px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Update Download Button */
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
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
}

.download-button svg {
  width: 16px;
  height: 16px;
}
`

// Add PDF export styles to existing styles
const existingStyles = styles + pdfExportStyles

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = existingStyles
  document.head.appendChild(styleSheet)
}

export default SupervisorDashboard
