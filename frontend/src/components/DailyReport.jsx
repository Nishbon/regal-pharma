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
      region: formData.region || user?.region || '',
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
    console.log('API Endpoint: /reports/create')
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
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>
          Daily Activity Report
        </h1>
        <p style={{ margin: '0', fontSize: '16px', opacity: '0.9' }}>
          Complete your daily reporting for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        {user?.region && (
          <div style={{ 
            marginTop: '15px', 
            fontSize: '14px', 
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            Region: {user.region}
          </div>
        )}
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
          color="#2563eb"
        />
        <SummaryCard 
          value={(parseInt(formData.pharmacies) || 0) + (parseInt(formData.dispensaries) || 0)} 
          label="Facilities Visited"
          color="#10b981"
        />
        <SummaryCard 
          value={parseInt(formData.orders_count) || 0} 
          label="Orders Received"
          color="#ef4444"
        />
        <SummaryCard 
          value={`RWF ${(parseInt(formData.orders_value) || 0).toLocaleString()}`} 
          label="Order Value"
          color="#f59e0b"
        />
      </div>

      {/* Main Form */}
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        maxWidth: '1000px',
        margin: '0 auto',
        border: '1px solid #e5e7eb'
      }}>
        {message && (
          <div style={{
            padding: '15px 20px',
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            borderRadius: '8px',
            marginBottom: '30px',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: message.type === 'success' ? '#10b981' : '#ef4444'
            }}>
              {message.type === 'success' ? '✓' : '✗'}
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
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#991b1b',
                  opacity: '0.7',
                  ':hover': { opacity: '1' }
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Section title="Basic Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <FormField
                label="Report Date"
                name="report_date"
                type="date"
                value={formData.report_date}
                onChange={handleChange}
              />
              <FormField
                label="Region"
                name="region"
                type="text"
                value={formData.region}
                onChange={handleChange}
                placeholder="Enter region (optional)"
              />
            </div>
          </Section>

          {/* Doctors Visited */}
          <Section title="Doctors Visited">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '20px' 
            }}>
              {[
                { name: 'dentists', label: 'Dentists' },
                { name: 'physiotherapists', label: 'Physiotherapists' },
                { name: 'gynecologists', label: 'Gynecologists' },
                { name: 'internists', label: 'Internists' },
                { name: 'general_practitioners', label: 'General Practitioners' },
                { name: 'pediatricians', label: 'Pediatricians' },
                { name: 'dermatologists', label: 'Dermatologists' }
              ].map(field => (
                <NumberField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleNumberChange}
                />
              ))}
            </div>
            
            {totalDoctors > 0 && (
              <div style={{
                background: '#f0f9ff',
                padding: '15px 20px',
                borderRadius: '8px',
                marginTop: '20px',
                border: '1px solid #e0f2fe'
              }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0369a1', marginBottom: '5px' }}>
                  Total Doctors Visited: {totalDoctors}
                </div>
              </div>
            )}
          </Section>

          {/* Facilities */}
          <Section title="Facilities Visited">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <NumberField
                label="Pharmacies"
                name="pharmacies"
                value={formData.pharmacies}
                onChange={handleNumberChange}
              />
              <NumberField
                label="Dispensaries"
                name="dispensaries"
                value={formData.dispensaries}
                onChange={handleNumberChange}
              />
            </div>
            
            {totalVisits > 0 && (
              <div style={{
                background: '#f0fdf4',
                padding: '15px 20px',
                borderRadius: '8px',
                marginTop: '20px',
                border: '1px solid #dcfce7'
              }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#15803d', marginBottom: '5px' }}>
                  Total Visits: {totalVisits} (Doctors: {totalDoctors}, Facilities: {totalVisits - totalDoctors})
                </div>
              </div>
            )}
          </Section>

          {/* Orders */}
          <Section title="Orders Received">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <NumberField
                label="Number of Orders"
                name="orders_count"
                value={formData.orders_count}
                onChange={handleNumberChange}
              />
              <NumberField
                label="Total Order Value (RWF)"
                name="orders_value"
                value={formData.orders_value}
                onChange={handleNumberChange}
                step="1000"
              />
            </div>
            
            {(parseInt(formData.orders_count) > 0 || parseInt(formData.orders_value) > 0) && (
              <div style={{
                background: '#fef2f2',
                padding: '15px 20px',
                borderRadius: '8px',
                marginTop: '20px',
                border: '1px solid #fecaca'
              }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#b91c1c', marginBottom: '5px' }}>
                  Orders: {parseInt(formData.orders_count) || 0} • Value: RWF {(parseInt(formData.orders_value) || 0).toLocaleString()}
                </div>
              </div>
            )}
          </Section>

          {/* Summary */}
          <Section title="Daily Summary">
            <FormField
              label="Summary"
              name="summary"
              type="textarea"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Enter summary of today's activities (optional)"
              rows={5}
            />
            <div style={{
              background: '#f8fafc',
              padding: '12px 15px',
              borderRadius: '6px',
              marginTop: '10px',
              fontSize: '14px',
              color: '#4b5563',
              borderLeft: '3px solid #e5e7eb'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Guidelines:</div>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.5' }}>
                <li>Include specific clinics/pharmacies visited</li>
                <li>Note important discussions or feedback</li>
                <li>Document follow-up requirements</li>
                <li>Mention any challenges or achievements</li>
              </ul>
            </div>
          </Section>

          {/* Submit Button */}
          <div style={{ 
            marginTop: '40px', 
            paddingTop: '25px', 
            borderTop: '2px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: loading ? '#d1d5db' : '#2563eb',
                color: 'white',
                border: 'none',
                padding: '14px 40px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                minWidth: '200px',
                ':hover': loading ? {} : {
                  background: '#1d4ed8',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
            
            <div style={{ 
              marginTop: '12px', 
              color: '#6b7280', 
              fontSize: '14px' 
            }}>
              All data is saved securely
            </div>
          </div>
        </form>
      </div>

      {/* Footer Note */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#f8fafc',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#6b7280',
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        maxWidth: '800px',
        margin: '30px auto 0'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '5px', color: '#374151' }}>
          Note:
        </div>
        <div>
          Submit your report at the end of each working day. All reports are timestamped and linked to your account.
        </div>
      </div>
    </div>
  )
}

// Reusable Components
const Section = ({ title, children }) => (
  <div style={{ marginBottom: '35px' }}>
    <h3 style={{ 
      margin: '0 0 15px 0', 
      color: '#111827', 
      fontSize: '18px',
      paddingBottom: '10px',
      borderBottom: '1px solid #e5e7eb',
      fontWeight: '600'
    }}>
      {title}
    </h3>
    {children}
  </div>
)

const FormField = ({ label, name, type = 'text', value, onChange, placeholder, rows }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '500', 
      color: '#374151',
      fontSize: '14px'
    }}>
      {label}
    </label>
    {type === 'textarea' ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          padding: '12px 15px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          resize: 'vertical',
          transition: 'border-color 0.2s ease',
          minHeight: '100px',
          ':focus': {
            outline: 'none',
            borderColor: '#2563eb',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
          }
        }}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 15px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          transition: 'border-color 0.2s ease',
          ':focus': {
            outline: 'none',
            borderColor: '#2563eb',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
          }
        }}
      />
    )}
  </div>
)

const NumberField = ({ label, name, value, onChange, step }) => (
  <div style={{ marginBottom: '15px' }}>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '500', 
      color: '#374151',
      fontSize: '14px'
    }}>
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
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        transition: 'border-color 0.2s ease',
        ':focus': {
          outline: 'none',
          borderColor: '#2563eb',
          boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
        }
      }}
    />
  </div>
)

const SummaryCard = ({ value, label, color }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    textAlign: 'center',
    borderTop: `3px solid ${color}`,
    transition: 'box-shadow 0.2s ease',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }
  }}>
    <div style={{ 
      fontSize: '24px', 
      fontWeight: 'bold', 
      color: color,
      marginBottom: '8px'
    }}>
      {value}
    </div>
    <div style={{ color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>{label}</div>
  </div>
)

export default DailyReport
