import React, { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'

const TeamAnalytics = () => {
  const [teamPerformance, setTeamPerformance] = useState([])
  const [regionPerformance, setRegionPerformance] = useState([])
  const [timeRange, setTimeRange] = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeamAnalytics()
  }, [timeRange])

  const loadTeamAnalytics = async () => {
    try {
      const [teamResponse, regionResponse] = await Promise.all([
        analyticsAPI.getTeamPerformance(timeRange),
        analyticsAPI.getRegionPerformance()
      ])

      if (teamResponse.data.success) {
        setTeamPerformance(teamResponse.data.data)
      }
      if (regionResponse.data.success) {
        setRegionPerformance(regionResponse.data.data)
      }
    } catch (error) {
      console.error('Failed to load team analytics:', error)
    }
    setLoading(false)
  }

  const getTotals = () => {
    return teamPerformance.reduce((totals, user) => ({
      doctors: totals.doctors + (user.total_doctors || 0),
      pharmacies: totals.pharmacies + (user.total_pharmacies || 0),
      orders: totals.orders + (user.total_orders || 0),
      value: totals.value + (user.total_value || 0),
      reps: totals.reps + 1
    }), { doctors: 0, pharmacies: 0, orders: 0, value: 0, reps: 0 })
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading team analytics...
      </div>
    )
  }

  const totals = getTotals()

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          Team Analytics 📊
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          Comprehensive team performance overview and regional analysis
        </p>
      </div>

      {/* Time Range Selector */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{
          display: 'inline-flex',
          background: 'white',
          padding: '5px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {['week', 'month', 'quarter'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '12px 25px',
                border: 'none',
                background: timeRange === range ? 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' : 'transparent',
                color: timeRange === range ? 'white' : '#666',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                textTransform: 'capitalize',
                fontSize: '1em'
              }}
            >
              This {range}
            </button>
          ))}
        </div>
      </div>

      {/* Team Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <StatCard 
          value={totals.reps} 
          label="Active MedReps"
          color="#3498db"
          icon="👥"
        />
        <StatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#2ecc71"
          icon="👨‍⚕️"
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders"
          color="#e74c3c"
          icon="📦"
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Revenue"
          color="#f39c12"
          icon="💰"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Team Performance */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Team Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {teamPerformance.map(user => (
              <TeamMemberCard key={user.user_id} user={user} />
            ))}
          </div>
        </div>

        {/* Regional Performance */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Regional Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {regionPerformance.map(region => (
              <RegionCard key={region.region} region={region} />
            ))}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div style={{
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2d3436' }}>📈 Performance Insights</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px',
          color: '#2d3436'
        }}>
          <div>• <strong>Average per Rep:</strong> {Math.round(totals.doctors / (totals.reps || 1))} doctors</div>
          <div>• <strong>Order Conversion:</strong> {((totals.orders / totals.doctors) * 100 || 0).toFixed(1)}%</div>
          <div>• <strong>Avg Order Value:</strong> RWF {Math.round(totals.value / (totals.orders || 1)).toLocaleString()}</div>
          <div>• <strong>Active Regions:</strong> {new Set(teamPerformance.map(u => u.region)).size}</div>
        </div>
      </div>
    </div>
  )
}

// Team Member Card Component
const TeamMemberCard = ({ user }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    border: '1px solid #e9ecef'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1em'
      }}>
        {user.user_name?.charAt(0) || 'U'}
      </div>
      <div>
        <div style={{ fontWeight: '600', color: '#2c3e50' }}>
          {user.user_name}
        </div>
        <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>
          {user.region} • {user.reports_count || 0} reports
        </div>
      </div>
    </div>
    
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: '600', color: '#27ae60' }}>
        RWF {(user.total_value || 0).toLocaleString()}
      </div>
      <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>
        {user.total_doctors || 0} doctors • {user.total_orders || 0} orders
      </div>
    </div>
  </div>
)

// Region Card Component
const RegionCard = ({ region }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    border: '1px solid #e9ecef'
  }}>
    <div>
      <div style={{ fontWeight: '600', color: '#2c3e50' }}>
        {region.region}
      </div>
      <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>
        {region.active_reps} active reps
      </div>
    </div>
    
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: '600', color: '#27ae60' }}>
        RWF {(region.total_value || 0).toLocaleString()}
      </div>
      <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>
        {region.total_doctors || 0} doctors • {region.total_orders || 0} orders
      </div>
    </div>
  </div>
)

// Stat Card Component
const StatCard = ({ value, label, color, icon }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    textAlign: 'center',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '2em', marginBottom: '8px' }}>{icon}</div>
    <div style={{ 
      fontSize: '1.5em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '5px'
    }}>
      {value}
    </div>
    <div style={{ color: '#7f8c8d', fontSize: '0.9em' }}>{label}</div>
  </div>
)

export default TeamAnalytics