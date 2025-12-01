import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { reportsAPI } from '../services/api'

const MedRepDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPharmacies: 0,
    totalOrders: 0,
    totalValue: 0,
    totalReports: 0
  })

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      console.log('🔄 Loading dashboard data...')
      setLoading(true)
      
      // Load recent reports
      const response = await reportsAPI.getMyReports(1, 10)
      console.log('📊 API Response:', response.data)
      
      if (response.data.success) {
        // Handle different response structures
        let reports = []
        
        if (response.data.data?.reports) {
          reports = response.data.data.reports
        } else if (Array.isArray(response.data.data)) {
          reports = response.data.data
        } else if (Array.isArray(response.data.data?.data)) {
          reports = response.data.data.data
        }
        
        console.log('📋 Found reports:', reports)
        setRecentReports(reports)
        
        // Calculate stats
        const totalStats = reports.reduce((acc, report) => ({
          totalDoctors: acc.totalDoctors + calculateTotalDoctors(report),
          totalPharmacies: acc.totalPharmacies + (report.pharmacies || 0) + (report.dispensaries || 0),
          totalOrders: acc.totalOrders + (report.orders_count || 0),
          totalValue: acc.totalValue + (report.orders_value || 0),
          totalReports: acc.totalReports + 1
        }), {
          totalDoctors: 0,
          totalPharmacies: 0,
          totalOrders: 0,
          totalValue: 0,
          totalReports: 0
        })
        
        setStats(totalStats)
      } else {
        console.warn('API returned unsuccessful response:', response.data)
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      console.error('Error details:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  // Listen for report submission events
  useEffect(() => {
    loadDashboardData()
    
    const handleReportSubmitted = () => {
      console.log('📢 Report submitted event received, refreshing dashboard...')
      loadDashboardData()
    }
    
    window.addEventListener('reportSubmitted', handleReportSubmitted)
    
    return () => {
      window.removeEventListener('reportSubmitted', handleReportSubmitted)
    }
  }, [lastRefresh])

  // Calculate total doctors from a report
  const calculateTotalDoctors = (report) => {
    if (!report) return 0
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

  // Navigation handlers
  const navigateToDailyReport = () => navigate('/daily-report')
  const navigateToReports = () => navigate('/reports')
  const navigateToAnalytics = () => navigate('/analytics')
  const navigateToProfile = () => navigate('/profile')

  // Refresh dashboard
  const refreshDashboard = () => {
    console.log('🔄 Manual refresh triggered')
    setLastRefresh(Date.now())
  }

  // Check database directly
  const checkDatabase = async () => {
    try {
      console.log('🔍 Checking database...')
      const token = localStorage.getItem('token')
      const response = await fetch('https://regal-pharma-backend.onrender.com/api/reports/my-reports?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      console.log('📊 Database check:', data)
      alert(`Found ${data.data?.reports?.length || data.data?.length || 0} reports in database`)
    } catch (error) {
      console.error('Error checking database:', error)
    }
  }

  // Debug: View raw report data
  const viewRawData = () => {
    console.log('📊 Raw reports data:', recentReports)
    alert(`Total reports: ${recentReports.length}\nCheck console for details`)
  }

  if (loading && recentReports.length === 0) {
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
          borderTop: '5px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: '#667eea', fontSize: '18px' }}>Loading your dashboard...</div>
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
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Welcome Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={refreshDashboard}
            style={{
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
          <button
            onClick={viewRawData}
            style={{
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
            📊 View Data
          </button>
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p style={{ margin: '0', fontSize: '1.2em', opacity: '0.9' }}>
          {user?.role === 'supervisor' ? 'Supervisor' : 'Medical Representative'} • 
          {user?.region ? ` ${user.region} Region` : ''} • 
          {stats.totalReports > 0 ? ` ${stats.totalReports} reports` : ' No reports yet'}
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard 
          icon="📋" 
          value={stats.totalReports} 
          label="Total Reports"
          color="#667eea"
        />
        <StatCard 
          icon="👨‍⚕️" 
          value={stats.totalDoctors} 
          label="Doctors Visited"
          color="#3498db"
        />
        <StatCard 
          icon="💊" 
          value={stats.totalPharmacies} 
          label="Pharmacies Visited"
          color="#2ecc71"
        />
        <StatCard 
          icon="💰" 
          value={`RWF ${stats.totalValue.toLocaleString()}`} 
          label="Total Orders Value"
          color="#f39c12"
        />
      </div>

      {/* Main Content */}
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
              icon="📝" 
              text="Submit Daily Report" 
              onClick={navigateToDailyReport}
              color="#667eea"
            />
            <ActionButton 
              icon="📊" 
              text="View All Reports" 
              onClick={navigateToReports}
              color="#2ecc71"
            />
            <ActionButton 
              icon="📈" 
              text="Performance Analytics" 
              onClick={navigateToAnalytics}
              color="#e74c3c"
            />
            <ActionButton 
              icon="👤" 
              text="My Profile" 
              onClick={navigateToProfile}
              color="#9b59b6"
            />
            <ActionButton 
              icon="🚪" 
              text="Logout" 
              onClick={logout}
              color="#95a5a6"
            />
          </div>
        </div>

        {/* Recent Reports */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
          minHeight: '300px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px' 
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '1.4em' }}>
              Recent Reports 📋
            </h3>
            <button 
              onClick={checkDatabase}
              style={{
                background: '#f8f9fa',
                color: '#667eea',
                border: '1px solid #e9ecef',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🔍 Check Database
            </button>
          </div>
          
          {recentReports.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px', 
              color: '#7f8c8d',
              background: '#f8f9fa',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '4em', marginBottom: '20px', opacity: '0.5' }}>📝</div>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>No Reports Yet</h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '1em' }}>
                You haven't submitted any daily reports yet.
              </p>
              <button 
                onClick={navigateToDailyReport}
                style={{
                  display: 'inline-block',
                  padding: '12px 30px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
              >
                Submit Your First Report
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentReports.map((report, index) => (
                <ReportCard key={report._id || report.id || index} report={report} />
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px',
          color: '#2d3436'
        }}>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
            <strong>📅 Plan Ahead:</strong> Schedule your visits efficiently
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
            <strong>📝 Detailed Notes:</strong> Document specific doctor feedback
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
            <strong>🔄 Follow Up:</strong> Maintain regular contact with key clinics
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px' }}>
            <strong>📊 Analyze:</strong> Review your weekly performance patterns
          </div>
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
    borderTop: `4px solid ${color}`,
    transition: 'transform 0.2s ease',
    ':hover': {
      transform: 'translateY(-5px)'
    }
  }}>
    <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>{icon}</div>
    <div style={{ 
      fontSize: '2.2em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '8px'
    }}>
      {value}
    </div>
    <div style={{ color: '#7f8c8d', fontSize: '0.95em' }}>{label}</div>
  </div>
)

// Action Button Component
const ActionButton = ({ icon, text, onClick, color }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '16px 20px',
      background: color,
      color: 'white',
      borderRadius: '10px',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1em',
      width: '100%',
      textAlign: 'left',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 15px rgba(0,0,0,0.15)'
      }
    }}
  >
    <span style={{ fontSize: '1.5em', marginRight: '15px', width: '30px' }}>{icon}</span>
    <span style={{ fontSize: '1.1em', fontWeight: '500', flex: 1 }}>{text}</span>
    <span style={{ fontSize: '1.2em' }}>→</span>
  </button>
)

// Report Card Component
const ReportCard = ({ report }) => {
  const totalDoctors = (
    (report.dentists || 0) +
    (report.physiotherapists || 0) +
    (report.gynecologists || 0) +
    (report.internists || 0) +
    (report.general_practitioners || 0) +
    (report.pediatricians || 0) +
    (report.dermatologists || 0)
  )
  
  const totalVisits = totalDoctors + (report.pharmacies || 0) + (report.dispensaries || 0)
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '18px 20px',
      background: '#f8f9fa',
      borderRadius: '10px',
      border: '1px solid #e9ecef',
      transition: 'all 0.2s ease',
      ':hover': {
        background: '#e9ecef',
        borderColor: '#667eea',
        transform: 'translateX(5px)'
      }
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '5px' 
        }}>
          <div style={{ 
            fontSize: '1.8em', 
            background: '#667eea',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {report.orders_count > 0 ? '📦' : '📋'}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '1.1em' }}>
              {formatDate(report.report_date)}
            </div>
            <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
              {report.region || 'No region'} • {totalVisits} total visits
            </div>
          </div>
        </div>
        
        {report.summary && (
          <div style={{
            fontSize: '0.9em',
            color: '#5d6d7e',
            marginTop: '8px',
            padding: '8px',
            background: 'white',
            borderRadius: '6px',
            borderLeft: '3px solid #2ecc71'
          }}>
            {report.summary.length > 80 ? report.summary.substring(0, 80) + '...' : report.summary}
          </div>
        )}
      </div>
      
      <div style={{ 
        textAlign: 'right',
        minWidth: '120px' 
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '5px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: '8px' 
          }}>
            <span style={{ color: '#27ae60', fontWeight: '600' }}>
              {report.orders_count || 0} orders
            </span>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: report.orders_count > 0 ? '#2ecc71' : '#95a5a6'
            }}></div>
          </div>
          <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
            RWF {(report.orders_value || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MedRepDashboard
