import React, { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext' // Added AuthContext

const TeamAnalytics = () => {
  const { user } = useAuth() // Get current user
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
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: '#3498db', fontSize: '18px' }}>Loading team analytics...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        <button
          onClick={refreshData}
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

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          Team Analytics Dashboard 📊
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          {user?.name || 'Supervisor'} • Comprehensive team performance overview
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
          🔍 Showing: {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'} data • {teamPerformance.length} team members
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
          border: '1px solid #f5c6cb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            ⚠️ {error}
          </div>
          <button 
            onClick={refreshData}
            style={{
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
                fontSize: '1em',
                transition: 'all 0.3s ease'
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
          value={totals.reports} 
          label="Total Reports"
          color="#9b59b6"
          icon="📝"
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
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
          minHeight: '400px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #f8f9fa'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '1.3em' }}>
              Team Performance
            </h3>
            <div style={{ 
              fontSize: '0.9em', 
              color: '#7f8c8d',
              background: '#f8f9fa',
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              {teamPerformance.length} team members
            </div>
          </div>
          
          {teamPerformance.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#7f8c8d'
            }}>
              <div style={{ fontSize: '4em', marginBottom: '20px', opacity: '0.5' }}>👥</div>
              <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>No Team Data Available</h4>
              <p style={{ margin: '0', fontSize: '1.1em', maxWidth: '400px', margin: '0 auto' }}>
                Team members haven't submitted any reports in the selected time period.
              </p>
              <button
                onClick={refreshData}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                🔄 Refresh Data
              </button>
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
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #f8f9fa'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '1.3em' }}>
              Regional Performance
            </h3>
            <div style={{ 
              fontSize: '0.9em', 
              color: '#7f8c8d',
              background: '#f8f9fa',
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              {regionPerformance.length} regions
            </div>
          </div>
          
          {regionPerformance.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#7f8c8d'
            }}>
              <div style={{ fontSize: '4em', marginBottom: '20px', opacity: '0.5' }}>🗺️</div>
              <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>No Regional Data Available</h4>
              <p style={{ margin: '0', fontSize: '1.1em', maxWidth: '400px', margin: '0 auto' }}>
                No regional performance data available.
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
      <div style={{
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2d3436', fontSize: '1.3em' }}>
          📈 Performance Insights
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          color: '#2d3436'
        }}>
          <InsightCard 
            title="Average Doctors per Rep" 
            value={Math.round(totals.doctors / (totals.reps || 1))}
            unit="doctors"
            icon="👨‍⚕️"
            color="#3498db"
          />
          <InsightCard 
            title="Order Conversion Rate" 
            value={((totals.orders / totals.doctors) * 100 || 0).toFixed(1)}
            unit="%"
            icon="📊"
            color="#2ecc71"
          />
          <InsightCard 
            title="Average Order Value" 
            value={`RWF ${Math.round(totals.value / (totals.orders || 1)).toLocaleString()}`}
            unit="per order"
            icon="💰"
            color="#f39c12"
          />
          <InsightCard 
            title="Active Regions" 
            value={new Set(teamPerformance.map(u => u.region)).size}
            unit="regions"
            icon="🌍"
            color="#9b59b6"
          />
        </div>
      </div>

      {/* Export Section */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          color: '#2c3e50', 
          fontSize: '1.3em',
          paddingBottom: '15px',
          borderBottom: '2px solid #f8f9fa'
        }}>
          📤 Export Reports
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          <ExportButton 
            icon="📊" 
            title="Export Team Report" 
            description="Generate comprehensive PDF report for the entire team"
            onClick={() => alert('Team report export feature coming soon!')}
            color="#3498db"
          />
          <ExportButton 
            icon="📈" 
            title="Export Analytics" 
            description="Export detailed analytics data to Excel format"
            onClick={() => alert('Analytics export feature coming soon!')}
            color="#2ecc71"
          />
          <ExportButton 
            icon="🌍" 
            title="Export Regional Data" 
            description="Generate regional performance reports"
            onClick={() => alert('Regional report export feature coming soon!')}
            color="#9b59b6"
          />
        </div>
      </div>
    </div>
  )
}

// Team Member Card Component
const TeamMemberCard = ({ user, rank }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f1f8ff',
      borderColor: '#3498db',
      transform: 'translateX(5px)'
    }
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: rank <= 3 ? 
          rank === 1 ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' :
          rank === 2 ? 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)' :
          'linear-gradient(135deg, #d35400 0%, #a04000 100%)' :
          'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
        borderRadius: '50%',
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
          marginBottom: '4px'
        }}>
          <div style={{ 
            fontWeight: '600', 
            color: '#2c3e50',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {user.user_name}
          </div>
          {rank <= 3 && (
            <span style={{
              fontSize: '0.75em',
              background: rank === 1 ? '#fef9e7' : 
                         rank === 2 ? '#f8f9fa' : '#fef9e7',
              color: rank === 1 ? '#d35400' : 
                     rank === 2 ? '#2c3e50' : '#d35400',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: '0.85em', 
          color: '#7f8c8d',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {user.region || 'Unknown Region'} • {user.reports_count || 0} reports
          {user.user_email && ` • ${user.user_email}`}
        </div>
      </div>
    </div>
    
    <div style={{ textAlign: 'right', minWidth: '120px', flexShrink: 0 }}>
      <div style={{ fontWeight: '600', color: '#27ae60', fontSize: '1.1em' }}>
        RWF {(user.total_value || 0).toLocaleString()}
      </div>
      <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>
        {user.total_doctors || 0} doctors • {user.total_orders || 0} orders
      </div>
    </div>
  </div>
)

// Region Card Component
const RegionCard = ({ region, rank }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '10px',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f1f8ff',
      borderColor: '#3498db',
      transform: 'translateX(5px)'
    }
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
        borderRadius: '50%',
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
      <div>
        <div style={{ fontWeight: '600', color: '#2c3e50' }}>
          {region.region || 'Unknown Region'}
        </div>
        <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>
          {region.active_reps || 0} active reps • {region.report_count || 0} reports
        </div>
      </div>
    </div>
    
    <div style={{ textAlign: 'right', minWidth: '120px', flexShrink: 0 }}>
      <div style={{ fontWeight: '600', color: '#27ae60', fontSize: '1.1em' }}>
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
    borderLeft: `4px solid ${color}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
    }
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

// Insight Card Component
const InsightCard = ({ title, value, unit, icon, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.4)',
    padding: '15px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      background: color,
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.5em',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ 
        fontSize: '0.9em', 
        color: '#2d3436', 
        fontWeight: '500',
        marginBottom: '4px'
      }}>
        {title}
      </div>
      <div style={{ 
        fontSize: '1.3em', 
        color: color, 
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {value} <span style={{ fontSize: '0.8em', opacity: '0.8' }}>{unit}</span>
      </div>
    </div>
  </div>
)

// Export Button Component
const ExportButton = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '20px',
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
      fontSize: '2em', 
      marginBottom: '15px',
      color: color
    }}>{icon}</span>
    <div style={{ 
      fontWeight: '600', 
      color: '#2c3e50', 
      marginBottom: '8px',
      fontSize: '1.1em'
    }}>
      {title}
    </div>
    <div style={{ 
      fontSize: '0.9em', 
      color: '#7f8c8d', 
      lineHeight: '1.5',
      flex: 1
    }}>
      {description}
    </div>
    <div style={{ 
      marginTop: '15px',
      color: color,
      fontWeight: '500',
      fontSize: '0.85em',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    }}>
      Click to export →
    </div>
  </button>
)

export default TeamAnalytics
