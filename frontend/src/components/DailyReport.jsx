import React, { useState } from 'react'
import { reportsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const DailyReport = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    region: user?.region || '',
    dentists: '',
    physiotherapists: '',
    gynecologists: '',
    internists: '',
    general_practitioners: '',
    pediatricians: '',
    dermatologists: '',
    pharmacies: '',
    dispensaries: '',
    orders_count: '',
    orders_value: '',
    summary: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNumberChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : Math.max(0, parseInt(value) || 0)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Prepare data exactly as the Mongoose model expects
    const submitData = {
      report_date: formData.report_date,
      region: formData.region || user?.region || 'Unknown',
      dentists: parseInt(formData.dentists) || 0,
      physiotherapists: parseInt(formData.physiotherapists) || 0,
      gynecologists: parseInt(formData.gynecologists) || 0,
      internists: parseInt(formData.internists) || 0,
      general_practitioners: parseInt(formData.general_practitioners) || 0,
      pediatricians: parseInt(formData.pediatricians) || 0,
      dermatologists: parseInt(formData.dermatologists) || 0,
      pharmacies: parseInt(formData.pharmacies) || 0,
      dispensaries: parseInt(formData.dispensaries) || 0,
      orders_count: parseInt(formData.orders_count) || 0,
      orders_value: parseInt(formData.orders_value) || 0,
      summary: formData.summary || ''
    }

    console.log('Submitting report:', submitData)
    console.log('User ID:', user?._id || user?.id)

    try {
      const response = await reportsAPI.create(submitData)
      console.log('API Response:', response.data)
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Report submitted successfully!' 
        })
        
        // Reset form
        setFormData({
          report_date: new Date().toISOString().split('T')[0],
          region: user?.region || '',
          dentists: '',
          physiotherapists: '',
          gynecologists: '',
          internists: '',
          general_practitioners: '',
          pediatricians: '',
          dermatologists: '',
          pharmacies: '',
          dispensaries: '',
          orders_count: '',
          orders_value: '',
          summary: ''
        })
        
        // Trigger dashboard refresh
        setTimeout(() => {
          const event = new CustomEvent('reportSubmitted')
          window.dispatchEvent(event)
          setMessage({ 
            type: 'success', 
            text: 'Report saved successfully. Dashboard updated.' 
          })
        }, 1500)
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Failed to submit report.' 
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
      console.error('Error status:', error.response?.status)
      console.error('Error data:', error.response?.data)
      
      let errorMessage = 'Failed to submit report. Please try again.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(', ')
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.'
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid data. Please check all fields.'
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      })
    }
    setLoading(false)
  }

  const totalDoctors = (
    (parseInt(formData.dentists) || 0) +
    (parseInt(formData.physiotherapists) || 0) +
    (parseInt(formData.gynecologists) || 0) +
    (parseInt(formData.internists) || 0) +
    (parseInt(formData.general_practitioners) || 0) +
    (parseInt(formData.pediatricians) || 0) +
    (parseInt(formData.dermatologists) || 0)
  )

  const totalVisits = totalDoctors + (parseInt(formData.pharmacies) || 0) + (parseInt(formData.dispensaries) || 0)

  return (
    <div className="daily-report-container">
      {/* Header */}
      <div className="report-header">
        <div className="header-content">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12H15M9 16H15M9 8H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1>Daily Activity Report</h1>
            <p className="header-subtitle">
              Complete your daily reporting for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            {user?.region && (
              <div className="region-badge">
                <span className="badge-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 11C13.1046 11 14 10.1046 14 9C14 7.89543 13.1046 7 12 7C10.8954 7 10 7.89543 10 9C10 10.1046 10.8954 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span>Region: {user.region}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="stats-grid">
        <SummaryCard 
          value={totalDoctors} 
          label="Total Doctors"
          icon="👨‍⚕️"
          color="#3b82f6"
        />
        <SummaryCard 
          value={(parseInt(formData.pharmacies) || 0) + (parseInt(formData.dispensaries) || 0)} 
          label="Facilities Visited"
          icon="🏢"
          color="#10b981"
        />
        <SummaryCard 
          value={parseInt(formData.orders_count) || 0} 
          label="Orders Received"
          icon="📦"
          color="#f59e0b"
        />
        <SummaryCard 
          value={`RWF ${(parseInt(formData.orders_value) || 0).toLocaleString()}`} 
          label="Order Value"
          icon="💰"
          color="#8b5cf6"
        />
      </div>

      {/* Main Form */}
      <div className="form-card">
        {message && (
          <div className={`message-alert ${message.type}`}>
            <div className="message-icon">
              {message.type === 'success' ? '✓' : '✗'}
            </div>
            <div className="message-text">{message.text}</div>
            {message.type === 'error' && (
              <button 
                onClick={() => setMessage('')}
                className="message-close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Section title="Basic Information" icon="📅">
            <div className="form-row">
              <FormField
                label="Report Date"
                name="report_date"
                type="date"
                value={formData.report_date}
                onChange={handleChange}
                icon="📅"
              />
              <FormField
                label="Region"
                name="region"
                type="text"
                value={formData.region}
                onChange={handleChange}
                placeholder="Enter region (optional)"
                icon="📍"
              />
            </div>
          </Section>

          {/* Doctors Visited */}
          <Section title="Doctors Visited" icon="👨‍⚕️">
            <div className="doctors-grid">
              {[
                { name: 'dentists', label: 'Dentists', icon: '🦷' },
                { name: 'physiotherapists', label: 'Physiotherapists', icon: '💪' },
                { name: 'gynecologists', label: 'Gynecologists', icon: '👩' },
                { name: 'internists', label: 'Internists', icon: '❤️' },
                { name: 'general_practitioners', label: 'General Practitioners', icon: '🩺' },
                { name: 'pediatricians', label: 'Pediatricians', icon: '👶' },
                { name: 'dermatologists', label: 'Dermatologists', icon: '🔬' }
              ].map(field => (
                <NumberField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleNumberChange}
                  icon={field.icon}
                />
              ))}
            </div>
            
            {totalDoctors > 0 && (
              <div className="total-summary">
                <div className="summary-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 17H15M9 13H15M9 9H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="summary-title">Total Doctors Visited</div>
                  <div className="summary-value">{totalDoctors}</div>
                </div>
              </div>
            )}
          </Section>

          {/* Facilities */}
          <Section title="Facilities Visited" icon="🏢">
            <div className="form-row">
              <NumberField
                label="Pharmacies"
                name="pharmacies"
                value={formData.pharmacies}
                onChange={handleNumberChange}
                icon="💊"
              />
              <NumberField
                label="Dispensaries"
                name="dispensaries"
                value={formData.dispensaries}
                onChange={handleNumberChange}
                icon="🏥"
              />
            </div>
            
            {totalVisits > 0 && (
              <div className="total-summary secondary">
                <div className="summary-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L21 21M19 21H14M5 21L3 21M5 21H10M9 6.5H15M9 10.5H15M12 14.5V21M12 14.5H14M12 14.5H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="summary-title">Total Visits</div>
                  <div className="summary-value">
                    {totalVisits} <span className="summary-detail">(Doctors: {totalDoctors}, Facilities: {totalVisits - totalDoctors})</span>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Orders */}
          <Section title="Orders Received" icon="📦">
            <div className="form-row">
              <NumberField
                label="Number of Orders"
                name="orders_count"
                value={formData.orders_count}
                onChange={handleNumberChange}
                icon="📊"
              />
              <NumberField
                label="Total Order Value (RWF)"
                name="orders_value"
                value={formData.orders_value}
                onChange={handleNumberChange}
                step="1000"
                icon="💰"
              />
            </div>
            
            {(parseInt(formData.orders_count) > 0 || parseInt(formData.orders_value) > 0) && (
              <div className="total-summary tertiary">
                <div className="summary-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="summary-title">Order Summary</div>
                  <div className="summary-value">
                    {parseInt(formData.orders_count) || 0} orders • RWF {(parseInt(formData.orders_value) || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Summary */}
          <Section title="Daily Summary" icon="📝">
            <FormField
              label="Summary"
              name="summary"
              type="textarea"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Enter summary of today's activities (optional)"
              rows={5}
              icon="✏️"
            />
            <div className="guidelines-box">
              <div className="guidelines-title">
                <span className="guidelines-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Guidelines
              </div>
              <ul className="guidelines-list">
                <li>Include specific clinics/pharmacies visited</li>
                <li>Note important discussions or feedback</li>
                <li>Document follow-up requirements</li>
                <li>Mention any challenges or achievements</li>
              </ul>
            </div>
          </Section>

          {/* Submit Button */}
          <div className="submit-section">
            <button 
              type="submit" 
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="submit-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Submit Report
                </>
              )}
            </button>
            
            <div className="submit-note">
              <span className="lock-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              All data is saved securely
            </div>
          </div>
        </form>
      </div>

      {/* Footer Note */}
      <div className="footer-note">
        <div className="note-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="note-title">Important Note</div>
          <div className="note-text">
            Submit your report at the end of each working day. All reports are timestamped and linked to your account.
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable Components
const Section = ({ title, children, icon }) => (
  <div className="form-section">
    <div className="section-header">
      <span className="section-icon">{icon}</span>
      <h3>{title}</h3>
    </div>
    {children}
  </div>
)

const FormField = ({ label, name, type = 'text', value, onChange, placeholder, rows, icon }) => (
  <div className="form-field">
    <label className="field-label">
      {icon && <span className="field-icon">{icon}</span>}
      {label}
    </label>
    {type === 'textarea' ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="form-textarea"
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-input"
      />
    )}
  </div>
)

const NumberField = ({ label, name, value, onChange, step, icon }) => (
  <div className="number-field">
    <label className="field-label">
      {icon && <span className="field-icon">{icon}</span>}
      {label}
    </label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      min="0"
      step={step || "1"}
      className="form-input"
    />
  </div>
)

const SummaryCard = ({ value, label, icon, color }) => (
  <div className="stat-card" style={{ borderColor: color }}>
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
.daily-report-container {
  padding: 30px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.report-header {
  background: #ffffff;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.header-icon {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.report-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.header-subtitle {
  margin: 0 0 15px 0;
  font-size: 15px;
  color: #64748b;
  font-weight: 400;
}

.region-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: #475569;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.badge-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border-top: 3px solid;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* Form Card */
.form-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  max-width: 1000px;
  margin: 0 auto;
  border: 1px solid #e2e8f0;
}

/* Message Alert */
.message-alert {
  padding: 16px 20px;
  border-radius: 10px;
  margin-bottom: 30px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-alert.success {
  background: #f0fdf4;
  color: #065f46;
  border: 1px solid #bbf7d0;
}

.message-alert.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.message-icon {
  font-size: 18px;
  font-weight: bold;
}

.message-alert.success .message-icon {
  color: #10b981;
}

.message-alert.error .message-icon {
  color: #ef4444;
}

.message-text {
  flex: 1;
}

.message-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.message-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

/* Form Sections */
.form-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.section-icon {
  font-size: 20px;
  background: #f1f5f9;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

/* Form Layout */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.doctors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

/* Form Fields */
.form-field, .number-field {
  margin-bottom: 20px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #475569;
  font-size: 14px;
}

.field-icon {
  font-size: 16px;
  opacity: 0.8;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  background: #f8fafc;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

/* Total Summary */
.total-summary {
  background: #f8fafc;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.total-summary.secondary {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.total-summary.tertiary {
  background: #fef2f2;
  border-color: #fecaca;
}

.summary-icon {
  font-size: 24px;
  background: white;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-title {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.summary-detail {
  font-size: 14px;
  color: #64748b;
  font-weight: 400;
  margin-left: 8px;
}

/* Guidelines */
.guidelines-box {
  background: #f8fafc;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
  border: 1px solid #e2e8f0;
}

.guidelines-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.guidelines-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.guidelines-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  line-height: 1.6;
  color: #4b5563;
  font-size: 14px;
}

.guidelines-list li {
  margin-bottom: 6px;
}

.guidelines-list li:last-child {
  margin-bottom: 0;
}

/* Submit Section */
.submit-section {
  margin-top: 40px;
  padding-top: 25px;
  border-top: 2px solid #f3f4f6;
  text-align: center;
}

.submit-button {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 16px 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  justify-content: center;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.submit-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
}

.submit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.submit-note {
  margin-top: 12px;
  color: #6b7280;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.lock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

/* Footer Note */
.footer-note {
  margin-top: 30px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  font-size: 14px;
  color: #6b7280;
  max-width: 800px;
  margin: 30px auto 0;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.note-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  flex-shrink: 0;
}

.note-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #374151;
  font-size: 15px;
}

.note-text {
  line-height: 1.5;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default DailyReport
