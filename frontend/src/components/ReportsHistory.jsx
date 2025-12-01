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
  const reportsPerPage = 10

  useEffect(() => {
    loadReports()
  }, [currentPage])

  const loadReports = async () => {
    try {
      const response = await reportsAPI.getMyReports(currentPage, reportsPerPage)
      if (response.data.success) {
        setReports(response.data.data.reports || [])
        setTotalPages(response.data.data.pagination?.pages || 1)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    }
    setLoading(false)
  }

  const calculateTotalDoctors = (report) => {
    return report.dentists + report.physiotherapists + report.gynecologists + 
           report.internists + report.general_practitioners + 
           report.pediatricians + report.dermatologists
  }

  const getTotalStats = () => {
    return reports.reduce((stats, report) => ({
      totalDoctors: stats.totalDoctors + calculateTotalDoctors(report),
      totalPharmacies: stats.totalPharmacies + report.pharmacies,
      totalOrders: stats.totalOrders + report.orders_count,
      totalValue: stats.totalValue + report.orders_value
    }), { totalDoctors: 0, totalPharmacies: 0, totalOrders: 0, totalValue: 0 })
  }

  const viewReportDetails = (report) => {
    setSelectedReport(report)
  }

  const closeReportDetails = () => {
    setSelectedReport(null)
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
        Loading your reports...
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
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          My Reports History 📊
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          View and manage all your submitted daily reports
        </p>
      </div>

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
            value={stats.totalPharmacies} 
            label="Total Pharmacies Visited"
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
            All Reports ({reports.length})
          </h2>
        </div>

        {reports.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#7f8c8d'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>📝</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>No Reports Yet</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '1.1em' }}>
              You haven't submitted any daily reports yet.
            </p>
            <button 
              onClick={() => window.location.href = '/daily-report'}
              style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '1em',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Submit Your First Report
            </button>
          </div>
        ) : (
          <>
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
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Date</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Region</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Doctors</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Pharmacies</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Orders</th>
                    <th style={{ padding: '15px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Value (RWF)</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) => (
                    <ReportRow 
                      key={report.id} 
                      report={report} 
                      index={index}
                      onViewDetails={viewReportDetails}
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
                    padding: '8px 15px',
                    border: '1px solid #dee2e6',
                    background: 'white',
                    borderRadius: '5px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                <span style={{ color: '#6c757d', padding: '0 15px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 15px',
                    border: '1px solid #dee2e6',
                    background: 'white',
                    borderRadius: '5px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  Next
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
const ReportRow = ({ report, index, onViewDetails }) => {
  const totalDoctors = report.dentists + report.physiotherapists + report.gynecologists + 
                      report.internists + report.general_practitioners + 
                      report.pediatricians + report.dermatologists

  return (
    <tr style={{ 
      borderBottom: '1px solid #e9ecef',
      background: index % 2 === 0 ? '#f8f9fa' : 'white',
      transition: 'background-color 0.2s ease'
    }}>
      <td style={{ padding: '15px', fontWeight: '500', color: '#2c3e50' }}>
        {new Date(report.report_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}
      </td>
      <td style={{ padding: '15px', color: '#6c757d' }}>{report.region}</td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#3498db', fontWeight: '600' }}>
        {totalDoctors}
      </td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#2ecc71', fontWeight: '600' }}>
        {report.pharmacies}
      </td>
      <td style={{ padding: '15px', textAlign: 'center', color: '#e74c3c', fontWeight: '600' }}>
        {report.orders_count}
      </td>
      <td style={{ padding: '15px', textAlign: 'right', color: '#f39c12', fontWeight: '600' }}>
        {report.orders_value.toLocaleString()}
      </td>
      <td style={{ padding: '15px', textAlign: 'center' }}>
        <button
          onClick={() => onViewDetails(report)}
          style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.85em'
          }}
        >
          View Details
        </button>
      </td>
    </tr>
  )
}

// Report Details Modal Component
const ReportDetails = ({ report, onClose, calculateTotalDoctors }) => {
  const totalDoctors = calculateTotalDoctors(report)

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
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ margin: '0', color: '#2c3e50' }}>Report Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5em',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          <DetailSection title="📅 Basic Information">
            <DetailItem label="Date" value={new Date(report.report_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <DetailItem label="Region" value={report.region} />
          </DetailSection>

          <DetailSection title="👨‍⚕️ Doctors Visited">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <DetailItem label="Dentists" value={report.dentists} />
              <DetailItem label="Physiotherapists" value={report.physiotherapists} />
              <DetailItem label="Gynecologists" value={report.gynecologists} />
              <DetailItem label="Internists" value={report.internists} />
              <DetailItem label="General Practitioners" value={report.general_practitioners} />
              <DetailItem label="Pediatricians" value={report.pediatricians} />
              <DetailItem label="Dermatologists" value={report.dermatologists} />
            </div>
            <div style={{ 
              background: '#e3f2fd', 
              padding: '10px 15px', 
              borderRadius: '5px', 
              marginTop: '10px',
              fontWeight: '600',
              color: '#1976d2'
            }}>
              Total Doctors: {totalDoctors}
            </div>
          </DetailSection>

          <DetailSection title="💊 Facilities Visited">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <DetailItem label="Pharmacies" value={report.pharmacies} />
              <DetailItem label="Dispensaries" value={report.dispensaries} />
            </div>
          </DetailSection>

          <DetailSection title="📦 Orders">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <DetailItem label="Number of Orders" value={report.orders_count} />
              <DetailItem label="Total Value" value={`RWF ${report.orders_value.toLocaleString()}`} />
            </div>
          </DetailSection>

          {report.summary && (
            <DetailSection title="📝 Daily Summary">
              <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #e9ecef'
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

// Reusable Components
const DetailSection = ({ title, children }) => (
  <div>
    <h3 style={{ 
      margin: '0 0 15px 0', 
      color: '#2c3e50', 
      fontSize: '1.2em',
      paddingBottom: '8px',
      borderBottom: '1px solid #e9ecef'
    }}>
      {title}
    </h3>
    {children}
  </div>
)

const DetailItem = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: '#6c757d', fontWeight: '500' }}>{label}:</span>
    <span style={{ color: '#2c3e50', fontWeight: '600' }}>{value}</span>
  </div>
)

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

export default ReportsHistory