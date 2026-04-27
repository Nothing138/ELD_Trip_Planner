import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api'

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

  // Load Leaflet CSS + JS once
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
      script.onload = () => {
        leafletReadyRef.current = true
        initMap()
      }
      document.head.appendChild(script)
    } else {
      leafletReadyRef.current = true
      initMap()
    }
  }, [])

  // Update markers whenever locations change
  useEffect(() => {
    if (!leafletReadyRef.current || !window.L) return
    if (!mapInstanceRef.current) initMap()

    const map = mapInstanceRef.current
    if (!map) return

    const L = window.L

    /*const updateMarkers = async () => {
      // Remove old markers and polyline
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }

      const colors = { current: '#2563eb', pickup: '#7c3aed', dropoff: '#dc2626' }
      const emojis = { current: '🚛', pickup: '📦', dropoff: '🏁' }
      const labels = { current: 'Start', pickup: 'Pickup', dropoff: 'Dropoff' }

      const coords = []

      for (const [key, loc] of Object.entries(locations)) {
        if (!loc || loc.length < 3) continue
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat)
            const lng = parseFloat(data[0].lon)
            coords.push([lat, lng])

            const icon = L.divIcon({
              html: `<div style="
                width:32px;height:32px;
                background:${colors[key]};
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                border:2px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
              "><span style="
                transform:rotate(45deg);
                font-size:13px;
                display:block;
                text-align:center;
                line-height:28px;
              ">${emojis[key]}</span></div>`,
              className: '',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32],
            })

            const marker = L.marker([lat, lng], { icon })
              .addTo(map)
              .bindPopup(`<b>${labels[key]}</b><br>${loc}`)
            markersRef.current.push(marker)
          }
        } catch (e) {
          console.error('Geocoding error:', e)
        }
      }

      if (coords.length >= 2) {
        polylineRef.current = L.polyline(coords, {
          color: '#2563eb',
          weight: 3,
          opacity: 0.7,
          dashArray: '6, 4',
        }).addTo(map)
      }

      if (coords.length === 1) {
        map.setView(coords[0], 8)
      } else if (coords.length > 1) {
        map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] })
      }
    }*/
  const updateMarkers = async () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }
      map.setView([39.5, -98.35], 3)
    }

    updateMarkers()
  }, [locations])

  return (
    <div style={{
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      border: '1px solid var(--gray-200)',
      height: '220px',
    }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
    </div>
  )
}

function TripForm({ onTripCalculated, loading, setLoading }) {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '',
  })
  const [errors, setErrors] = useState({})
  const [gpsLoading, setGpsLoading] = useState(false)
  const [mapLocations, setMapLocations] = useState({})
  const debounceRef = useRef({})
  const geocacheRef = useRef({})

  // Update map when locations change (debounced)
  const updateMapLocation = (key, value) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(() => {
      if (value && value.length > 3) {
        setMapLocations(prev => ({ ...prev, [key]: value }))
      } else {
        // Clear the pin if input is cleared
        setMapLocations(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    }, 500)
  }

  // Get GPS location
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
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
          const locationStr = city && state
            ? `${city}, ${state}`
            : data.display_name?.split(',').slice(0, 2).join(',')
          setFormData(prev => ({ ...prev, current_location: locationStr }))
          setMapLocations(prev => ({ ...prev, current: locationStr }))
        } catch (e) {
          alert('Could not get location name. Please enter manually.')
        } finally {
          setGpsLoading(false)
        }
      },
      () => {
        setGpsLoading(false)
        alert('Could not get your location. Please enter manually.')
      },
      { timeout: 10000 }
    )
  }

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

  const inputBase = (hasError) => ({
    width: '100%',
    padding: '12px 16px',
    border: `2px solid ${hasError ? '#ef4444' : 'var(--gray-200)'}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    color: 'var(--gray-800)',
    background: hasError ? '#fef2f2' : 'var(--gray-50)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  })

  const handleFocus = (e, color) => {
    e.target.style.borderColor = color
    e.target.style.background = 'white'
    e.target.style.boxShadow = `0 0 0 3px ${color}20`
  }

  const handleBlur = (e, hasError) => {
    e.target.style.borderColor = hasError ? '#ef4444' : 'var(--gray-200)'
    e.target.style.background = hasError ? '#fef2f2' : 'var(--gray-50)'
    e.target.style.boxShadow = 'none'
  }

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
        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
          Plan Your Trip
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
          Enter trip details to generate ELD logs
        </p>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Mini Map Preview */}
        <div>
          <div style={{
            fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)',
            marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            🗺️ Live Route Preview
          </div>
          <MiniMap locations={mapLocations} />
          <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '6px', textAlign: 'center' }}>
            Pins update as you type locations
          </p>
        </div>

        {/* ✅ FIX: Current Location — correct onChange handler */}
        <div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px',
          }}>📍 Current Location</label>
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
                fontSize: '18px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
                boxShadow: gpsLoading ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {gpsLoading ? (
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
              ) : '📡'}
            </button>
          </div>
          {errors.current_location && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
              ⚠️ {errors.current_location}
            </p>
          )}
        </div>

        {/* Pickup Location */}
        <div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px',
          }}>📦 Pickup Location</label>
          <input
            type="text"
            placeholder="e.g. Indianapolis, IN"
            value={formData.pickup_location}
            onChange={e => {
              const val = e.target.value
              setFormData(prev => ({ ...prev, pickup_location: val }))
              updateMapLocation('pickup', val)
            }}
            style={inputBase(errors.pickup_location)}
            onFocus={e => handleFocus(e, '#7c3aed')}
            onBlur={e => handleBlur(e, !!errors.pickup_location)}
          />
          {errors.pickup_location && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
              ⚠️ {errors.pickup_location}
            </p>
          )}
        </div>

        {/* Dropoff Location */}
        <div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px',
          }}>🏁 Dropoff Location</label>
          <input
            type="text"
            placeholder="e.g. Nashville, TN"
            value={formData.dropoff_location}
            onChange={e => {
              const val = e.target.value
              setFormData(prev => ({ ...prev, dropoff_location: val }))
              updateMapLocation('dropoff', val)
            }}
            style={inputBase(errors.dropoff_location)}
            onFocus={e => handleFocus(e, '#dc2626')}
            onBlur={e => handleBlur(e, !!errors.dropoff_location)}
          />
          {errors.dropoff_location && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
              ⚠️ {errors.dropoff_location}
            </p>
          )}
        </div>

        {/* Cycle Hours */}
        <div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px',
          }}>⏱️ Current Cycle Used (Hrs)</label>
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
          {errors.current_cycle_used && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
              ⚠️ {errors.current_cycle_used}
            </p>
          )}
        </div>

        {/* HOS Info Box */}
        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
        }}>
          <p style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '600', marginBottom: '6px' }}>
            📋 HOS Assumptions
          </p>
          <ul style={{
            fontSize: '11px', color: '#3b82f6', paddingLeft: '16px',
            display: 'flex', flexDirection: 'column', gap: '3px', margin: 0,
          }}>
            <li>Property-carrying driver</li>
            <li>70 hrs / 8-day cycle</li>
            <li>11-hr driving limit per day</li>
            <li>30-min break after 8 hrs driving</li>
            <li>Fuel stop every 1,000 miles</li>
            <li>1 hr for pickup &amp; dropoff</li>
          </ul>
        </div>

        {/* Submit Button */}
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
          {loading ? (
            <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>Calculating...</>
          ) : (
            <>🚛 Calculate Trip &amp; Generate ELD Logs</>
          )}
        </button>
      </div>
    </div>
  )
}

export default TripForm