import React, { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Analytics = () => {
  const { user } = useAuth()
  const [weeklyData, setWeeklyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [timeRange, setTimeRange] = useState('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      let response
      if (timeRange === 'week') {
        response = await analyticsAPI.getWeekly()
        if (response.data.success) {
          setWeeklyData(response.data.data)
        }
      } else {
        response = await analyticsAPI.getMonthly()
        if (response.data.success) {
          setMonthlyData(response.data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
    setLoading(false)
  }

  const getCurrentData = () => {
    return timeRange === 'week' ? weeklyData : monthlyData
  }

  const calculateTotals = () => {
    const data = getCurrentData()
    return data.reduce((totals, item) => ({
      doctors: totals.doctors + (item.total_doctors || 0),
      pharmacies: totals.pharmacies + (item.total_pharmacies || 0),
      orders: totals.orders + (item.total_orders || 0),
      value: totals.value + (item.total_value || 0)
    }), { doctors: 0, pharmacies: 0, orders: 0, value: 0 })
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
        Loading your analytics...
      </div>
    )
  }

  const totals = calculateTotals()
  const currentData = getCurrentData()

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          My Performance Analytics 📈
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          Track your performance and progress over time
        </p>
      </div>

      {/* Time Range Selector */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px' 
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'white',
          padding: '5px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {['week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '12px 25px',
                border: 'none',
                background: timeRange === range ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
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

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <StatCard 
          value={totals.doctors} 
          label="Total Doctors Visited"
          color="#3498db"
          icon="👨‍⚕️"
        />
        <StatCard 
          value={totals.pharmacies} 
          label="Total Pharmacies Visited"
          color="#2ecc71"
          icon="💊"
        />
        <StatCard 
          value={totals.orders} 
          label="Total Orders Received"
          color="#e74c3c"
          icon="📦"
        />
        <StatCard 
          value={`RWF ${totals.value.toLocaleString()}`} 
          label="Total Order Value"
          color="#f39c12"
          icon="💰"
        />
      </div>

      {/* Analytics Content */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        <h2 style={{ 
          margin: '0 0 25px 0', 
          color: '#2c3e50',
          textAlign: 'center',
          fontSize: '1.6em'
        }}>
          {timeRange === 'week' ? '📅 Weekly Performance' : '📅 Monthly Performance'}
        </h2>

        {currentData.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#7f8c8d'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>📊</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
              No Data Available
            </h3>
            <p style={{ margin: '0', fontSize: '1.1em' }}>
              {timeRange === 'week' 
                ? "You haven't submitted any reports this week yet."
                : "You haven't submitted any reports this month yet."
              }
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.95em'
            }}>
              <thead>
                <tr style={{ 
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    {timeRange === 'week' ? 'Date' : 'Month'}
                  </th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Doctors</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Pharmacies</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Dispensaries</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Orders</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Value (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((item, index) => (
                  <AnalyticsRow 
                    key={item.report_date || item.month} 
                    item={item} 
                    index={index}
                    timeRange={timeRange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      {currentData.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2d3436' }}>💡 Performance Insights</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px',
            color: '#2d3436'
          }}>
            <div>• <strong>Average Daily Doctors:</strong> {Math.round(totals.doctors / currentData.length)}</div>
            <div>• <strong>Order Conversion Rate:</strong> {((totals.orders / totals.doctors) * 100).toFixed(1)}%</div>
            <div>• <strong>Average Order Value:</strong> RWF {Math.round(totals.value / (totals.orders || 1)).toLocaleString()}</div>
            <div>• <strong>Total Activity Days:</strong> {currentData.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Analytics Row Component
const AnalyticsRow = ({ item, index, timeRange }) => {
  const dateLabel = timeRange === 'week' 
    ? new Date(item.report_date).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    : item.month

  return (
    <tr style={{ 
      borderBottom: '1px solid #e9ecef',
      background: index % 2 === 0 ? '#f8f9fa' : 'white'
    }}>
      <td style={{ padding: '15px', fontWeight: '500', color: '#2c3e50' }}>
        {dateLabel}
      </td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#3498db', fontWeight: '600' }}>
        {item.total_doctors || 0}
      </td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#2ecc71', fontWeight: '600' }}>
        {item.total_pharmacies || 0}
      </td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#27ae60', fontWeight: '600' }}>
        {item.total_dispensaries || 0}
      </td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#e74c3c', fontWeight: '600' }}>
        {item.total_orders || 0}
      </td>
      <td style={{ padding: '15px', textAlign: 'right', color: '#f39c12', fontWeight: '600' }}>
        {(item.total_value || 0).toLocaleString()}
      </td>
    </tr>
  )
}

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

export default Analytics