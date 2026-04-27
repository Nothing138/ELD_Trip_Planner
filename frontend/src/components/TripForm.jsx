import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api'

function TripForm({ onTripCalculated, loading, setLoading }) {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '',
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (!formData.current_location.trim()) newErrors.current_location = 'Required'
    if (!formData.pickup_location.trim()) newErrors.pickup_location = 'Required'
    if (!formData.dropoff_location.trim()) newErrors.dropoff_location = 'Required'
    if (formData.current_cycle_used === '') newErrors.current_cycle_used = 'Required'
    if (parseFloat(formData.current_cycle_used) > 70) newErrors.current_cycle_used = 'Max 70 hours'
    if (parseFloat(formData.current_cycle_used) < 0) newErrors.current_cycle_used = 'Min 0 hours'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/calculate-trip/`, formData)
      onTripCalculated(res.data)
    } catch (err) {
      alert('Error calculating trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    {
      key: 'current_location',
      label: 'Current Location',
      placeholder: 'e.g. Chicago, IL',
      icon: '📍',
      color: '#2563eb',
    },
    {
      key: 'pickup_location',
      label: 'Pickup Location',
      placeholder: 'e.g. Indianapolis, IN',
      icon: '📦',
      color: '#7c3aed',
    },
    {
      key: 'dropoff_location',
      label: 'Dropoff Location',
      placeholder: 'e.g. Nashville, TN',
      icon: '🏁',
      color: '#dc2626',
    },
    {
      key: 'current_cycle_used',
      label: 'Current Cycle Used (Hrs)',
      placeholder: 'e.g. 24',
      icon: '⏱️',
      color: '#059669',
      type: 'number',
    },
  ]

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      border: '1px solid var(--gray-200)',
    }}>
      {/* Form Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
        padding: '24px',
      }}>
        <h2 style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: '700',
          marginBottom: '6px',
        }}>Plan Your Trip</h2>
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '13px',
        }}>Enter trip details to generate ELD logs</p>
      </div>

      {/* Form Body */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {fields.map((field) => (
          <div key={field.key}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--gray-700)',
              marginBottom: '8px',
            }}>
              <span>{field.icon}</span>
              {field.label}
            </label>
            <input
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={formData[field.key]}
              onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
              min={field.type === 'number' ? 0 : undefined}
              max={field.type === 'number' ? 70 : undefined}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${errors[field.key] ? '#ef4444' : 'var(--gray-200)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                color: 'var(--gray-800)',
                background: errors[field.key] ? '#fef2f2' : 'var(--gray-50)',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
              onFocus={e => {
                e.target.style.borderColor = field.color
                e.target.style.background = 'white'
                e.target.style.boxShadow = `0 0 0 3px ${field.color}20`
              }}
              onBlur={e => {
                e.target.style.borderColor = errors[field.key] ? '#ef4444' : 'var(--gray-200)'
                e.target.style.background = errors[field.key] ? '#fef2f2' : 'var(--gray-50)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors[field.key] && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '4px',
                fontWeight: '500',
              }}>⚠️ {errors[field.key]}</p>
            )}
          </div>
        ))}

        {/* HOS Info Box */}
        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
        }}>
          <p style={{
            fontSize: '12px',
            color: '#1d4ed8',
            fontWeight: '600',
            marginBottom: '6px',
          }}>📋 HOS Assumptions</p>
          <ul style={{
            fontSize: '11px',
            color: '#3b82f6',
            paddingLeft: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}>
            <li>Property-carrying driver</li>
            <li>70 hrs / 8-day cycle</li>
            <li>11-hr driving limit per day</li>
            <li>30-min break after 8 hrs driving</li>
            <li>Fuel stop every 1,000 miles</li>
            <li>1 hr for pickup & dropoff</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading
              ? 'var(--gray-300)'
              : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '15px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(37,99,235,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 6px 16px rgba(37,99,235,0.5)'
            }
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = loading ? 'none' : '0 4px 12px rgba(37,99,235,0.4)'
          }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
              Calculating...
            </>
          ) : (
            <>🚛 Calculate Trip & Generate ELD Logs</>
          )}
        </button>
      </div>
    </div>
  )
}

export default TripForm