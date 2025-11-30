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
      ...formData,
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
      orders_value: parseInt(formData.orders_value) || 0
    }

    try {
      const response = await reportsAPI.submitDaily(submitData)
      if (response.data.success) {
        setMessage({ type: 'success', text: '🎉 Report submitted successfully!' })
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
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to submit report. Please try again.' 
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
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', fontWeight: '300' }}>
          Daily Activity Report 📋
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em', opacity: '0.9' }}>
          Complete your daily reporting for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
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
        />
        <SummaryCard 
          value={(parseInt(formData.pharmacies) || 0) + (parseInt(formData.dispensaries) || 0)} 
          label="Pharmacies & Dispensaries" 
          color="#2ecc71"
          icon="💊"
        />
        <SummaryCard 
          value={parseInt(formData.orders_count) || 0} 
          label="Orders Received" 
          color="#e74c3c"
          icon="📦"
        />
        <SummaryCard 
          value={`RWF ${(parseInt(formData.orders_value) || 0).toLocaleString()}`} 
          label="Order Value" 
          color="#f39c12"
          icon="💰"
        />
      </div>

      {/* Main Form */}
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
      }}>
        {message && (
          <div style={{
            padding: '15px 20px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            borderRadius: '10px',
            marginBottom: '30px',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            fontSize: '1em'
          }}>
            {message.text}
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
                { name: 'dentists', label: 'Dentists 🦷', emoji: '🦷' },
                { name: 'physiotherapists', label: 'Physiotherapists 💪', emoji: '💪' },
                { name: 'gynecologists', label: 'Gynecologists 👩‍⚕️', emoji: '👩‍⚕️' },
                { name: 'internists', label: 'Internists 🫀', emoji: '🫀' },
                { name: 'general_practitioners', label: 'General Practitioners 🩺', emoji: '🩺' },
                { name: 'pediatricians', label: 'Pediatricians 👶', emoji: '👶' },
                { name: 'dermatologists', label: 'Dermatologists 🌟', emoji: '🌟' }
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
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1em', fontWeight: '600' }}>
                  Total Doctors Visited Today: {totalDoctors}
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
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1em', fontWeight: '600' }}>
                  Total Visits Today: {totalVisits} (Doctors: {totalDoctors}, Facilities: {totalVisits - totalDoctors})
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
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1em', fontWeight: '600' }}>
                  Order Summary: {parseInt(formData.orders_count) || 0} orders • RWF {(parseInt(formData.orders_value) || 0).toLocaleString()}
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
              color: '#666'
            }}>
              💡 <strong>Tips:</strong> Mention specific clinics/pharmacies, doctor names, product discussions, follow-up requirements, and any notable achievements or challenges.
            </div>
          </Section>

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
                minWidth: '200px'
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
              All information will be saved securely
            </div>
          </div>
        </form>
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
      borderBottom: '2px solid #f8f9fa'
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
      <span style={{ marginRight: '8px' }}>{emoji}</span>
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

const SummaryCard = ({ value, label, color, icon }) => (
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

export default DailyReport