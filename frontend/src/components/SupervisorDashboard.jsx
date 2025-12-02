import React, { useState, useEffect } from 'react'
import { reportsAPI, usersAPI, analyticsAPI } from '../services/api' // Added analyticsAPI
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
      
      // 1. Get all users
      const usersResponse = await usersAPI.getAll()
      console.log('👥 Users response:', usersResponse.data)
      
      if (usersResponse.data.success) {
        const usersData = usersResponse.data.data || []
        setAllUsers(usersData)
        
        // 2. Use the PROPER team performance endpoint
        try {
          const teamPerformanceResponse = await analyticsAPI.getTeamPerformance(timeRange)
          console.log('📊 Team performance API response:', teamPerformanceResponse.data)
          
          if (teamPerformanceResponse.data.success) {
            const teamData = teamPerformanceResponse.data.data || []
            setTeamReports(teamData)
          } else {
            // Fallback: Calculate manually
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

  // Fallback function if analytics API doesn't work
  const loadTeamDataManually = async (usersData) => {
    try {
      // Get ALL reports (supervisors can access all)
      const allReportsResponse = await reportsAPI.getAll()
      console.log('📋 All reports response:', allReportsResponse.data)
      
      if (allReportsResponse.data.success) {
        const allReports = allReportsResponse.data.data || []
        console.log('📊 Total reports found:', allReports.length)
        
        // Calculate date range
        const now = new Date()
        const cutoffDate = new Date()
        
        if (timeRange === 'week') {
          cutoffDate.setDate(now.getDate() - 7)
        } else if (timeRange === 'month') {
          cutoffDate.setDate(now.getDate() - 30)
        } else {
          cutoffDate.setDate(now.getDate() - 90)
        }
        
        // Filter reports by date
        const filteredReports = allReports.filter(report => {
          try {
            const reportDate = new Date(report.report_date || report.createdAt)
            return reportDate >= cutoffDate
          } catch (e) {
            return false
          }
        })
        
        console.log('📅 Reports in time range:', filteredReports.length)
        
        // Group reports by user and calculate performance
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
            
            // Calculate totals
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
        
        // Combine with user info
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
          .filter(Boolean) // Remove null entries
        
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: '#2563eb', fontSize: '18px' }}>Loading team dashboard...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        <button
          onClick={refreshDashboard}
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

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>
          Team Management Dashboard 👑
        </h1>
        <p style={{ margin: '0', fontSize: '1.2em', opacity: '0.9' }}>
          {user?.name || 'Supervisor'} • {activeMedReps.length} active medreps • {teamReports.length} team members with reports
        </p>
        
        {/* Debug Info */}
        <div style={{ 
          marginTop: '15px', 
          fontSize: '0.9em', 
          opacity: '0.8',
          background: 'rgba(255,255,255,0.1)',
          padding: '8px 12px',
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          🔍 Showing: {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'} data
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
          ⚠️ {error}
          <button 
            onClick={refreshDashboard}
            style={{
              marginLeft: '15px',
              background: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard 
          value={activeMedReps.length} 
          label="Active MedReps"
          color="#2563eb"
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Top Performer Card */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: '#1f2937', 
            fontSize: '1.4em',
            paddingBottom: '15px',
            borderBottom: '2px solid #f8fafc'
          }}>
            🏆 Top Performer
          </h3>
          
          {topPerformer ? (
            <div style={{ 
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ 
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                fontSize: '2.5em',
                color: 'white',
                boxShadow: '0 5px 15px rgba(245, 158, 11, 0.3)'
              }}>
                👑
              </div>
              <div style={{ 
                fontSize: '1.4em', 
                fontWeight: 'bold', 
                color: '#1f2937', 
                marginBottom: '8px' 
              }}>
                {topPerformer.user_name}
              </div>
              <div style={{ 
                color: '#6b7280', 
                marginBottom: '20px', 
                fontSize: '0.95em' 
              }}>
                {topPerformer.region} • {topPerformer.reports_count} reports
              </div>
              
              <div style={{ 
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ 
                  color: '#16a34a', 
                  fontWeight: 'bold', 
                  fontSize: '1.5em',
                  marginBottom: '8px'
                }}>
                  RWF {(topPerformer.total_value || 0).toLocaleString()}
                </div>
                <div style={{ color: '#15803d', fontSize: '0.9em' }}>Total Revenue</div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px dashed #bbf7d0'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#2563eb', fontWeight: '600' }}>{topPerformer.total_doctors || 0}</div>
                    <div style={{ fontSize: '0.8em', color: '#6b7280' }}>Doctors</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#2563eb', fontWeight: '600' }}>{topPerformer.total_orders || 0}</div>
                    <div style={{ fontSize: '0.8em', color: '#6b7280' }}>Orders</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              padding: '40px 20px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '20px', opacity: '0.5' }}>📊</div>
              <div style={{ fontSize: '1.1em', marginBottom: '10px' }}>No performance data available</div>
              <div style={{ fontSize: '0.9em' }}>Submit reports to see team performance</div>
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
          minHeight: '400px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '25px',
            paddingBottom: '15px',
            borderBottom: '2px solid #f8fafc'
          }}>
            <h3 style={{ margin: '0', color: '#1f2937', fontSize: '1.4em' }}>
              Team Performance ({timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'})
            </h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{
                  padding: '10px 15px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="3months">Last 3 Months</option>
              </select>
              <button
                onClick={refreshDashboard}
                style={{
                  padding: '10px 15px',
                  background: '#f8fafc',
                  color: '#2563eb',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔄 Update
              </button>
            </div>
          </div>
          
          {teamReports.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '4em', marginBottom: '20px', opacity: '0.5' }}>👥</div>
              <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>No Team Data Available</h4>
              <p style={{ margin: '0', fontSize: '1.1em', maxWidth: '400px', margin: '0 auto' }}>
                {activeMedReps.length > 0 
                  ? 'Team members haven\'t submitted any reports in the selected time period.'
                  : 'No active medical representatives found in the system.'
                }
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '10px'
            }}>
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
        <div style={{
          background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2d3436' }}>📈 Team Statistics</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px',
            color: '#2d3436'
          }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>💰 Average Revenue per Rep:</strong> RWF {Math.round(totals.value / Math.max(teamReports.length, 1)).toLocaleString()}
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📊 Active Reporting:</strong> {teamReports.length} of {activeMedReps.length} active ({Math.round((teamReports.length / Math.max(activeMedReps.length, 1)) * 100)}%)
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>📝 Average Reports per Rep:</strong> {Math.round(totals.reports / Math.max(teamReports.length, 1))} reports
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
              <strong>🏥 Total Doctor Visits:</strong> {totals.doctors} visits • {totals.pharmacies + totals.dispensaries} pharmacy visits
            </div>
          </div>
        </div>
      )}

      {/* Management Actions */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          color: '#1f2937', 
          fontSize: '1.4em',
          paddingBottom: '15px',
          borderBottom: '2px solid #f8fafc'
        }}>
          🛠️ Management Actions
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          <ActionButton 
            icon="📥" 
            title="Export Team Report" 
            description="Generate comprehensive PDF report for the entire team with performance analytics"
            onClick={() => downloadMonthlyReport()}
            color="#2563eb"
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

// Stat Card Component (same as before)
const StatCard = ({ value, label, color, icon }) => (
  <div style={{
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
    textAlign: 'center',
    borderTop: `4px solid ${color}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
    }
  }}>
    <div style={{ fontSize: '3em', marginBottom: '15px' }}>{icon}</div>
    <div style={{ 
      fontSize: '2.2em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '10px'
    }}>
      {value}
    </div>
    <div style={{ color: '#6b7280', fontSize: '1em' }}>{label}</div>
  </div>
)

// Team Member Card Component (same as before)
const TeamMemberCard = ({ member, onDownloadReport, rank }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f1f5f9',
      borderColor: '#cbd5e1',
      transform: 'translateX(5px)'
    }
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: rank <= 3 ? 
          rank === 1 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
          rank === 2 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
          'linear-gradient(135deg, #92400e 0%, #78350f 100%)' :
          'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.1em',
        flexShrink: 0
      }}>
        {rank}
      </div>
      
      <div style={{ minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '5px' 
        }}>
          <div style={{ 
            fontWeight: '600', 
            color: '#1f2937', 
            fontSize: '1.1em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {member.user_name}
          </div>
          {rank <= 3 && (
            <span style={{
              fontSize: '0.8em',
              background: rank === 1 ? '#fef3c7' : 
                         rank === 2 ? '#f1f5f9' : '#fef3c7',
              color: rank === 1 ? '#92400e' : 
                     rank === 2 ? '#475569' : '#92400e',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              {rank === 1 ? '🥇 Top' : rank === 2 ? '🥈 2nd' : '🥉 3rd'}
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: '0.9em', 
          color: '#6b7280',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {member.region} • {member.reports_count || 0} reports
          {member.user_email && ` • ${member.user_email}`}
        </div>
      </div>
    </div>
    
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px',
      flexShrink: 0
    }}>
      <div style={{ textAlign: 'right', minWidth: '120px' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '5px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: '10px' 
          }}>
            <span style={{ 
              color: '#16a34a', 
              fontWeight: '600',
              fontSize: '1.1em'
            }}>
              RWF {(member.total_value || 0).toLocaleString()}
            </span>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: member.total_value > 0 ? '#10b981' : '#94a3b8'
            }}></div>
          </div>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#6b7280',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end'
          }}>
            <span>{member.total_doctors || 0} doctors</span>
            <span>•</span>
            <span>{member.total_orders || 0} orders</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onDownloadReport(member.user_id)}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.85em',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 5px rgba(37, 99, 235, 0.3)',
          whiteSpace: 'nowrap',
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.4)'
          }
        }}
      >
        📥 Report
      </button>
    </div>
  </div>
)

// Action Button Component (same as before)
const ActionButton = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '25px',
      background: 'white',
      border: `2px solid ${color}20`,
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'left',
      width: '100%',
      height: '100%',
      ':hover': {
        background: `${color}08`,
        transform: 'translateY(-3px)',
        borderColor: `${color}40`,
        boxShadow: `0 8px 20px ${color}10`
      }
    }}
  >
    <span style={{ 
      fontSize: '2.5em', 
      marginBottom: '15px',
      color: color
    }}>{icon}</span>
    <div style={{ 
      fontWeight: '600', 
      color: '#1f2937', 
      marginBottom: '10px',
      fontSize: '1.2em'
    }}>
      {title}
    </div>
    <div style={{ 
      fontSize: '0.95em', 
      color: '#6b7280', 
      lineHeight: '1.5',
      flex: 1
    }}>
      {description}
    </div>
    <div style={{ 
      marginTop: '15px',
      color: color,
      fontWeight: '500',
      fontSize: '0.9em',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }}>
      Click to open →
    </div>
  </button>
)

export default SupervisorDashboard
