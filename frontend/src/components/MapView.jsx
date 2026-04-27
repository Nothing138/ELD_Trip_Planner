import { useEffect, useRef } from 'react'

function MapView({ tripData }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const route = tripData?.route || {}
  const logs = tripData?.logs || []

  const totalDriving = logs.reduce((sum, log) => sum + (log.total_driving_hours || 0), 0)
  const totalOnDuty = logs.reduce((sum, log) => sum + (log.total_on_duty_hours || 0), 0)
  const totalSleeper = logs.reduce((sum, log) => sum + (log.total_sleeper_hours || 0), 0)

  const stops = [
    { label: 'Start', location: route.current_location, icon: '🚛', color: '#2563eb', coords: route.current_coords },
    { label: 'Pickup', location: route.pickup_location, icon: '📦', color: '#7c3aed', coords: route.pickup_coords },
    { label: 'Dropoff', location: route.dropoff_location, icon: '🏁', color: '#dc2626', coords: route.dropoff_coords },
  ]

  useEffect(() => {
    if (!mapRef.current) return

    // Destroy existing map instance
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove() } catch (e) {}
      mapInstanceRef.current = null
    }
    if (mapRef.current._leaflet_id) {
      delete mapRef.current._leaflet_id
    }

    const buildMap = () => {
      if (!window.L || !mapRef.current) return
      const L = window.L

      try {
        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        })
        mapInstanceRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map)

        const createMarker = (color, emoji) => L.divIcon({
          html: `<div style="
            width:36px;height:36px;
            background:${color};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 3px 10px rgba(0,0,0,0.3);
          "><span style="
            transform:rotate(45deg);
            font-size:15px;
            display:block;
            text-align:center;
            line-height:30px;
          ">${emoji}</span></div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        })

        const validCoords = []

        stops.forEach(stop => {
          if (!stop.coords || !Array.isArray(stop.coords) || stop.coords.length !== 2) return
          const lon = parseFloat(stop.coords[0])
          const lat = parseFloat(stop.coords[1])
          if (isNaN(lat) || isNaN(lon)) return
          const latLng = [lat, lon]
          validCoords.push(latLng)
          L.marker(latLng, { icon: createMarker(stop.color, stop.icon) })
            .addTo(map)
            .bindPopup(`<b>${stop.icon} ${stop.label}</b><br>${stop.location}`)
        })

        if (validCoords.length >= 2) {
          L.polyline(validCoords, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 4',
          }).addTo(map)
          map.fitBounds(L.latLngBounds(validCoords), { padding: [40, 40] })
        } else if (validCoords.length === 1) {
          map.setView(validCoords[0], 8)
        } else {
          map.setView([39.5, -98.35], 4)
        }
      } catch (err) {
        console.error('Map build error:', err)
      }
    }

    if (window.L) {
      buildMap()
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval)
          buildMap()
        }
      }, 100)
    }

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove() } catch (e) {}
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
            background: '#eff6ff', color: '#2563eb',
            fontSize: '12px', fontWeight: '600',
            padding: '4px 10px', borderRadius: '20px',
          }}>
            {route.estimated_distance}
          </span>
        </div>
        <div ref={mapRef} style={{ height: '380px', width: '100%' }}></div>
      </div>

      {/* Stop Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
      }}>
        {stops.map((stop, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 'var(--radius)',
            padding: '16px', boxShadow: 'var(--shadow)',
            border: `1px solid ${stop.color}30`,
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: '44px', height: '44px',
              background: `${stop.color}15`,
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '22px', flexShrink: 0,
            }}>{stop.icon}</div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: stop.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stop.label}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)', wordBreak: 'break-word' }}>
                {stop.location}
              </div>
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
            background: 'white', borderRadius: 'var(--radius)',
            padding: '20px', boxShadow: 'var(--shadow)',
            border: '1px solid var(--gray-200)',
          }}>
            <div style={{
              width: '40px', height: '40px', background: stat.bg,
              borderRadius: 'var(--radius-sm)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', marginBottom: '10px',
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
        background: 'white', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)', border: '1px solid var(--gray-200)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>📊 Daily Breakdown</h3>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map((log, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', background: 'var(--gray-50)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)', flexWrap: 'wrap',
            }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                borderRadius: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: '800',
                fontSize: '14px', flexShrink: 0,
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