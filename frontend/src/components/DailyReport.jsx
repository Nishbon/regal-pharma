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

    // Convert empty strings to 0 for numbers
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

    console.log('📤 Submitting report:', submitData)
    console.log('📤 API Endpoint: /reports/create')
    console.log('👤 User ID:', user?._id || user?.id)

    try {
      // CHANGE THIS: Use reportsAPI.create() instead of submitDaily()
      const response = await reportsAPI.create(submitData)
      console.log('✅ API Response:', response.data)
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: '🎉 Report submitted successfully! Refreshing dashboard...' 
        })
        
        // Reset form but keep region and date
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
            text: '✅ Report saved! Dashboard has been updated.' 
          })
        }, 1500)
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Failed to submit report.' 
        })
      }
    } catch (error) {
      console.error('❌ Submit error:', error)
      console.error('Error status:', error.response?.status)
      console.error('Error data:', error.response?.data)
      console.error('Error config:', error.config)
      
      let errorMessage = 'Failed to submit report. Please try again.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
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
          gap: '10px',
          alignItems: 'center'
        }}>
          <div style={{ 
            fontSize: '0.85em', 
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 12px',
            borderRadius: '12px'
          }}>
            {user?.region || 'All Regions'}
          </div>
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          Daily Activity Report 📋
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          Complete your daily reporting for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        {/* Debug Info */}
        <div style={{ 
          marginTop: '15px', 
          fontSize: '0.85em', 
          opacity: '0.8',
          background: 'rgba(255,255,255,0.1)',
          padding: '6px 12px',
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          📝 Submitting to: /reports/create
        </div>
      </div>

      {/* Progress Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <SummaryCard 
          value={totalDoctors} 
          label="Total Doctors" 
          color="#3498db"
          icon="👨‍⚕️"
          subtitle="Doctors visited today"
        />
        <SummaryCard 
          value={(parseInt(formData.pharmacies) || 0) + (parseInt(formData.dispensaries) || 0)} 
          label="Facilities Visited" 
          color="#2ecc71"
          icon="💊"
          subtitle="Pharmacies + Dispensaries"
        />
        <SummaryCard 
          value={parseInt(formData.orders_count) || 0} 
          label="Orders Received" 
          color="#e74c3c"
          icon="📦"
          subtitle="Total orders today"
        />
        <SummaryCard 
          value={`RWF ${(parseInt(formData.orders_value) || 0).toLocaleString()}`} 
          label="Order Value" 
          color="#f39c12"
          icon="💰"
          subtitle="Revenue generated"
        />
      </div>

      {/* Main Form */}
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {message && (
          <div style={{
            padding: '15px 20px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            borderRadius: '10px',
            marginBottom: '30px',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            fontSize: '1em',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{ fontSize: '1.2em' }}>
              {message.type === 'success' ? '✅' : '⚠️'}
            </div>
            <div style={{ flex: 1 }}>
              {message.text}
            </div>
            {message.type === 'error' && (
              <button 
                onClick={() => setMessage('')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2em',
                  cursor: 'pointer',
                  color: '#721c24'
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Section title="📅 Basic Information" description="Enter the basic details of your daily report">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <FormField
                label="Report Date"
                name="report_date"
                type="date"
                value={formData.report_date}
                onChange={handleChange}
                required
              />
              <FormField
                label="Region Worked"
                name="region"
                type="text"
                value={formData.region}
                onChange={handleChange}
                placeholder="Enter the region you worked in today"
                required
              />
            </div>
          </Section>

          {/* Doctors Visited */}
          <Section title="👨‍⚕️ Doctors Visited Today" description="Enter the number of each type of doctor you visited">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px' 
            }}>
              {[
                { name: 'dentists', label: 'Dentists', emoji: '🦷' },
                { name: 'physiotherapists', label: 'Physiotherapists', emoji: '💪' },
                { name: 'gynecologists', label: 'Gynecologists', emoji: '👩‍⚕️' },
                { name: 'internists', label: 'Internists', emoji: '🫀' },
                { name: 'general_practitioners', label: 'General Practitioners', emoji: '🩺' },
                { name: 'pediatricians', label: 'Pediatricians', emoji: '👶' },
                { name: 'dermatologists', label: 'Dermatologists', emoji: '🌟' }
              ].map(field => (
                <NumberField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleNumberChange}
                  emoji={field.emoji}
                />
              ))}
            </div>
            
            {totalDoctors > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                marginTop: '20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ fontSize: '1.2em', fontWeight: '600', marginBottom: '5px' }}>
                  Total Doctors Visited Today: {totalDoctors}
                </div>
                <div style={{ fontSize: '0.9em', opacity: '0.9' }}>
                  {totalDoctors} different doctors visited across all specialties
                </div>
              </div>
            )}
          </Section>

          {/* Facilities */}
          <Section title="💊 Pharmacies & Dispensaries" description="Enter the number of pharmacies and dispensaries visited">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <NumberField
                label="Pharmacies Visited"
                name="pharmacies"
                value={formData.pharmacies}
                onChange={handleNumberChange}
                emoji="🏥"
              />
              <NumberField
                label="Dispensaries Visited"
                name="dispensaries"
                value={formData.dispensaries}
                onChange={handleNumberChange}
                emoji="💊"
              />
            </div>
            
            {totalVisits > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                marginTop: '20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)'
              }}>
                <div style={{ fontSize: '1.2em', fontWeight: '600', marginBottom: '5px' }}>
                  Total Visits Today: {totalVisits}
                </div>
                <div style={{ fontSize: '0.9em', opacity: '0.9' }}>
                  {totalDoctors} doctors + {totalVisits - totalDoctors} facilities
                </div>
              </div>
            )}
          </Section>

          {/* Orders */}
          <Section title="📦 Orders Received" description="Enter order details received today">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <NumberField
                label="Number of Orders"
                name="orders_count"
                value={formData.orders_count}
                onChange={handleNumberChange}
                emoji="📦"
              />
              <NumberField
                label="Total Order Value (RWF)"
                name="orders_value"
                value={formData.orders_value}
                onChange={handleNumberChange}
                emoji="💰"
                step="1000"
              />
            </div>
            
            {(parseInt(formData.orders_count) > 0 || parseInt(formData.orders_value) > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                marginTop: '20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)'
              }}>
                <div style={{ fontSize: '1.2em', fontWeight: '600', marginBottom: '5px' }}>
                  Order Summary
                </div>
                <div style={{ fontSize: '0.95em', opacity: '0.9' }}>
                  {parseInt(formData.orders_count) || 0} orders • RWF {(parseInt(formData.orders_value) || 0).toLocaleString()}
                </div>
              </div>
            )}
          </Section>

          {/* Summary */}
          <Section title="📝 Daily Summary" description="Provide a brief summary of today's activities">
            <FormField
              label="Daily Summary"
              name="summary"
              type="textarea"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Brief summary of today's activities, names of clinics and pharmacies visited, important discussions with doctors, challenges faced, achievements..."
              rows={6}
            />
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '10px',
              fontSize: '0.9em',
              color: '#666',
              borderLeft: '3px solid #667eea'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ fontSize: '1.2em' }}>💡</div>
                <div>
                  <strong>Tips for a good summary:</strong>
                  <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                    <li>Mention specific clinics/pharmacies visited</li>
                    <li>Note important discussions with doctors</li>
                    <li>Document any follow-up requirements</li>
                    <li>Share achievements or challenges faced</li>
                    <li>Include product feedback received</li>
                  </ul>
                </div>
              </div>
            </div>
          </Section>

          {/* Form Validation Summary */}
          <div style={{
            background: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px',
            border: '1px solid #ffeaa7',
            color: '#856404',
            fontSize: '0.9em'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <div style={{ fontSize: '1.2em' }}>📋</div>
              <strong>Form Validation</strong>
            </div>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
              <li>Date and Region are required</li>
              <li>Doctor counts should be numbers (0 or more)</li>
              <li>Orders value should be in RWF</li>
              <li>Summary is optional but recommended</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div style={{ 
            marginTop: '40px', 
            paddingTop: '25px', 
            borderTop: '2px solid #f8f9fa',
            textAlign: 'center'
          }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '15px 40px',
                borderRadius: '50px',
                fontSize: '1.1em',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                minWidth: '200px',
                opacity: loading ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{ marginRight: '10px' }}>⏳</span>
                  Submitting Report...
                </>
              ) : (
                <>
                  <span style={{ marginRight: '10px' }}>🚀</span>
                  Submit Daily Report
                </>
              )}
            </button>
            
            <div style={{ 
              marginTop: '15px', 
              color: '#7f8c8d', 
              fontSize: '0.9em' 
            }}>
              📁 All information will be saved securely to your account
            </div>
          </div>
        </form>
      </div>

      {/* Footer Note */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '10px',
        fontSize: '0.9em',
        color: '#7f8c8d',
        textAlign: 'center',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '5px' }}>
          <span>ℹ️</span>
          <strong>Important:</strong>
        </div>
        <div>
          Submit your report at the end of each working day. All reports are timestamped and linked to your account.
        </div>
      </div>
    </div>
  )
}

