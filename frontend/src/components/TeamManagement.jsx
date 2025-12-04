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

  // Load team members
  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      console.log('👥 Loading team members...')
      
      // For supervisors/admins: get all medreps
      if (user?.role === 'supervisor' || user?.role === 'admin') {
        const response = await usersAPI.getActiveMedReps()
        if (response.data.success) {
          setTeamMembers(response.data.data || [])
          await loadPerformanceData(response.data.data || [])
        }
      } else {
        // Regular users can't access team management
        setTeamMembers([])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }

  // Load performance data
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

  // Get individual member performance
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

  // Calculate performance stats
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

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text('Team Performance Report', 20, 20)
    
    // Subtitle
    doc.setFontSize(12)
    doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 30)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 37)
    doc.text(`Generated by: ${user?.name || 'Supervisor'}`, 20, 44)

    // Performance Summary Table
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
      headStyles: { fillColor: [102, 126, 234] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        6: { cellWidth: 35 }
      }
    })

    // Add totals
    const totals = performanceData.reduce((acc, data) => ({
      reports: acc.reports + data.stats.totalReports,
      doctors: acc.doctors + data.stats.totalDoctors,
      orders: acc.orders + data.stats.totalOrders,
      value: acc.value + data.stats.totalValue
    }), { reports: 0, doctors: 0, orders: 0, value: 0 })

    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('Team Totals:', 20, finalY)
    doc.setFont(undefined, 'normal')
    doc.text(`Total Reports: ${totals.reports}`, 20, finalY + 8)
    doc.text(`Total Doctors Visited: ${totals.doctors}`, 20, finalY + 16)
    doc.text(`Total Orders: ${totals.orders}`, 20, finalY + 24)
    doc.text(`Total Value: RWF ${totals.value.toLocaleString()}`, 20, finalY + 32)

    // Save PDF
    doc.save(`Team-Performance-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export detailed report for a team member
  const exportMemberPDF = (member, performance) => {
    if (!performance) return

    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text(`${member.name} - Performance Report`, 20, 20)
    
    // Subtitle
    doc.setFontSize(12)
    doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 30)
    doc.text(`Region: ${member.region || 'N/A'}`, 20, 37)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 44)

    // Summary stats
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

    // Recent Reports Table
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

  // Add new team member
  const addTeamMember = () => {
    // You can implement a modal or form for adding new members
    alert('Add team member functionality would open a form here')
    // Example: navigate to add member form
    // navigate('/add-team-member')
  }

  // Toggle active status
  const toggleActiveStatus = async (memberId, currentStatus) => {
    try {
      if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this team member?`)) {
        const endpoint = currentStatus ? 'deactivate' : 'activate'
        await usersAPI.updateUserStatus(memberId, endpoint)
        loadTeamMembers() // Refresh list
      }
    } catch (error) {
      console.error('Error updating member status:', error)
      alert('Failed to update member status')
    }
  }

  useEffect(() => {
    if (user?.role === 'supervisor' || user?.role === 'admin') {
      loadTeamMembers()
    }
  }, [selectedPeriod, filter])

  // If user is not supervisor/admin
  if (!user || (user.role !== 'supervisor' && user.role !== 'admin')) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '6em', color: '#e74c3c' }}>🔒</div>
        <h2 style={{ color: '#2c3e50', margin: '0' }}>Access Denied</h2>
        <p style={{ color: '#7f8c8d', fontSize: '1.1em' }}>
          You don't have permission to access Team Management.
          <br />
          This section is only available for supervisors and administrators.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid #f3f3f3', 
          borderTop: '5px solid #667eea', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
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
    <div style={{ padding: '20px', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>👥 Team Management</h1>
          <p style={{ margin: '0', color: '#7f8c8d' }}>
            Manage your medical representatives and track their performance
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={exportToPDF}
            style={{
              background: '#2ecc71',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)'
            }}
          >
            📊 Export Team Report
          </button>
          
          <button
            onClick={addTeamMember}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            ➕ Add Team Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 3px 10px rgba(0,0,0,0.05)'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#5d6d7e', fontSize: '14px' }}>
            Time Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              minWidth: '150px'
            }}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#5d6d7e', fontSize: '14px' }}>
            Status Filter
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              minWidth: '150px'
            }}
          >
            <option value="all">All Members</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Team Members Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '25px',
        marginBottom: '40px'
      }}>
        {teamMembers.map(member => {
          const performance = performanceData.find(p => p.memberId === (member._id || member.id))
          
          return (
            <div
              key={member._id || member.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '25px',
                boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
                border: `2px solid ${member.is_active === false ? '#e74c3c' : '#2ecc71'}`,
                transition: 'transform 0.3s ease',
                ':hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
                }
              }}
            >
              {/* Member Header */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: member.is_active === false ? '#e74c3c' : '#667eea',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  marginRight: '15px'
                }}>
                  {member.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{member.name}</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: member.is_active === false ? '#fadbd8' : '#d4efdf',
                      color: member.is_active === false ? '#c0392b' : '#27ae60',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {member.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                    <span style={{ color: '#7f8c8d', fontSize: '14px' }}>{member.region}</span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              {performance ? (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '15px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                        {performance.stats.totalReports}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Reports</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71' }}>
                        {performance.stats.totalDoctors}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Doctors</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>
                        {performance.stats.totalOrders}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Orders</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
                        RWF {(performance.stats.totalValue / 1000).toFixed(0)}K
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Value</div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#7f8c8d', textAlign: 'center' }}>
                    Last activity: {performance.lastActivity}
                  </div>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px', opacity: '0.5' }}>📊</div>
                  <div style={{ color: '#7f8c8d', fontSize: '14px' }}>No activity data available</div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => exportMemberPDF(member, performance)}
                  style={{
                    flex: 1,
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📄 Export Report
                </button>
                
                <button
                  onClick={() => toggleActiveStatus(member._id || member.id, member.is_active !== false)}
                  style={{
                    padding: '10px 15px',
                    background: member.is_active === false ? '#2ecc71' : '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {member.is_active === false ? '✅ Activate' : '⛔ Deactivate'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      {performanceData.length > 0 && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 25px 0', color: '#2c3e50' }}>📈 Team Performance Summary</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <SummaryCard
              title="Total Reports"
              value={performanceData.reduce((sum, p) => sum + p.stats.totalReports, 0)}
              icon="📋"
              color="#667eea"
            />
            <SummaryCard
              title="Total Doctors Visited"
              value={performanceData.reduce((sum, p) => sum + p.stats.totalDoctors, 0)}
              icon="👨‍⚕️"
              color="#3498db"
            />
            <SummaryCard
              title="Total Orders"
              value={performanceData.reduce((sum, p) => sum + p.stats.totalOrders, 0)}
              icon="📦"
              color="#9b59b6"
            />
            <SummaryCard
              title="Total Value"
              value={`RWF ${performanceData.reduce((sum, p) => sum + p.stats.totalValue, 0).toLocaleString()}`}
              icon="💰"
              color="#f39c12"
            />
          </div>
        </div>
      )}

      {/* No Team Members Message */}
      {teamMembers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: '15px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '5em', marginBottom: '20px', opacity: '0.5' }}>👥</div>
          <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>No Team Members Found</h3>
          <p style={{ margin: '0 0 30px 0', color: '#7f8c8d', fontSize: '1.1em', maxWidth: '500px', margin: '0 auto 30px' }}>
            Start building your team by adding medical representatives to track their performance.
          </p>
          <button
            onClick={addTeamMember}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          >
            ➕ Add Your First Team Member
          </button>
        </div>
      )}
    </div>
  )
}

// Summary Card Component
const SummaryCard = ({ title, value, icon, color }) => (
  <div style={{
    background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
    padding: '25px',
    borderRadius: '10px',
    border: `1px solid ${color}30`,
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>{icon}</div>
    <div style={{ 
      fontSize: '2.2em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '10px'
    }}>
      {value}
    </div>
    <div style={{ color: '#7f8c8d', fontSize: '0.95em' }}>{title}</div>
  </div>
)

export default TeamManagement
