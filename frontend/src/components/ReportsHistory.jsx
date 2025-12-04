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
      
      const response = await reportsAPI.getMyReports(currentPage, reportsPerPage)
      console.log('📊 Full API response:', response)
      
      if (response.data.success) {
        let reportsData = []
        let totalCount = 0
        let pages = 1
        
        if (response.data.data?.reports && Array.isArray(response.data.data.reports)) {
          reportsData = response.data.data.reports
          totalCount = response.data.data.pagination?.total || reportsData.length
          pages = response.data.data.pagination?.pages || Math.ceil(totalCount / reportsPerPage)
        } else if (Array.isArray(response.data.data)) {
          reportsData = response.data.data
          totalCount = reportsData.length
          pages = 1
        } else if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          reportsData = response.data.data.data
          totalCount = response.data.data.total || reportsData.length
          pages = response.data.data.pages || Math.ceil(totalCount / reportsPerPage)
        } else if (response.data.data && typeof response.data.data === 'object') {
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

  const loadFallbackData = async () => {
    try {
      console.log('🔄 Trying fallback data loading...')
      const allResponse = await reportsAPI.getAll()
      
      if (allResponse.data.success) {
        const allReports = allResponse.data.data || []
        console.log('📋 Total reports from getAll:', allReports.length)
        
        const userId = user?._id || user?.id
        const myReports = allReports.filter(report => {
          const reportUserId = report.user_id?._id || report.user_id || report.user
          return reportUserId === userId
        })
        
        const startIndex = (currentPage - 1) * reportsPerPage
        const endIndex = startIndex + reportsPerPage
        const paginatedReports = myReports.slice(startIndex, endIndex)
        
        console.log('👤 Filtered & paginated reports:', paginatedReports.length)
        
        setReports(paginatedReports)
        setTotalReports(myReports.length)
        setTotalPages(Math.ceil(myReports.length / reportsPerPage))
        setError('')
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
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading your reports...</div>
      </div>
    )
  }

  const stats = getTotalStats()

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <div className="header-content">
          <div>
            <h1>My Reports History</h1>
            <p className="header-subtitle">
              {reports.length > 0 ? `${totalReports} total reports • ${user?.region || 'All Regions'}` : 'No reports yet'}
            </p>
          </div>
          <div className="header-actions">
            <button
              onClick={refreshReports}
              className="refresh-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 9.00001C4.01717 7.5668 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55977 10.0083 3.22426C11.4911 2.88875 13.0348 2.93436 14.4952 3.35677C15.9556 3.77918 17.2853 4.56471 18.36 5.64001L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0656 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

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
          </div>
          <div className="error-actions">
            <button 
              onClick={refreshReports}
              className="error-retry primary"
            >
              Retry
            </button>
            <button 
              onClick={retryWithFallback}
              className="error-retry secondary"
            >
              Try Alternative Method
            </button>
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      {reports.length > 0 && (
        <div className="stats-grid">
          <StatCard 
            value={stats.totalDoctors} 
            label="Total Doctors Visited"
            color="#3b82f6"
            icon="👨‍⚕️"
          />
          <StatCard 
            value={stats.totalPharmacies + stats.totalDispensaries} 
            label="Total Facilities Visited"
            color="#10b981"
            icon="💊"
          />
          <StatCard 
            value={stats.totalOrders} 
            label="Total Orders Received"
            color="#f59e0b"
            icon="📦"
          />
          <StatCard 
            value={`RWF ${stats.totalValue.toLocaleString()}`} 
            label="Total Order Value"
            color="#8b5cf6"
            icon="💰"
          />
        </div>
      )}

      {/* Reports Table */}
      <div className="reports-card">
        <div className="card-header">
          <h2>
            {reports.length === 0 ? 'All Reports' : `Showing ${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}
            {totalReports > reports.length && ` (${totalReports} total)`}
          </h2>
          <div className="page-info">
            <span>Page {currentPage} of {totalPages}</span>
            {totalReports > 0 && (
              <span className="total-badge">
                {totalReports}
              </span>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17H15M9 13H15M9 9H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>No Reports Found</h3>
            <p>
              {error ? 'There was an error loading your reports.' : 'You haven\'t submitted any daily reports yet.'}
            </p>
            <div className="empty-actions">
              <button 
                onClick={() => window.location.href = '/daily-report'}
                className="primary-button"
              >
                Submit Your First Report
              </button>
              <div className="alternative-link">
                Or try{' '}
                <button 
                  onClick={retryWithFallback}
                  className="link-button"
                >
                  alternative loading method
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Region</th>
                    <th>
                      <div className="table-header-cell">
                        <span className="table-icon">👨‍⚕️</span>
                        <span>Doctors</span>
                      </div>
                    </th>
                    <th>
                      <div className="table-header-cell">
                        <span className="table-icon">💊</span>
                        <span>Pharmacies</span>
                      </div>
                    </th>
                    <th>
                      <div className="table-header-cell">
                        <span className="table-icon">🏥</span>
                        <span>Dispensaries</span>
                      </div>
                    </th>
                    <th>
                      <div className="table-header-cell">
                        <span className="table-icon">📦</span>
                        <span>Orders</span>
                      </div>
                    </th>
                    <th>
                      <div className="table-header-cell">
                        <span className="table-icon">💰</span>
                        <span>Value</span>
                      </div>
                    </th>
                    <th>Actions</th>
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
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`pagination-button previous ${currentPage === 1 ? 'disabled' : ''}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Previous
                </button>
                
                <div className="page-numbers">
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
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`pagination-button next ${currentPage === totalPages ? 'disabled' : ''}`}
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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

// Report Row Component
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
    <tr className={`report-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
      <td className="row-date">
        <div className="date-text">{formatDate(report.report_date || report.createdAt)}</div>
      </td>
      <td className="row-region">
        {report.region || 'N/A'}
      </td>
      <td className="row-doctors">{totalDoctors}</td>
      <td className="row-pharmacies">{report.pharmacies || 0}</td>
      <td className="row-dispensaries">{report.dispensaries || 0}</td>
      <td className="row-orders">{report.orders_count || 0}</td>
      <td className="row-value">
        <div className="value-content">
          <span className="currency">RWF</span>
          <span className="amount">{(report.orders_value || 0).toLocaleString()}</span>
        </div>
      </td>
      <td className="row-actions">
        <button
          onClick={() => onViewDetails(report)}
          className="view-button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          View Details
        </button>
      </td>
    </tr>
  )
}

// Report Details Modal Component
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
    <div className="report-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <button
          onClick={onClose}
          className="modal-close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="modal-header">
          <h2>Report Details</h2>
          <p className="modal-subtitle">
            Submitted on {formatDate(report.report_date || report.createdAt)}
          </p>
        </div>

        <div className="modal-body">
          {/* Quick Stats */}
          <div className="quick-stats">
            <StatItem label="Total Visits" value={totalVisits} icon="👣" color="#3b82f6" />
            <StatItem label="Total Doctors" value={totalDoctors} icon="👨‍⚕️" color="#10b981" />
            <StatItem label="Total Orders" value={report.orders_count || 0} icon="📦" color="#f59e0b" />
            <StatItem label="Order Value" value={`RWF ${(report.orders_value || 0).toLocaleString()}`} icon="💰" color="#8b5cf6" />
          </div>

          <DetailSection title="Basic Information">
            <DetailItem label="Report Date" value={formatDate(report.report_date)} />
            <DetailItem label="Region" value={report.region || 'Not specified'} />
            <DetailItem label="Submitted At" value={new Date(report.createdAt || report.submitted_at).toLocaleString()} />
          </DetailSection>

          <DetailSection title="Doctors Visited">
            <div className="doctors-grid">
              <DetailItem label="🧑‍⚕️ Dentists" value={report.dentists || 0} />
              <DetailItem label="💪 Physiotherapists" value={report.physiotherapists || 0} />
              <DetailItem label="👩‍⚕️ Gynecologists" value={report.gynecologists || 0} />
              <DetailItem label="🫀 Internists" value={report.internists || 0} />
              <DetailItem label="🩺 General Practitioners" value={report.general_practitioners || 0} />
              <DetailItem label="👶 Pediatricians" value={report.pediatricians || 0} />
              <DetailItem label="🌟 Dermatologists" value={report.dermatologists || 0} />
            </div>
          </DetailSection>

          <DetailSection title="Facilities Visited">
            <div className="facilities-grid">
              <DetailItem label="🏥 Pharmacies" value={report.pharmacies || 0} />
              <DetailItem label="💊 Dispensaries" value={report.dispensaries || 0} />
            </div>
          </DetailSection>

          {report.summary && (
            <DetailSection title="Daily Summary">
              <div className="summary-box">
                {report.summary}
              </div>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  )
}

// Reusable Components
const DetailSection = ({ title, children }) => (
  <div className="detail-section">
    <h3>{title}</h3>
    {children}
  </div>
)

const DetailItem = ({ label, value }) => (
  <div className="detail-item">
    <span className="detail-label">{label}:</span>
    <span className="detail-value">{value}</span>
  </div>
)

const StatItem = ({ label, value, icon, color }) => (
  <div className="stat-item-modal" style={{ borderColor: color }}>
    <div className="stat-icon-modal" style={{ color: color }}>
      {icon}
    </div>
    <div className="stat-content-modal">
      <div className="stat-value-modal" style={{ color: color }}>{value}</div>
      <div className="stat-label-modal">{label}</div>
    </div>
  </div>
)

const StatCard = ({ value, label, color, icon }) => (
  <div className="stat-card-reports" style={{ borderColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: `${color}15` }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value" style={{ color: color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)

// CSS Styles
const styles = `
.reports-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Loading State */
.reports-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  flex-direction: column;
  gap: 20px;
}

.reports-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.reports-loading .loading-text {
  color: #3b82f6;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Header */
.reports-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 40px;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.reports-header h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh-button {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.refresh-button svg {
  width: 16px;
  height: 16px;
}

/* Error Card */
.error-card {
  background: #fef2f2;
  color: #991b1b;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 1px solid #fecaca;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
}

.error-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.error-actions {
  display: flex;
  gap: 10px;
}

.error-retry {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.error-retry.primary {
  background: #991b1b;
  color: white;
}

.error-retry.primary:hover {
  background: #7f1d1d;
}

.error-retry.secondary {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.error-retry.secondary:hover {
  background: #fde68a;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card-reports {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-top: 3px solid;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.stat-card-reports:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card-reports .stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-card-reports .stat-content {
  flex: 1;
  min-width: 0;
}

.stat-card-reports .stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.stat-card-reports .stat-label {
  font-size: 14px;
  color: #475569;
  font-weight: 600;
  line-height: 1.3;
}

/* Reports Card */
.reports-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.page-info {
  font-size: 14px;
  color: #64748b;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.total-badge {
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-state h3 {
  margin: 0 0 16px 0;
  color: #475569;
  font-size: 18px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 auto 24px;
  font-size: 15px;
  max-width: 400px;
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.primary-button {
  padding: 12px 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
  transition: all 0.3s ease;
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.alternative-link {
  font-size: 14px;
  color: #64748b;
}

.link-button {
  background: none;
  border: none;
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 500;
}

.link-button:hover {
  color: #1d4ed8;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.reports-table thead {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #e2e8f0;
}

.reports-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.table-header-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-icon {
  font-size: 16px;
}

.reports-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}

/* Table Rows */
.report-row {
  transition: background-color 0.2s ease;
}

.report-row:hover {
  background: #f8fafc;
}

.report-row.even {
  background: #ffffff;
}

.report-row.odd {
  background: #f8fafc;
}

.row-date .date-text {
  font-weight: 600;
  color: #1e293b;
  font-size: 15px;
}

.row-region {
  color: #64748b;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-doctors { color: #3b82f6; font-weight: 600; text-align: center; }
.row-pharmacies { color: #10b981; font-weight: 600; text-align: center; }
.row-dispensaries { color: #06b6d4; font-weight: 600; text-align: center; }
.row-orders { color: #f59e0b; font-weight: 600; text-align: center; }

.row-value .value-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.row-value .currency {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.row-value .amount {
  color: #8b5cf6;
  font-weight: 600;
  font-size: 15px;
}

.row-actions {
  text-align: center;
}

.view-button {
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
}

.view-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.view-button svg {
  width: 16px;
  height: 16px;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
  gap: 12px;
}

.pagination-button {
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
}

.pagination-button:hover:not(.disabled) {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.pagination-button.disabled {
  background: #f8fafc;
  cursor: not-allowed;
  opacity: 0.6;
}

.page-numbers {
  display: flex;
  gap: 4px;
  align-items: center;
}

.page-number {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  min-width: 36px;
  transition: all 0.2s ease;
}

.page-number:hover:not(.active) {
  background: #f8fafc;
  border-color: #3b82f6;
}

.page-number.active {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-color: #3b82f6;
}

/* Report Modal */
.report-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 1001;
  border: 1px solid #e2e8f0;
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #f8fafc;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #ef4444;
  color: white;
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-header {
  margin-bottom: 30px;
}

.modal-header h2 {
  margin: 0 0 8px 0;
  color: #1e293b;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.modal-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 15px;
}

.modal-body {
  display: grid;
  gap: 30px;
}

/* Quick Stats in Modal */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.stat-item-modal {
  background: white;
  padding: 20px;
  border-radius: 10px;
  border-top: 3px solid;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon-modal {
  font-size: 24px;
  margin-bottom: 12px;
}

.stat-value-modal {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.2;
}

.stat-label-modal {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* Detail Sections in Modal */
.detail-section {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 24px;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.doctors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.facilities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px dashed #e2e8f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #64748b;
  font-weight: 500;
  font-size: 15px;
}

.detail-value {
  color: #1e293b;
  font-weight: 600;
  font-size: 15px;
}

.summary-box {
  background: #f8fafc;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  line-height: 1.6;
  color: #475569;
  font-size: 15px;
  max-height: 200px;
  overflow-y: auto;
}

/* Responsive */
@media (max-width: 1024px) {
  .doctors-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .reports-container {
    padding: 16px;
  }
  
  .reports-header {
    padding: 24px;
  }
  
  .reports-header h1 {
    font-size: 24px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .refresh-button {
    flex: 1;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .reports-card {
    padding: 20px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .page-info {
    align-self: flex-start;
  }
  
  .doctors-grid {
    grid-template-columns: 1fr;
  }
  
  .facilities-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    padding: 24px;
    border-radius: 16px;
  }
  
  .quick-stats {
    grid-template-columns: 1fr 1fr;
  }
  
  .pagination {
    flex-direction: column;
    gap: 16px;
  }
  
  .page-numbers {
    order: 1;
  }
  
  .pagination-button.previous {
    order: 2;
  }
  
  .pagination-button.next {
    order: 3;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .reports-table {
    font-size: 14px;
  }
  
  .reports-table th,
  .reports-table td {
    padding: 12px 8px;
  }
  
  .view-button {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .view-button svg {
    width: 14px;
    height: 14px;
  }
  
  .quick-stats {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    padding: 20px;
  }
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default ReportsHistory