// Reusable Components
const Section = ({ title, description, children }) => (
  <div style={{ marginBottom: '40px' }}>
    <h3 style={{ 
      margin: '0 0 10px 0', 
      color: '#2c3e50', 
      fontSize: '1.4em',
      paddingBottom: '10px',
      borderBottom: '2px solid #f8f9fa',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      {title}
    </h3>
    <p style={{ 
      margin: '0 0 25px 0', 
      color: '#7f8c8d',
      fontSize: '1em'
    }}>
      {description}
    </p>
    {children}
  </div>
)

const FormField = ({ label, name, type = 'text', value, onChange, placeholder, required, rows }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '600', 
      color: '#2c3e50',
      fontSize: '1em'
    }}>
      {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
    </label>
    {type === 'textarea' ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        style={{
          width: '100%',
          padding: '15px',
          border: '2px solid #e9ecef',
          borderRadius: '10px',
          fontSize: '1em',
          fontFamily: 'inherit',
          resize: 'vertical',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          minHeight: '120px'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#667eea';
          e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e9ecef';
          e.target.style.boxShadow = 'none';
        }}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '15px',
          border: '2px solid #e9ecef',
          borderRadius: '10px',
          fontSize: '1em',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#667eea';
          e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e9ecef';
          e.target.style.boxShadow = 'none';
        }}
      />
    )}
  </div>
)

