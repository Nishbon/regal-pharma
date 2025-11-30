import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI, reportsAPI } from '../services/api'

const MedRepDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [weeklyResponse, reportsResponse] = await Promise.all([
        analyticsAPI.getWeekly(),
        reportsAPI.getMyReports(1, 5)
      ])

      if (weeklyResponse.data.success) {
        const weeklyData = weeklyResponse.data.data
        const totalStats = weeklyData.reduce((acc, day) => ({
          doctors: acc.doctors + (day.total_doctors || 0),
          pharmacies: acc.pharmacies + (day.total_pharmacies || 0),
          orders: acc.orders + (day.total_orders || 0),
          value: acc.value + (day.total_value || 0)
        }), { doctors: 0, pharmacies: 0, orders: 0, value: 0 })
        
        setStats(totalStats)
      }

      if (reportsResponse.data.success) {
        setRecentReports(reportsResponse.data.data.reports || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
    setLoading(false)
  }

  const calculateTotalDoctors = (report) => {
    return report.dentists + report.physiotherapists + report.gynecologists + 
           report.internists + report.general_practitioners + 
           report.pediatricians + report.dermatologists
  }

  // Navigation handlers
  const navigateToDailyReport = () => navigate('/daily-report')
  const navigateToReports = () => navigate('/reports')
  const navigateToAnalytics = () => navigate('/analytics')

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
        Loading your dashboard...
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Welcome Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>
          Welcome back, {user?.name}! 👋
        </h1>
        <p style={{ margin: '0', fontSize: '1.2em', opacity: '0.9' }}>
          {user?.region ? `${user.region} Region` : 'Medical Representative'} • Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard 
          icon="👨‍⚕️" 
          value={stats.doctors || 0} 
          label="Doctors Visited This Week"
          color="#3498db"
        />
        <StatCard 
          icon="💊" 
          value={stats.pharmacies || 0} 
          label="Pharmacies Visited"
          color="#2ecc71"
        />
        <StatCard 
          icon="📦" 
          value={stats.orders || 0} 
          label="Orders Received"
          color="#e74c3c"
        />
        <StatCard 
          icon="💰" 
          value={`RWF ${(stats.value || 0).toLocaleString()}`} 
          label="Total Order Value"
          color="#f39c12"
        />
      </div>

      {/* Quick Actions & Recent Reports */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Quick Actions */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.4em' }}>
            Quick Actions 🚀
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <ActionButton 
              icon="➕" 
              text="Submit Daily Report" 
              onClick={navigateToDailyReport}
              color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
            <ActionButton 
              icon="📊" 
              text="View My Reports" 
              onClick={navigateToReports}
              color="linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)"
            />
            <ActionButton 
              icon="📈" 
              text="Performance Analytics" 
              onClick={navigateToAnalytics}
              color="linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)"
            />
          </div>
        </div>

        {/* Recent Reports */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.4em' }}>
            Recent Reports 📋
          </h3>
          {recentReports.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#7f8c8d',
              background: '#f8f9fa',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '10px' }}>📝</div>
              <p style={{ margin: '0', fontSize: '1.1em' }}>No reports submitted yet</p>
              <button 
                onClick={navigateToDailyReport}
                style={{
                  display: 'inline-block',
                  marginTop: '15px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '25px',
                  fontSize: '0.9em',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Submit Your First Report
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {recentReports.slice(0, 4).map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div style={{
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2d3436' }}>💡 Performance Tips</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          color: '#2d3436'
        }}>
          <div>• Plan your route efficiently</div>
          <div>• Follow up with key doctors</div>
          <div>• Document detailed summaries</div>
          <div>• Track order patterns</div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ icon, value, label, color }) => (
  <div style={{
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
    textAlign: 'center',
    borderLeft: `4px solid ${color}`,
    transition: 'transform 0.2s ease'
  }}>
    <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>{icon}</div>
    <div style={{ 
      fontSize: '2em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '5px'
    }}>
      {value}
    </div>
    <div style={{ color: '#7f8c8d', fontSize: '0.9em' }}>{label}</div>
  </div>
)

// Action Button Component - UPDATED to use onClick
const ActionButton = ({ icon, text, onClick, color }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '15px 20px',
      background: color,
      color: 'white',
      textDecoration: 'none',
      borderRadius: '10px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1em',
      width: '100%',
      textAlign: 'left'
    }}
  >
    <span style={{ fontSize: '1.5em', marginRight: '15px' }}>{icon}</span>
    <span style={{ fontSize: '1.1em', fontWeight: '500' }}>{text}</span>
  </button>
)

// Report Card Component
const ReportCard = ({ report }) => {
  const totalDoctors = calculateTotalDoctors(report)
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      background: '#f8f9fa',
      borderRadius: '10px',
      border: '1px solid #e9ecef'
    }}>
      <div>
        <div style={{ fontWeight: '600', color: '#2c3e50' }}>
          {new Date(report.report_date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
        <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
          {report.region} • {totalDoctors} doctors • {report.pharmacies} pharmacies
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: '600', color: '#27ae60' }}>
          {report.orders_count} orders
        </div>
        <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
          RWF {report.orders_value?.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate total doctors
const calculateTotalDoctors = (report) => {
  return report.dentists + report.physiotherapists + report.gynecologists + 
         report.internists + report.general_practitioners + 
         report.pediatricians + report.dermatologists
}

export default MedRepDashboard