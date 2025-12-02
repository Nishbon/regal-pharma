import React, { useState, useEffect } from 'react'
import { reportsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const ReportsHistory = () => {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)
  const [error, setError] = useState('')
  const reportsPerPage = 10

  useEffect(() => {
    loadReports()
  }, [currentPage])

  const loadReports = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('📋 Loading reports page:', currentPage)
      
      // Use the updated API with pagination
      const response = await reportsAPI.getMyReports(currentPage, reportsPerPage)
      console.log('📊 Full API response:', response)
      
      if (response.data.success) {
        // NEW: Better handling of API response structure
        let reportsData = []
        let totalCount = 0
        let pages = 1
        
        // Check for different response structures
        if (response.data.data?.reports && Array.isArray(response.data.data.reports)) {
          // Structure 1: { data: { reports: [], pagination: {} } }
          reportsData = response.data.data.reports
          totalCount = response.data.data.pagination?.total || reportsData.length
          pages = response.data.data.pagination?.pages || Math.ceil(totalCount / reportsPerPage)
        } else if (Array.isArray(response.data.data)) {
          // Structure 2: { data: [] }
          reportsData = response.data.data
          totalCount = reportsData.length
          pages = 1
        } else if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          // Structure 3: { data: { data: [], total: X, pages: Y } }
          reportsData = response.data.data.data
          totalCount = response.data.data.total || reportsData.length
          pages = response.data.data.pages || Math.ceil(totalCount / reportsPerPage)
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Structure 4: Single report object
          reportsData = [response.data.data]
          totalCount = 1
          pages = 1
        }
        
        console.log('📋 Processed reports:', reportsData.length)
        console.log('Pagination - total:', totalCount, 'pages:', pages)
        
        setReports(reportsData)
        setTotalReports(totalCount)
        setTotalPages(pages)
      } else {
        console.warn('API returned unsuccessful:', response.data)
        setError(response.data.message || 'Failed to load reports')
      }
    } catch (error) {
      console.error('❌ Failed to load reports:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      let errorMessage = 'Failed to load reports'
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.'
      } else if (error.response?.status === 404) {
        errorMessage = 'Reports endpoint not found'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      setError(errorMessage)
    }
    setLoading(false)
  }

  // Add fallback loading if API fails
  const loadFallbackData = async () => {
    try {
      console.log('🔄 Trying fallback data loading...')
      const allResponse = await reportsAPI.getAll()
      
      if (allResponse.data.success) {
        const allReports = allResponse.data.data || []
        console.log('📋 Total reports from getAll:', allReports.length)
        
        // Filter for current user
        const userId = user?._id || user?.id
        const myReports = allReports.filter(report => {
          const reportUserId = report.user_id?._id || report.user_id || report.user
          return reportUserId === userId
        })
        
        // Paginate manually
        const startIndex = (currentPage - 1) * reportsPerPage
        const endIndex = startIndex + reportsPerPage
        const paginatedReports = myReports.slice(startIndex, endIndex)
        
        console.log('👤 Filtered & paginated reports:', paginatedReports.length)
        
        setReports(paginatedReports)
        setTotalReports(myReports.length)
        setTotalPages(Math.ceil(myReports.length / reportsPerPage))
        setError('') // Clear any previous errors
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
      setError('Could not load reports. Please try again later.')
    }
  }

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

  const calculateTotalVisits = (report) => {
    if (!report) return 0
    return calculateTotalDoctors(report) + (report.pharmacies || 0) + (report.dispensaries || 0)
  }

  const getTotalStats = () => {
    return reports.reduce((stats, report) => ({
      totalDoctors: stats.totalDoctors + calculateTotalDoctors(report),
      totalPharmacies: stats.totalPharmacies + (report.pharmacies || 0),
      totalDispensaries: stats.totalDispensaries + (report.dispensaries || 0),
      totalOrders: stats.totalOrders + (report.orders_count || 0),
      totalValue: stats.totalValue + (report.orders_value || 0),
      totalReports: stats.totalReports + 1
    }), { 
      totalDoctors: 0, 
      totalPharmacies: 0, 
      totalDispensaries: 0, 
      totalOrders: 0, 
      totalValue: 0,
      totalReports: 0 
    })
  }

  const viewReportDetails = (report) => {
    setSelectedReport(report)
  }

  const closeReportDetails = () => {
    setSelectedReport(null)
  }

  const refreshReports = () => {
    setCurrentPage(1)
    loadReports()
  }

  const retryWithFallback = () => {
    setError('')
    loadFallbackData()
  }

  if (loading && reports.length === 0) {
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
        <div style={{ color: '#667eea', fontSize: '18px' }}>Loading your reports...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const stats = getTotalStats()

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px',
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
            onClick={refreshReports}
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
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          My Reports History 📊
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          {reports.length > 0 ? `${totalReports} total reports • ${user?.region || 'All Regions'}` : 'No reports yet'}
        </p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '1.2em' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={refreshReports}
              style={{
                padding: '6px 12px',
                background: '#721c24',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Retry
            </button>
            <button 
              onClick={retryWithFallback}
              style={{
                padding: '6px 12px',
                background: '#856404',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Try Alternative Method
            </button>
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      {reports.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <StatCard 
            value={stats.totalDoctors} 
            label="Total Doctors Visited"
            color="#3498db"
            icon="👨‍⚕️"
          />
          <StatCard 
            value={stats.totalPharmacies + stats.totalDispensaries} 
            label="Total Facilities Visited"
            color="#2ecc71"
            icon="💊"
          />
          <StatCard 
            value={stats.totalOrders} 
            label="Total Orders Received"
            color="#e74c3c"
            icon="📦"
          />
          <StatCard 
            value={`RWF ${stats.totalValue.toLocaleString()}`} 
            label="Total Order Value"
            color="#f39c12"
            icon="💰"
          />
        </div>
      )}

      {/* Reports Table */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ margin: '0', color: '#2c3e50', fontSize: '1.5em' }}>
            {reports.length === 0 ? 'All Reports' : `Showing ${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}
            {totalReports > reports.length && ` (${totalReports} total)`}
          </h2>
          <div style={{ 
            fontSize: '0.9em', 
            color: '#7f8c8d',
            background: '#f8f9fa',
            padding: '5px 15px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>Page {currentPage} of {totalPages}</span>
            {totalReports > 0 && (
              <span style={{ 
                background: '#667eea',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8em'
              }}>
                {totalReports}
              </span>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#7f8c8d'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px', opacity: '0.5' }}>📝</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>No Reports Found</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '1.1em', maxWidth: '400px', margin: '0 auto' }}>
              {error ? 'There was an error loading your reports.' : 'You haven\'t submitted any daily reports yet.'}
            </p>
            <button 
              onClick={() => window.location.href = '/daily-report'}
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
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                marginBottom: '15px'
              }}
            >
              Submit Your First Report
            </button>
            <div style={{ fontSize: '0.9em', color: '#6c757d' }}>
              Or try <button 
                onClick={retryWithFallback}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '1em'
                }}
              >
                alternative loading method
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.95em'
              }}>
                <thead>
                  <tr style={{ 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                  }}>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Date
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Region
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      👨‍⚕️ Doctors
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      💊 Pharmacies
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      🏥 Dispensaries
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      📦 Orders
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'right', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      💰 Value
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) => (
                    <ReportRow 
                      key={report._id || report.id || index} 
                      report={report} 
                      index={index}
                      onViewDetails={viewReportDetails}
                      calculateTotalDoctors={calculateTotalDoctors}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginTop: '30px',
                gap: '10px'
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #dee2e6',
                    background: currentPage === 1 ? '#f8f9fa' : 'white',
                    borderRadius: '8px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.6 : 1,
                    fontWeight: '500',
                    fontSize: '0.9em',
                    transition: 'all 0.2s ease',
                    ':hover': currentPage !== 1 ? {
                      background: '#667eea',
                      color: 'white',
                      borderColor: '#667eea'
                    } : {}
                  }}
                >
                  ← Previous
                </button>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '5px',
                  alignItems: 'center' 
                }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    if (pageNum < 1 || pageNum > totalPages) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #dee2e6',
                          background: currentPage === pageNum ? '#667eea' : 'white',
                          color: currentPage === pageNum ? 'white' : '#6c757d',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? '600' : '500',
                          fontSize: '0.9em',
                          minWidth: '36px',
                          transition: 'all 0.2s ease',
                          ':hover': currentPage !== pageNum ? {
                            background: '#f8f9fa',
                            borderColor: '#667eea'
                          } : {}
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #dee2e6',
                    background: currentPage === totalPages ? '#f8f9fa' : 'white',
                    borderRadius: '8px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.6 : 1,
                    fontWeight: '500',
                    fontSize: '0.9em',
                    transition: 'all 0.2s ease',
                    ':hover': currentPage !== totalPages ? {
                      background: '#667eea',
                      color: 'white',
                      borderColor: '#667eea'
                    } : {}
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportDetails 
          report={selectedReport} 
          onClose={closeReportDetails}
          calculateTotalDoctors={calculateTotalDoctors}
        />
      )}
    </div>
  )
}

// Report Row Component (simplified)
const ReportRow = ({ report, index, onViewDetails, calculateTotalDoctors }) => {
  const totalDoctors = calculateTotalDoctors(report)
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <tr style={{ 
      borderBottom: '1px solid #e9ecef',
      background: index % 2 === 0 ? '#f8f9fa' : 'white',
      transition: 'all 0.2s ease',
      ':hover': {
        background: '#e9ecef'
      }
    }}>
      <td style={{ 
        padding: '15px', 
        fontWeight: '500', 
        color: '#2c3e50',
        whiteSpace: 'nowrap'
      }}>
        {formatDate(report.report_date || report.createdAt)}
      </td>
      <td style={{ 
        padding: '15px', 
        color: '#6c757d',
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {report.region || 'N/A'}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#3498db', 
        fontWeight: '600'
      }}>
        {totalDoctors}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#2ecc71', 
        fontWeight: '600'
      }}>
        {report.pharmacies || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#27ae60', 
        fontWeight: '600'
      }}>
        {report.dispensaries || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center', 
        color: '#e74c3c', 
        fontWeight: '600'
      }}>
        {report.orders_count || 0}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'right', 
        color: '#f39c12', 
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        RWF {(report.orders_value || 0).toLocaleString()}
      </td>
      <td style={{ 
        padding: '15px', 
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}>
        <button
          onClick={() => onViewDetails(report)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85em',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 5px rgba(102, 126, 234, 0.3)',
            ':hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 10px rgba(102, 126, 234, 0.4)'
            }
          }}
        >
          View Details
        </button>
      </td>
    </tr>
  )
}

// Report Details Modal Component (keep as is)
const ReportDetails = ({ report, onClose, calculateTotalDoctors }) => {
  const totalDoctors = calculateTotalDoctors(report)
  const totalVisits = totalDoctors + (report.pharmacies || 0) + (report.dispensaries || 0)
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: '#f8f9fa',
            border: 'none',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2em',
            color: '#6c757d',
            transition: 'all 0.2s ease',
            ':hover': {
              background: '#e9ecef',
              color: '#dc3545'
            }
          }}
        >
          ✕
        </button>

        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ 
            margin: '0 0 10px 0', 
            color: '#2c3e50', 
            fontSize: '1.6em' 
          }}>
            📋 Report Details
          </h2>
          <p style={{ margin: '0', color: '#6c757d', fontSize: '0.95em' }}>
            Submitted on {formatDate(report.report_date || report.createdAt)}
          </p>
        </div>

        <div style={{ display: 'grid', gap: '25px' }}>
          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '15px',
            padding: '20px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '10px'
          }}>
            <StatItem label="Total Visits" value={totalVisits} icon="👣" color="#667eea" />
            <StatItem label="Total Doctors" value={totalDoctors} icon="👨‍⚕️" color="#3498db" />
            <StatItem label="Total Orders" value={report.orders_count || 0} icon="📦" color="#e74c3c" />
            <StatItem label="Order Value" value={`RWF ${(report.orders_value || 0).toLocaleString()}`} icon="💰" color="#f39c12" />
          </div>

          <DetailSection title="📅 Basic Information">
            <DetailItem label="Report Date" value={formatDate(report.report_date)} />
            <DetailItem label="Region" value={report.region || 'Not specified'} />
            <DetailItem label="Submitted At" value={new Date(report.createdAt || report.submitted_at).toLocaleString()} />
          </DetailSection>

          <DetailSection title="👨‍⚕️ Doctors Visited">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: '15px' 
            }}>
              <DetailItem label="🧑‍⚕️ Dentists" value={report.dentists || 0} />
              <DetailItem label="💪 Physiotherapists" value={report.physiotherapists || 0} />
              <DetailItem label="👩‍⚕️ Gynecologists" value={report.gynecologists || 0} />
              <DetailItem label="🫀 Internists" value={report.internists || 0} />
              <DetailItem label="🩺 General Practitioners" value={report.general_practitioners || 0} />
              <DetailItem label="👶 Pediatricians" value={report.pediatricians || 0} />
              <DetailItem label="🌟 Dermatologists" value={report.dermatologists || 0} />
            </div>
          </DetailSection>

          <DetailSection title="💊 Facilities Visited">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '15px' 
            }}>
              <DetailItem label="🏥 Pharmacies" value={report.pharmacies || 0} />
              <DetailItem label="💊 Dispensaries" value={report.dispensaries || 0} />
            </div>
          </DetailSection>

          {report.summary && (
            <DetailSection title="📝 Daily Summary">
              <div style={{ 
                background: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '10px',
                border: '1px solid #e9ecef',
                lineHeight: '1.6',
                color: '#495057',
                fontSize: '0.95em'
              }}>
                {report.summary}
              </div>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  )
}

// Reusable Components (keep as is)
const DetailSection = ({ title, children }) => (
  <div>
    <h3 style={{ 
      margin: '0 0 15px 0', 
      color: '#2c3e50', 
      fontSize: '1.3em',
      paddingBottom: '10px',
      borderBottom: '2px solid #e9ecef'
    }}>
      {title}
    </h3>
    {children}
  </div>
)

const DetailItem = ({ label, value }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px dashed #e9ecef'
  }}>
    <span style={{ color: '#6c757d', fontWeight: '500', fontSize: '0.95em' }}>{label}:</span>
    <span style={{ 
      color: '#2c3e50', 
      fontWeight: '600',
      fontSize: '1em'
    }}>{value}</span>
  </div>
)

const StatItem = ({ label, value, icon, color }) => (
  <div style={{ 
    textAlign: 'center',
    padding: '15px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  }}>
    <div style={{ 
      fontSize: '1.8em', 
      marginBottom: '8px',
      color: color
    }}>{icon}</div>
    <div style={{ 
      fontSize: '1.4em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '5px'
    }}>
      {value}
    </div>
    <div style={{ 
      color: '#6c757d', 
      fontSize: '0.85em',
      fontWeight: '500'
    }}>{label}</div>
  </div>
)

const StatCard = ({ value, label, color, icon }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    textAlign: 'center',
    borderTop: `4px solid ${color}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 5px 20px rgba(0,0,0,0.12)'
    }
  }}>
    <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>{icon}</div>
    <div style={{ 
      fontSize: '1.8em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '8px'
    }}>
      {value}
    </div>
    <div style={{ color: '#7f8c8d', fontSize: '0.9em' }}>{label}</div>
  </div>
)

export default ReportsHistory
