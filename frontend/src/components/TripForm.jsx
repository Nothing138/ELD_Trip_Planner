import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = 'https://eld-trip-planner-w6mx.onrender.com/api'

function MiniMap({ locations }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const leafletReadyRef = useRef(false)

  const initMap = () => {
    if (!mapRef.current || !window.L) return
    const L = window.L
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current)
      mapInstanceRef.current.setView([39.5, -98.35], 4)
    }
  }

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!window.L) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => { leafletReadyRef.current = true; initMap() }
      document.head.appendChild(script)
    } else {
      leafletReadyRef.current = true
      initMap()
    }
  }, [])

  useEffect(() => {
    if (!leafletReadyRef.current || !window.L) return
    if (!mapInstanceRef.current) initMap()
    const map = mapInstanceRef.current
    if (!map) return
    const updateMarkers = async () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null }
      map.setView([39.5, -98.35], 3)
    }
    updateMarkers()
  }, [locations])

  return (
    <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--gray-200)', height: '220px' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
    </div>
  )
}

const inputBase = (hasError) => ({
  width: '100%',
  padding: '11px 14px',
  border: `1.5px solid ${hasError ? '#ef4444' : 'var(--gray-200)'}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  color: 'var(--gray-800)',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
})

function TripForm({ onTripCalculated, loading, setLoading }) {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    driver_name: '',
    trip_date: today,
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '',
  })
  const [errors, setErrors] = useState({})
  const [gpsLoading, setGpsLoading] = useState(false)
  const [mapLocations, setMapLocations] = useState({})
  const debounceRef = useRef({})

  const updateMapLocation = (key, value) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(() => {
      if (value && value.length > 3) {
        setMapLocations(prev => ({ ...prev, [key]: value }))
      } else {
        setMapLocations(prev => { const next = { ...prev }; delete next[key]; return next })
      }
    }, 500)
  }

  const getGPSLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || ''
          const state = data.address?.state || ''
          const locationStr = city && state ? `${city}, ${state}` : data.display_name?.split(',').slice(0, 2).join(',')
          setFormData(prev => ({ ...prev, current_location: locationStr }))
          setMapLocations(prev => ({ ...prev, current: locationStr }))
        } catch (e) { console.error(e) }
        setGpsLoading(false)
      },
      (err) => { console.error(err); setGpsLoading(false) }
    )
  }

  const validate = () => {
    const errs = {}
    if (!formData.driver_name.trim()) errs.driver_name = 'Driver name is required'
    if (!formData.trip_date) errs.trip_date = 'Date is required'
    if (!formData.current_location.trim()) errs.current_location = 'Current location is required'
    if (!formData.pickup_location.trim()) errs.pickup_location = 'Pickup location is required'
    if (!formData.dropoff_location.trim()) errs.dropoff_location = 'Dropoff location is required'
    const cycle = parseFloat(formData.current_cycle_used)
    if (formData.current_cycle_used === '' || isNaN(cycle) || cycle < 0 || cycle > 70)
      errs.current_cycle_used = 'Enter hours 0–70'
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/calculate-trip/`, {
        driver_name: formData.driver_name.trim(),
        trip_date: formData.trip_date,
        current_location: formData.current_location,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        current_cycle_used: parseFloat(formData.current_cycle_used),
      })
      onTripCalculated(res.data)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Failed to calculate trip. Please try again.')
    }
    setLoading(false)
  }

  const handleFocus = (e, color) => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${color}20` }
  const handleBlur = (e, hasError) => { e.target.style.borderColor = hasError ? '#ef4444' : 'var(--gray-200)'; e.target.style.boxShadow = 'none' }

  const field = (key, label, placeholder, type = 'text', opts = {}) => (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={formData[key]}
        onChange={e => {
          const val = e.target.value
          setFormData(prev => ({ ...prev, [key]: val }))
          if (opts.mapKey) updateMapLocation(opts.mapKey, val)
        }}
        style={inputBase(errors[key])}
        onFocus={e => handleFocus(e, opts.color || '#2563eb')}
        onBlur={e => handleBlur(e, !!errors[key])}
        {...(opts.min !== undefined ? { min: opts.min } : {})}
        {...(opts.max !== undefined ? { max: opts.max } : {})}
      />
      {errors[key] && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors[key]}</p>}
    </div>
  )

  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '24px' }}>
        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Plan Your Trip</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Enter trip details to generate ELD logs</p>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Live Map Preview */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>🗺️ Live Route Preview</div>
          <MiniMap locations={mapLocations} />
          <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '6px', textAlign: 'center' }}>Pins update as you type locations</p>
        </div>

        {/* ── Driver Info Section ── */}
        <div style={{ padding: '16px', background: '#f8faff', borderRadius: 'var(--radius-sm)', border: '1px solid #dbeafe' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
            👤 Driver Information
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Driver Name */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
                🪪 Driver Name
              </label>
              <input
                type="text"
                placeholder="e.g. John D. Smith"
                value={formData.driver_name}
                onChange={e => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                style={inputBase(errors.driver_name)}
                onFocus={e => handleFocus(e, '#2563eb')}
                onBlur={e => handleBlur(e, !!errors.driver_name)}
              />
              {errors.driver_name && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors.driver_name}</p>}
            </div>

            {/* Trip Date */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
                📅 Trip Start Date
              </label>
              <input
                type="date"
                value={formData.trip_date}
                onChange={e => setFormData(prev => ({ ...prev, trip_date: e.target.value }))}
                style={inputBase(errors.trip_date)}
                onFocus={e => handleFocus(e, '#2563eb')}
                onBlur={e => handleBlur(e, !!errors.trip_date)}
              />
              {errors.trip_date && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors.trip_date}</p>}
            </div>

          </div>
        </div>

        {/* Current Location */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
            📍 Current Location
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. Chicago, IL"
              value={formData.current_location}
              onChange={e => {
                const val = e.target.value
                setFormData(prev => ({ ...prev, current_location: val }))
                updateMapLocation('current', val)
              }}
              style={{ ...inputBase(errors.current_location), flex: 1, width: 'auto' }}
              onFocus={e => handleFocus(e, '#2563eb')}
              onBlur={e => handleBlur(e, !!errors.current_location)}
            />
            <button
              onClick={getGPSLocation}
              disabled={gpsLoading}
              title="Use my current location"
              style={{
                padding: '12px 14px',
                background: gpsLoading ? 'var(--gray-200)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: gpsLoading ? 'not-allowed' : 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: gpsLoading ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
              }}
            >
              {gpsLoading ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : '📡'}
            </button>
          </div>
          {errors.current_location && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors.current_location}</p>}
        </div>

        {/* Pickup Location */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>📦 Pickup Location</label>
          <input
            type="text"
            placeholder="e.g. Indianapolis, IN"
            value={formData.pickup_location}
            onChange={e => { const val = e.target.value; setFormData(prev => ({ ...prev, pickup_location: val })); updateMapLocation('pickup', val) }}
            style={inputBase(errors.pickup_location)}
            onFocus={e => handleFocus(e, '#7c3aed')}
            onBlur={e => handleBlur(e, !!errors.pickup_location)}
          />
          {errors.pickup_location && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors.pickup_location}</p>}
        </div>

        {/* Dropoff Location */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>🏁 Dropoff Location</label>
          <input
            type="text"
            placeholder="e.g. Nashville, TN"
            value={formData.dropoff_location}
            onChange={e => { const val = e.target.value; setFormData(prev => ({ ...prev, dropoff_location: val })); updateMapLocation('dropoff', val) }}
            style={inputBase(errors.dropoff_location)}
            onFocus={e => handleFocus(e, '#dc2626')}
            onBlur={e => handleBlur(e, !!errors.dropoff_location)}
          />
          {errors.dropoff_location && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors.dropoff_location}</p>}
        </div>

        {/* Cycle Hours */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>⏱️ Current Cycle Used (Hrs)</label>
          <input
            type="number"
            placeholder="e.g. 24"
            value={formData.current_cycle_used}
            onChange={e => setFormData(prev => ({ ...prev, current_cycle_used: e.target.value }))}
            min={0} max={70}
            style={inputBase(errors.current_cycle_used)}
            onFocus={e => handleFocus(e, '#059669')}
            onBlur={e => handleBlur(e, !!errors.current_cycle_used)}
          />
          {errors.current_cycle_used && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>⚠️ {errors.current_cycle_used}</p>}
        </div>

        {/* HOS Info */}
        <div style={{ background: 'var(--primary-light)', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <p style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '600', marginBottom: '6px' }}>📋 HOS Assumptions</p>
          <ul style={{ fontSize: '11px', color: '#3b82f6', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px', margin: 0 }}>
            <li>Property-carrying driver</li>
            <li>70 hrs / 8-day cycle</li>
            <li>11-hr driving limit per day</li>
            <li>30-min break after 8 hrs driving</li>
            <li>Fuel stop every 1,000 miles</li>
            <li>1 hr for pickup &amp; dropoff</li>
          </ul>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
            fontSize: '15px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(37,99,235,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.5)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 12px rgba(37,99,235,0.4)' }}
        >
          {loading
            ? <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>Calculating...</>
            : <>🚛 Calculate Trip &amp; Generate ELD Logs</>
          }
        </button>
      </div>
    </div>
  )
}

export default TripForm