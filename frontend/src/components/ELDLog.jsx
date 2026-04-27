import { useState, useRef } from 'react'

const ACTIVITY_COLORS = {
  driving: { bg: '#7c3aed', light: '#f5f3ff', label: 'Driving' },
  on_duty: { bg: '#059669', light: '#f0fdf4', label: 'On Duty' },
  off_duty: { bg: '#2563eb', light: '#eff6ff', label: 'Off Duty' },
  sleeper: { bg: '#0f172a', light: '#f1f5f9', label: 'Sleeper Berth' },
}

function ELDGrid({ activities }) {
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  const ROWS = ['off_duty', 'sleeper', 'driving', 'on_duty']
  const ROW_LABELS = {
    off_duty: '1. Off Duty',
    sleeper: '2. Sleeper Berth',
    driving: '3. Driving',
    on_duty: '4. On Duty (Not Driving)',
  }

  const getRowActivities = (type) =>
    activities.filter(a => a.type === type)

  const getBarStyle = (activity, rowType) => {
    const startPct = ((activity.start % 24) / 24) * 100
    const duration = Math.min(activity.end - activity.start, 24 - (activity.start % 24))
    const widthPct = (duration / 24) * 100
    return {
      position: 'absolute',
      left: `${startPct}%`,
      width: `${widthPct}%`,
      top: '4px',
      bottom: '4px',
      background: ACTIVITY_COLORS[rowType]?.bg || '#64748b',
      borderRadius: '3px',
      minWidth: '2px',
      opacity: 0.9,
    }
  }

  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--gray-300)',
    }}>
      <div style={{ minWidth: '600px' }}>
        {/* Hour markers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 60px',
          borderBottom: '1px solid var(--gray-300)',
          background: 'var(--gray-100)',
        }}>
          <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: '700', color: 'var(--gray-500)' }}>
            STATUS
          </div>
          <div style={{ position: 'relative', borderLeft: '1px solid var(--gray-300)' }}>
            <div style={{ display: 'flex' }}>
              {HOURS.map(h => (
                <div key={h} style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '9px',
                  fontWeight: '600',
                  color: 'var(--gray-500)',
                  padding: '4px 0',
                  borderRight: h < 23 ? '1px solid var(--gray-200)' : 'none',
                }}>
                  {h === 0 ? 'M' : h === 12 ? 'N' : h % 6 === 0 ? `${h}` : ''}
                </div>
              ))}
            </div>
          </div>
          <div style={{
            padding: '6px 8px',
            fontSize: '10px',
            fontWeight: '700',
            color: 'var(--gray-500)',
            borderLeft: '1px solid var(--gray-300)',
            textAlign: 'center',
          }}>HRS</div>
        </div>

        {/* Rows */}
        {ROWS.map(rowType => {
          const rowActivities = getRowActivities(rowType)
          const totalHrs = rowActivities.reduce((sum, a) => sum + (a.end - a.start), 0)

          return (
            <div key={rowType} style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 60px',
              borderBottom: '1px solid var(--gray-200)',
              minHeight: '36px',
              background: rowActivities.length > 0 ? ACTIVITY_COLORS[rowType]?.light : 'white',
            }}>
              <div style={{
                padding: '8px',
                fontSize: '10px',
                fontWeight: '600',
                color: 'var(--gray-700)',
                display: 'flex',
                alignItems: 'center',
                borderRight: '1px solid var(--gray-300)',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: ACTIVITY_COLORS[rowType]?.bg,
                  borderRadius: '2px',
                  marginRight: '6px',
                  flexShrink: 0,
                }}></div>
                {ROW_LABELS[rowType]}
              </div>
              <div style={{
                position: 'relative',
                borderLeft: '1px solid var(--gray-300)',
              }}>
                {/* Grid lines */}
                {HOURS.map(h => (
                  <div key={h} style={{
                    position: 'absolute',
                    left: `${(h / 24) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    background: h % 6 === 0 ? 'var(--gray-300)' : 'var(--gray-100)',
                  }}></div>
                ))}
                {/* Activity bars */}
                {rowActivities.map((activity, i) => (
                  <div
                    key={i}
                    style={getBarStyle(activity, rowType)}
                    title={`${activity.label} (${activity.start.toFixed(1)}-${activity.end.toFixed(1)})`}
                  ></div>
                ))}
              </div>
              <div style={{
                padding: '8px',
                fontSize: '11px',
                fontWeight: '700',
                color: ACTIVITY_COLORS[rowType]?.bg || 'var(--gray-600)',
                borderLeft: '1px solid var(--gray-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {totalHrs > 0 ? totalHrs.toFixed(1) : '-'}
              </div>
            </div>
          )
        })}

        {/* Remarks row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 60px',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white',
          minHeight: '40px',
        }}>
          <div style={{
            padding: '8px',
            fontSize: '10px',
            fontWeight: '700',
            color: 'var(--gray-600)',
            borderRight: '1px solid var(--gray-300)',
            display: 'flex',
            alignItems: 'center',
          }}>REMARKS</div>
          <div style={{
            padding: '8px',
            fontSize: '9px',
            color: 'var(--gray-500)',
            borderLeft: '1px solid var(--gray-300)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {activities.map((a, i) => (
              <span key={i}>
                <strong>{a.start.toFixed(1)}</strong> {a.label} @ {a.location}
              </span>
            ))}
          </div>
          <div style={{ borderLeft: '1px solid var(--gray-300)' }}></div>
        </div>
      </div>
    </div>
  )
}

function ELDLog({ tripData }) {
  const [selectedDay, setSelectedDay] = useState(0)
  const logs = tripData?.logs || []
  const currentLog = logs[selectedDay]

  const totalHours = currentLog
    ? (currentLog.total_driving_hours || 0) +
      (currentLog.total_on_duty_hours || 0) +
      (currentLog.total_off_duty_hours || 0) +
      (currentLog.total_sleeper_hours || 0)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Day Selector */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        padding: '16px',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--gray-200)',
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: '700',
          color: 'var(--gray-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}>Select Day</h3>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {logs.map((log, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                background: selectedDay === i
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : 'var(--gray-100)',
                color: selectedDay === i ? 'white' : 'var(--gray-600)',
                boxShadow: selectedDay === i ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              Day {log.day}
            </button>
          ))}
        </div>
      </div>

      {/* ELD Log Sheet */}
      {currentLog && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden',
        }}>
          {/* Log Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
            padding: '20px 24px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <h2 style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '4px',
                }}>Driver's Daily Log</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                  U.S. Department of Transportation — FMCSA
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 16px',
                border: '1px solid rgba(255,255,255,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '500' }}>DAY</div>
                <div style={{ color: 'white', fontSize: '28px', fontWeight: '800', lineHeight: 1 }}>
                  {currentLog.day}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                  of {logs.length}
                </div>
              </div>
            </div>
          </div>

          {/* Log Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1px',
            background: 'var(--gray-200)',
            borderBottom: '1px solid var(--gray-200)',
          }}>
            {[
              { label: 'Carrier', value: 'Property Carrier' },
              { label: 'Driver', value: 'CMV Operator' },
              { label: 'Cycle', value: '70hr / 8-day' },
              { label: 'Vehicle', value: 'CMV' },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'white',
                padding: '12px 16px',
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}>{item.label}</div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--gray-800)',
                }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ padding: '20px' }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--gray-600)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>24-Hour Activity Grid</h3>
            <ELDGrid activities={currentLog.activities || []} />
          </div>

          {/* Hours Summary */}
          <div style={{
            padding: '0 20px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
          }}>
            {[
              {
                label: 'Driving',
                value: currentLog.total_driving_hours,
                max: 11,
                color: '#7c3aed',
                bg: '#f5f3ff',
              },
              {
                label: 'On Duty',
                value: currentLog.total_on_duty_hours,
                max: 14,
                color: '#059669',
                bg: '#f0fdf4',
              },
              {
                label: 'Off Duty',
                value: currentLog.total_off_duty_hours,
                max: 24,
                color: '#2563eb',
                bg: '#eff6ff',
              },
              {
                label: 'Sleeper',
                value: currentLog.total_sleeper_hours,
                max: 10,
                color: '#0f172a',
                bg: '#f1f5f9',
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: item.bg,
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                border: `1px solid ${item.color}20`,
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: item.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}>{item.label}</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: item.color,
                  lineHeight: 1,
                }}>
                  {(item.value || 0).toFixed(1)}
                  <span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '2px' }}>hrs</span>
                </div>
                {/* Mini progress bar */}
                <div style={{
                  marginTop: '8px',
                  height: '4px',
                  background: `${item.color}20`,
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(((item.value || 0) / item.max) * 100, 100)}%`,
                    background: item.color,
                    borderRadius: '2px',
                  }}></div>
                </div>
                <div style={{
                  fontSize: '10px',
                  color: `${item.color}99`,
                  marginTop: '3px',
                  fontWeight: '500',
                }}>Max: {item.max}h</div>
              </div>
            ))}
          </div>

          {/* Activities List */}
          <div style={{
            margin: '0 20px 20px',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: 'var(--gray-50)',
              padding: '10px 16px',
              borderBottom: '1px solid var(--gray-200)',
            }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--gray-600)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Activity Details</h4>
            </div>
            {(currentLog.activities || []).map((activity, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderBottom: i < currentLog.activities.length - 1 ? '1px solid var(--gray-100)' : 'none',
                background: i % 2 === 0 ? 'white' : 'var(--gray-50)',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  background: ACTIVITY_COLORS[activity.type]?.bg || '#64748b',
                  borderRadius: '2px',
                  flexShrink: 0,
                }}></div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--gray-800)',
                  }}>{activity.label}</div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--gray-400)',
                  }}>📍 {activity.location}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: ACTIVITY_COLORS[activity.type]?.bg || '#64748b',
                  }}>
                    {String(Math.floor(activity.start % 24)).padStart(2, '0')}:
                    {String(Math.round((activity.start % 1) * 60)).padStart(2, '0')} →{' '}
                    {String(Math.floor(activity.end % 24)).padStart(2, '0')}:
                    {String(Math.round((activity.end % 1) * 60)).padStart(2, '0')}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--gray-400)',
                  }}>
                    {(activity.end - activity.start).toFixed(1)}h
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Certification */}
          <div style={{
            margin: '0 20px 20px',
            padding: '14px 16px',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--gray-200)',
            fontSize: '11px',
            color: 'var(--gray-500)',
            textAlign: 'center',
          }}>
            I certify that these entries are true and correct. All hours comply with FMCSA 49 CFR Part 395 regulations.
          </div>
        </div>
      )}
    </div>
  )
}

export default ELDLog