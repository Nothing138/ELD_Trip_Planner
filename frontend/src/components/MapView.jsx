import { useEffect, useRef, useState } from 'react'

function MapView({ tripData }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [mapError, setMapError] = useState(false)

  const route = tripData?.route || {}
  const logs = tripData?.logs || []

  const totalDriving = logs.reduce((sum, log) => sum + (log.total_driving_hours || 0), 0)
  const totalOnDuty = logs.reduce((sum, log) => sum + (log.total_on_duty_hours || 0), 0)
  const totalSleeper = logs.reduce((sum, log) => sum + (log.total_sleeper_hours || 0), 0)

  const stops = [
    { label: 'Start', location: route.current_location, icon: '🚛', color: '#2563eb' },
    { label: 'Pickup', location: route.pickup_location, icon: '📦', color: '#7c3aed' },
    { label: 'Dropoff', location: route.dropoff_location, icon: '🏁', color: '#dc2626' },
  ]

  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const initMap = async () => {
      try {
        const L = window.L || (await import('leaflet').then(m => m.default))

        // Geocode locations
        const geocode = async (location) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
              { headers: { 'Accept-Language': 'en' } }
            )
            const data = await res.json()
            if (data && data[0]) {
              return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
            }
          } catch (e) {}
          return null
        }

        const [startCoords, pickupCoords, dropoffCoords] = await Promise.all([
          geocode(route.current_location),
          geocode(route.pickup_location),
          geocode(route.dropoff_location),
        ])

        if (!startCoords || !dropoffCoords) {
          setMapError(true)
          return
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        })

        mapInstanceRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map)

        const coords = [startCoords, pickupCoords, dropoffCoords].filter(Boolean)

        // Custom markers
        const createMarker = (color, emoji) => L.divIcon({
          html: `<div style="
            width:38px;height:38px;
            background:${color};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 3px 10px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);font-size:16px;display:block;text-align:center;line-height:32px;">${emoji}</span></div>`,
          className: '',
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -38],
        })

        // Add markers
        if (startCoords) {
          L.marker(startCoords, { icon: createMarker('#2563eb', '🚛') })
            .addTo(map)
            .bindPopup(`<b>📍 Start</b><br>${route.current_location}`)
        }
        if (pickupCoords) {
          L.marker(pickupCoords, { icon: createMarker('#7c3aed', '📦') })
            .addTo(map)
            .bindPopup(`<b>📦 Pickup</b><br>${route.pickup_location}`)
        }
        if (dropoffCoords) {
          L.marker(dropoffCoords, { icon: createMarker('#dc2626', '🏁') })
            .addTo(map)
            .bindPopup(`<b>🏁 Dropoff</b><br>${route.dropoff_location}`)
        }

        // Draw route line
        if (coords.length >= 2) {
          L.polyline(coords, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 4',
          }).addTo(map)
        }

        // Fit bounds
        const bounds = L.latLngBounds(coords)
        map.fitBounds(bounds, { padding: [40, 40] })

      } catch (err) {
        console.error(err)
        setMapError(true)
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [tripData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Map */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--gray-200)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>
            🗺️ Route Map
          </h3>
          <span style={{
            background: '#eff6ff',
            color: '#2563eb',
            fontSize: '12px',
            fontWeight: '600',
            padding: '4px 10px',
            borderRadius: '20px',
          }}>
            {route.estimated_distance}
          </span>
        </div>

        {mapError ? (
          /* Fallback visual map */
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
            padding: '32px 24px',
            minHeight: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '24px',
          }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                right: '0',
                height: '4px',
                background: 'linear-gradient(90deg, #2563eb, #7c3aed, #dc2626)',
                borderRadius: '2px',
                transform: 'translateY(-50%)',
              }}></div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 1,
              }}>
                {stops.map((stop, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <div style={{
                      width: '52px', height: '52px',
                      background: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      boxShadow: `0 4px 12px ${stop.color}40`,
                      border: `3px solid ${stop.color}`,
                    }}>{stop.icon}</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: stop.color }}>{stop.label}</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-700)', maxWidth: '100px', wordBreak: 'break-word' }}>{stop.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
              📍 Interactive map unavailable — showing route overview
            </p>
          </div>
        ) : (
          <div
            ref={mapRef}
            style={{ height: '380px', width: '100%' }}
          ></div>
        )}
      </div>

      {/* Stop Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
      }}>
        {stops.map((stop, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: 'var(--radius)',
            padding: '16px',
            boxShadow: 'var(--shadow)',
            border: `1px solid ${stop.color}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '44px', height: '44px',
              background: `${stop.color}15`,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}>{stop.icon}</div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: stop.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stop.label}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)', wordBreak: 'break-word' }}>{stop.location}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
      }}>
        {[
          { label: 'Total Days', value: tripData.total_days, unit: 'days', icon: '📅', color: '#2563eb', bg: '#eff6ff' },
          { label: 'Total Driving', value: totalDriving.toFixed(1), unit: 'hrs', icon: '🚛', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Total On-Duty', value: totalOnDuty.toFixed(1), unit: 'hrs', icon: '⏱️', color: '#059669', bg: '#f0fdf4' },
          { label: 'Rest Time', value: totalSleeper.toFixed(1), unit: 'hrs', icon: '😴', color: '#dc2626', bg: '#fef2f2' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: 'var(--radius)',
            padding: '20px',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--gray-200)',
          }}>
            <div style={{
              width: '40px', height: '40px',
              background: stat.bg,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              marginBottom: '10px',
            }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: stat.color, lineHeight: 1 }}>
              {stat.value}
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-400)', marginLeft: '4px' }}>{stat.unit}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: '500', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Daily Breakdown */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--gray-200)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>📊 Daily Breakdown</h3>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map((log, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--gray-200)',
              flexWrap: 'wrap',
            }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '800',
                fontSize: '14px',
                flexShrink: 0,
              }}>D{log.day}</div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Driving', value: log.total_driving_hours, color: '#7c3aed' },
                    { label: 'On-Duty', value: log.total_on_duty_hours, color: '#059669' },
                    { label: 'Sleeper', value: log.total_sleeper_hours, color: '#2563eb' },
                    { label: 'Off-Duty', value: log.total_off_duty_hours, color: '#dc2626' },
                  ].map((item, j) => (
                    <div key={j}>
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500' }}>{item.label}: </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: item.color }}>{item.value?.toFixed(1) || '0.0'}h</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', height: '6px', background: 'var(--gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((log.total_driving_hours / 11) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                    borderRadius: '3px',
                  }}></div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '3px' }}>
                  {log.total_driving_hours?.toFixed(1)}h of 11h driving limit
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MapView