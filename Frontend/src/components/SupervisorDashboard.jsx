import React, { useState, useEffect } from 'react'
import { analyticsAPI, usersAPI } from '../services/api'

const SupervisorDashboard = () => {
  const [teamPerformance, setTeamPerformance] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')

  useEffect(() => {
    loadTeamData()
  }, [timeRange])

  const loadTeamData = async () => {
    try {
      const [performanceResponse, usersResponse] = await Promise.all([
        analyticsAPI.getTeamPerformance(timeRange),
        usersAPI.getAll()
      ])

      if (performanceResponse.data.success) {
        setTeamPerformance(performanceResponse.data.data)
      }
      if (usersResponse.data.success) {
        setAllUsers(usersResponse.data.data)
      }
    } catch (error) {
      console.error('Error loading team data:', error)
    }
    setLoading(false)
  }

  const downloadMonthlyReport = async (userId = null) => {
    const userName = userId ? allUsers.find(u => u.id === userId)?.name : 'All Team'
    alert(`📊 Generating monthly PDF report for ${userName}\n\nThis feature will generate a comprehensive PDF report with detailed performance metrics.`)
  }

  const getTopPerformer = () => {
    if (teamPerformance.length === 0) return null
    return teamPerformance.reduce((top, current) => 
      (current.total_value || 0) > (top.total_value || 0) ? current : top
    )
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        borderRadius: '15px',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading team dashboard...
      </div>
    )
  }

  const activeMedReps = allUsers.filter(user => user.role === 'medrep' && user.is_active)
  const topPerformer = getTopPerformer()
  const totals = teamPerformance.reduce((acc, user) => ({
    doctors: acc.doctors + (user.total_doctors || 0),
    pharmacies: acc.pharmacies + (user.total_pharmacies || 0),
    orders: acc.orders + (user.total_orders || 0),
    value: acc.value + (user.total_value || 0)
  }), { doctors: 0, pharmacies: 0, orders: 0, value: 0 })

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div className="page-header">
        <h1>Team Management 👑</h1>
        <p>Manage your medical representatives and monitor team performance</p>
      </div>

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
          trend="+2 this month"
        />
        <StatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#10b981"
          icon="👨‍⚕️"
          trend="+15% from last month"
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders"
          color="#f59e0b"
          icon="📦"
          trend="+8% from last month"
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Team Revenue"
          color="#8b5cf6"
          icon="💰"
          trend="+12% from last month"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Team Overview */}
        <div className="card" style={{ padding: '25px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3em' }}>
            🏆 Top Performer
          </h3>
          {topPerformer ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                fontSize: '2em',
                color: 'white'
              }}>
                👑
              </div>
              <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                {topPerformer.user_name}
              </div>
              <div style={{ color: '#6b7280', marginBottom: '15px', fontSize: '0.9em' }}>
                {topPerformer.region} Region
              </div>
              <div style={{ 
                background: '#f0fdf4', 
                padding: '15px', 
                borderRadius: '10px',
                border: '1px solid #dcfce7'
              }}>
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.2em' }}>
                  RWF {(topPerformer.total_value || 0).toLocaleString()}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85em' }}>Total Revenue</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              No performance data available
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div className="card" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: '0', color: '#1f2937', fontSize: '1.3em' }}>
              Team Performance
            </h3>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {teamPerformance.map(user => (
              <TeamMemberCard 
                key={user.user_id} 
                user={user} 
                onDownloadReport={downloadMonthlyReport}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="card" style={{ padding: '25px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3em' }}>
          🛠️ Management Tools
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <ActionButton 
            icon="📥" 
            title="Export Team Report" 
            description="Download comprehensive team performance PDF"
            onClick={() => downloadMonthlyReport()}
            color="#2563eb"
          />
          <ActionButton 
            icon="👥" 
            title="Manage Team" 
            description="Add or edit medical representatives"
            onClick={() => alert('Team management feature coming soon!')}
            color="#10b981"
          />
          <ActionButton 
            icon="⚙️" 
            title="Settings" 
            description="System and team settings"
            onClick={() => alert('Settings feature coming soon!')}
            color="#6b7280"
          />
        </div>
      </div>
    </div>
  )
}

// Updated Stat Card with trends
const StatCard = ({ value, label, color, icon, trend }) => (
  <div className="card" style={{ 
    padding: '25px',
    textAlign: 'center',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '2.5em', marginBottom: '12px' }}>{icon}</div>
    <div style={{ 
      fontSize: '2em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '8px'
    }}>
      {value}
    </div>
    <div style={{ color: '#6b7280', fontSize: '0.95em', marginBottom: '8px' }}>{label}</div>
    <div style={{ 
      fontSize: '0.8em', 
      color: '#10b981',
      fontWeight: '500'
    }}>
      {trend}
    </div>
  </div>
)

// Team Member Card Component
const TeamMemberCard = ({ user, onDownloadReport }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e5e7eb'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div style={{
        width: '50px',
        height: '50px',
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.2em'
      }}>
        {user.user_name?.charAt(0) || 'U'}
      </div>
      <div>
        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '1.1em' }}>
          {user.user_name}
        </div>
        <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
          {user.region} • {user.reports_count || 0} reports
        </div>
      </div>
    </div>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: '600', color: '#16a34a', fontSize: '1.1em' }}>
          RWF {(user.total_value || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
          {user.total_doctors || 0} doctors • {user.total_orders || 0} orders
        </div>
      </div>
      <button
        onClick={() => onDownloadReport(user.user_id)}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.85em',
          fontWeight: '500'
        }}
      >
        📥 Report
      </button>
    </div>
  </div>
)

// Action Button Component
const ActionButton = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '20px',
      background: 'white',
      border: `2px solid ${color}20`,
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'left',
      width: '100%'
    }}
    onMouseOver={(e) => {
      e.target.style.background = `${color}08`;
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.borderColor = `${color}40`;
    }}
    onMouseOut={(e) => {
      e.target.style.background = 'white';
      e.target.style.transform = 'translateY(0)';
      e.target.style.borderColor = `${color}20`;
    }}
  >
    <span style={{ fontSize: '2em', marginBottom: '12px' }}>{icon}</span>
    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
      {title}
    </div>
    <div style={{ fontSize: '0.85em', color: '#6b7280', lineHeight: '1.4' }}>
      {description}
    </div>
  </button>
)

export default SupervisorDashboard