const NumberField = ({ label, name, value, onChange, emoji, step }) => (
  <div style={{ marginBottom: '15px' }}>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '600', 
      color: '#2c3e50',
      fontSize: '0.95em'
    }}>
      <span style={{ marginRight: '8px', fontSize: '1.1em' }}>{emoji}</span>
      {label}
    </label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      min="0"
      step={step || "1"}
      style={{
        width: '100%',
        padding: '12px 15px',
        border: '2px solid #e9ecef',
        borderRadius: '8px',
        fontSize: '1em',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#667eea';
        e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#e9ecef';
        e.target.style.boxShadow = 'none';
      }}
    />
  </div>
)

const SummaryCard = ({ value, label, color, icon, subtitle }) => (
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
      boxShadow: '0 5px 20px rgba(0,0,0,0.12)'
    }
  }}>
    <div style={{ fontSize: '2em', marginBottom: '10px' }}>{icon}</div>
    <div style={{ 
      fontSize: '1.5em', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '5px'
    }}>
      {value}
    </div>
    <div style={{ color: '#2c3e50', fontSize: '0.95em', fontWeight: '500', marginBottom: '3px' }}>{label}</div>
    {subtitle && (
      <div style={{ color: '#7f8c8d', fontSize: '0.8em' }}>{subtitle}</div>
    )}
  </div>
)

export default DailyReport
