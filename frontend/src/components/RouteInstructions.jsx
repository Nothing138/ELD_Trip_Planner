function RouteInstructions({ tripData }) {
  const route = tripData?.route || {}
  const instructions = route.route_instructions || []
  const logs = tripData?.logs || []

  const allStops = []
  logs.forEach(log => {
    log.activities?.forEach(activity => {
      if (['on_duty', 'off_duty', 'sleeper'].includes(activity.type) &&
        activity.label !== 'Pre-trip Inspection' &&
        activity.label !== 'Post-trip Inspection') {
        allStops.push({ ...activity, day: log.day })
      }
    })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Trip Overview */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--gray-200)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          padding: '16px 20px',
        }}>
          <h3 style={{ color: 'white', fontSize: '15px', fontWeight: '700' }}>
            🧭 Route Instructions
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' }}>
            {route.current_location} → {route.pickup_location} → {route.dropoff_location}
          </p>
        </div>

        {/* Distance Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1px',
          background: 'var(--gray-200)',
          borderBottom: '1px solid var(--gray-200)',
        }}>
          {[
            { label: 'Total Distance', value: route.estimated_distance, icon: '📍' },
            { label: 'To Pickup', value: `${route.to_pickup_miles} mi`, icon: '📦' },
            { label: 'To Dropoff', value: `${route.to_dropoff_miles} mi`, icon: '🏁' },
            { label: 'Total Days', value: `${tripData.total_days} days`, icon: '📅' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '14px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gray-800)' }}>
                {item.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Route Segments */}
      {instructions.length > 0 ? (
        instructions.map((segment, si) => (
          <div key={si} style={{
            background: 'white',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--gray-200)',
            overflow: 'hidden',
          }}>
            {/* Segment Header */}
            <div style={{
              padding: '14px 20px',
              background: si === 0 ? '#eff6ff' : '#f0fdf4',
              borderBottom: '1px solid var(--gray-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{si === 0 ? '🚛' : '📦'}</span>
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: si === 0 ? '#1d4ed8' : '#059669',
                  }}>{segment.segment}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                    {segment.distance} • {segment.duration}
                  </div>
                </div>
              </div>
              <div style={{
                background: si === 0 ? '#2563eb' : '#059669',
                color: 'white',
                fontSize: '11px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '20px',
              }}>
                Segment {si + 1}
              </div>
            </div>

            {/* Steps */}
            <div style={{ padding: '8px 0' }}>
              {segment.steps?.map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: i < segment.steps.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  background: i % 2 === 0 ? 'white' : 'var(--gray-50)',
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '800',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--gray-800)',
                    }}>{step.instruction}</div>
                    {step.name && (
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--gray-400)',
                        marginTop: '2px',
                      }}>📍 {step.name}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#2563eb',
                    }}>{step.distance} mi</div>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--gray-400)',
                    }}>{step.duration} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          padding: '40px',
          textAlign: 'center',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--gray-200)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧭</div>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>
            Route instructions will appear after calculating a trip
          </p>
        </div>
      )}

      {/* HOS Stops Summary */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--gray-200)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gray-800)' }}>
            🛑 Required Stops & Rest Periods
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
            FMCSA HOS Compliant Schedule
          </p>
        </div>
        <div style={{ padding: '8px 0' }}>
          {allStops.map((stop, i) => {
            const colors = {
              on_duty: { bg: '#f0fdf4', color: '#059669', icon: '⚙️' },
              off_duty: { bg: '#eff6ff', color: '#2563eb', icon: '☕' },
              sleeper: { bg: '#f1f5f9', color: '#0f172a', icon: '😴' },
            }
            const style = colors[stop.type] || colors.on_duty

            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderBottom: i < allStops.length - 1 ? '1px solid var(--gray-100)' : 'none',
                background: i % 2 === 0 ? 'white' : 'var(--gray-50)',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: style.bg,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>{style.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--gray-800)',
                  }}>{stop.label}</div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--gray-400)',
                  }}>📍 {stop.location}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: style.color,
                    background: style.bg,
                    padding: '3px 8px',
                    borderRadius: '12px',
                  }}>Day {stop.day}</div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--gray-400)',
                    marginTop: '3px',
                  }}>
                    {String(Math.floor(stop.start % 24)).padStart(2, '0')}:
                    {String(Math.round((stop.start % 1) * 60)).padStart(2, '0')} -
                    {String(Math.floor(stop.end % 24)).padStart(2, '0')}:
                    {String(Math.round((stop.end % 1) * 60)).padStart(2, '0')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RouteInstructions