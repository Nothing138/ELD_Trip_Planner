import { useState, useRef } from 'react'

const ACTIVITY_COLORS = {
  driving:  { bg: '#1a1a2e', light: '#f0f0f8', label: 'Driving' },
  on_duty:  { bg: '#14532d', light: '#f0fdf4', label: 'On Duty Not Driving' },
  off_duty: { bg: '#1e3a5f', light: '#eff6ff', label: 'Off Duty' },
  sleeper:  { bg: '#1c1c1c', light: '#f8f8f8', label: 'Sleeper Berth' },
}

// ─── FMCSA 24-hr grid ──────────────────────────────────────────────
function ELDGrid({ activities }) {
  const HOURS = Array.from({ length: 25 }, (_, i) => i) // 0..24 for labels
  const ROWS = ['off_duty', 'sleeper', 'driving', 'on_duty']
  const ROW_LABELS = {
    off_duty: '1. Off Duty',
    sleeper:  '2. Sleeper Berth',
    driving:  '3. Driving',
    on_duty:  '4. On Duty (Not Driving)',
  }

  const getBarStyle = (activity, rowType) => {
    const startH = activity.start % 24
    const endH   = Math.min(activity.end % 24 || 24, 24)
    const startPct = (startH / 24) * 100
    const widthPct = ((Math.min(activity.end - activity.start, 24 - startH)) / 24) * 100
    return {
      position: 'absolute',
      left: `${startPct}%`,
      width: `${Math.max(widthPct, 0.5)}%`,
      top: '0', bottom: '0',
      background: ACTIVITY_COLORS[rowType]?.bg || '#333',
      minWidth: '2px',
    }
  }

  return (
    <div style={{
      border: '2px solid #000',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      background: 'white',
    }}>
      {/* Hour ruler — top */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 52px', borderBottom: '1px solid #000' }}>
        <div style={{ borderRight: '1px solid #000', padding: '2px 4px', fontSize: '9px', fontWeight: 'bold', background: '#f0f0f0' }}>
          DUTY STATUS
        </div>
        <div style={{ borderRight: '1px solid #000', background: '#f0f0f0' }}>
          {/* Hour ticks */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', fontSize: '8px', fontWeight: 'bold',
                borderRight: i < 23 ? '1px solid #ccc' : 'none',
                padding: '1px 0',
                background: i % 2 === 0 ? '#f5f5f5' : '#ebebeb',
              }}>
                {i === 0 ? 'M' : i === 12 ? 'N' : i % 3 === 0 ? i : ''}
              </div>
            ))}
          </div>
          {/* Half-hour ticks */}
          <div style={{ display: 'flex' }}>
            {Array.from({ length: 48 }, (_, i) => (
              <div key={i} style={{
                flex: 1,
                height: '4px',
                borderRight: i < 47 ? `1px solid ${i % 2 === 1 ? '#999' : '#ddd'}` : 'none',
                background: i % 4 === 0 ? '#ddd' : 'white',
              }} />
            ))}
          </div>
        </div>
        <div style={{ background: '#f0f0f0', textAlign: 'center', padding: '2px', fontSize: '9px', fontWeight: 'bold' }}>TOTAL</div>
      </div>

      {/* Activity rows */}
      {ROWS.map((rowType, ri) => {
        const rowActivities = activities.filter(a => a.type === rowType)
        const totalHrs = rowActivities.reduce((sum, a) => sum + (a.end - a.start), 0)

        return (
          <div key={rowType} style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 52px',
            borderBottom: ri < ROWS.length - 1 ? '1px solid #000' : 'none',
            minHeight: '32px',
          }}>
            {/* Label */}
            <div style={{
              borderRight: '1px solid #000',
              padding: '4px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              background: '#fafafa',
            }}>
              {ROW_LABELS[rowType]}
            </div>

            {/* Grid area */}
            <div style={{ position: 'relative', borderRight: '1px solid #000', background: 'white' }}>
              {/* Vertical grid lines */}
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${(i / 24) * 100}%`,
                  top: 0, bottom: 0, width: '1px',
                  background: i % 6 === 0 ? '#999' : i % 3 === 0 ? '#ccc' : '#eee',
                  zIndex: 0,
                }} />
              ))}
              {/* Half-hour lines */}
              {Array.from({ length: 48 }, (_, i) => (
                <div key={`h${i}`} style={{
                  position: 'absolute',
                  left: `${(i / 48) * 100}%`,
                  top: 0, bottom: 0, width: '1px',
                  background: '#f0f0f0',
                  zIndex: 0,
                }} />
              ))}
              {/* Activity bars */}
              {rowActivities.map((act, i) => (
                <div key={i} style={getBarStyle(act, rowType)} title={`${act.label} @ ${act.location}`} />
              ))}
              {/* Connecting line between bars (FMCSA style) */}
              {rowActivities.length === 0 && (
                <div style={{
                  position: 'absolute', top: '50%', left: 0, right: 0, height: '2px',
                  background: '#ddd', transform: 'translateY(-50%)',
                }} />
              )}
            </div>

            {/* Hours total */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold',
              color: totalHrs > 0 ? ACTIVITY_COLORS[rowType]?.bg : '#999',
              background: totalHrs > 0 ? ACTIVITY_COLORS[rowType]?.light : 'white',
            }}>
              {totalHrs > 0 ? totalHrs.toFixed(1) : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Remarks row ───────────────────────────────────────────────────
function RemarksRow({ activities }) {
  return (
    <div style={{
      border: '1px solid #000',
      borderTop: 'none',
      display: 'grid',
      gridTemplateColumns: '80px 1fr',
      minHeight: '36px',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    }}>
      <div style={{
        borderRight: '1px solid #000', padding: '4px 6px',
        fontWeight: 'bold', background: '#f0f0f0',
        display: 'flex', alignItems: 'center',
      }}>REMARKS</div>
      <div style={{ padding: '4px 8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {activities.map((a, i) => {
          const fmtTime = h => {
            const hh = Math.floor(h % 24)
            const mm = Math.round((h % 1) * 60)
            return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
          }
          return (
            <span key={i} style={{ whiteSpace: 'nowrap' }}>
              <b>{fmtTime(a.start)}</b> {a.label} — {a.location};
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── FMCSA Paper Log Header ────────────────────────────────────────
function FMCSAHeader({ log, tripData, dayDate }) {
  const route   = tripData?.route || {}
  const driverName  = tripData?.driver_name || 'CMV Operator'
  const carrierName = 'Property Carrier LLC'
  const truckNo     = 'CMV-001'
  const trailerNo   = 'TRL-' + (tripData?.trip_id ? String(tripData.trip_id).padStart(3,'0') : '001')

  const cell = (label, value, flex = 1) => (
    <div style={{ flex, borderRight: '1px solid #000', padding: '3px 6px', minWidth: 0 }}>
      <div style={{ fontSize: '8px', color: '#555', textTransform: 'uppercase', fontFamily: "'Courier New', monospace" }}>{label}</div>
      <div style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: "'Courier New', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ border: '2px solid #000', marginBottom: '0', background: 'white' }}>
      {/* Title bar */}
      <div style={{
        background: '#0f172a', color: 'white', padding: '6px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>
          DRIVER'S DAILY LOG
        </span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: '10px', color: '#94a3b8' }}>
          FMCSA 49 CFR §395.8 | Original — Driver's Copy
        </span>
      </div>

      {/* Row 1: Date / Day / Cycle */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        {cell('Date', dayDate, 2)}
        {cell('Day of Trip', `Day ${log.day} of ${tripData.total_days}`, 1.5)}
        {cell('Cycle Rule', '70 Hr / 8-Day Property', 2)}
        {cell('24-hr Period Starting At', 'Midnight (00:00)', 2)}
        <div style={{ flex: 1, padding: '3px 6px' }}>
          <div style={{ fontSize: '8px', color: '#555', textTransform: 'uppercase', fontFamily: "'Courier New', monospace" }}>Total Miles Today</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: "'Courier New', monospace" }}>{log.miles_driven || 0} mi</div>
        </div>
      </div>

      {/* Row 2: Driver / Co-Driver / Employee # */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        {cell("Driver's Name (Last, First)", driverName, 3)}
        {cell("Co-Driver's Name", '— N/A —', 2)}
        {cell('Employee / Driver No.', 'EMP-' + String(tripData?.trip_id || '0001').padStart(4,'0'), 1.5)}
        {cell('Exempt (ELD)', 'No', 1)}
      </div>

      {/* Row 3: Carrier / Main Office / Home Terminal */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        {cell('Carrier Name', carrierName, 3)}
        {cell('Main Office Address', '1000 Carrier Blvd, Chicago, IL 60601', 3)}
        {cell('Home Terminal Address', route.current_location || '—', 2)}
      </div>

      {/* Row 4: Truck / Trailer / Odometer */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        {cell('Truck / Tractor No.', truckNo, 1.5)}
        {cell('Trailer No.(s)', trailerNo, 1.5)}
        {cell('Odometer Start (mi)', '—', 1.5)}
        {cell('Odometer End (mi)', '—', 1.5)}
        {cell('Total Miles Driven', `${log.miles_driven || 0} mi`, 1.5)}
        {cell('Fuel Stop(s)', log.activities?.filter(a => a.label === 'Fuel Stop').length || 0, 1)}
      </div>

      {/* Row 5: From / To / Shipper */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        {cell('From (Origin)', route.current_location || '—', 2.5)}
        {cell('Pickup At', route.pickup_location || '—', 2.5)}
        {cell('To (Destination)', route.dropoff_location || '—', 2.5)}
        {cell('Shipper Name', 'Shipper Co.', 2)}
        {cell('Commodity', 'General Freight', 2)}
        {cell('Bill of Lading / Manifest No.', 'BOL-' + String(tripData?.trip_id || '0001').padStart(6,'0'), 2)}
      </div>
    </div>
  )
}

// ─── Hours Summary Footer ──────────────────────────────────────────
function HoursSummary({ log }) {
  const items = [
    { label: '1. Off Duty',            value: log.total_off_duty_hours, max: 24, color: '#1e3a5f' },
    { label: '2. Sleeper Berth',       value: log.total_sleeper_hours,  max: 10, color: '#1c1c1c' },
    { label: '3. Driving',             value: log.total_driving_hours,  max: 11, color: '#1a1a2e' },
    { label: '4. On Duty Not Driving', value: log.total_on_duty_hours,  max: 14, color: '#14532d' },
  ]
  const grandTotal = items.reduce((s, i) => s + (i.value || 0), 0)

  return (
    <div style={{
      border: '1px solid #000', borderTop: 'none',
      background: 'white', fontFamily: "'Courier New', monospace",
    }}>
      <div style={{ display: 'flex' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            flex: 1, borderRight: i < items.length - 1 ? '1px solid #000' : 'none',
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px' }}>{item.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: item.color, lineHeight: 1 }}>
              {(item.value || 0).toFixed(1)}
              <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}> hrs</span>
            </div>
            <div style={{ marginTop: '6px', height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(((item.value || 0) / item.max) * 100, 100)}%`, background: item.color }} />
            </div>
            <div style={{ fontSize: '8px', color: '#999', marginTop: '2px' }}>Max: {item.max}h</div>
          </div>
        ))}
        <div style={{ width: '80px', padding: '8px 10px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: '8px', color: '#94a3b8', marginBottom: '2px' }}>TOTAL</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{grandTotal.toFixed(1)}</div>
          <div style={{ fontSize: '8px', color: '#94a3b8' }}>hrs</div>
        </div>
      </div>
    </div>
  )
}

// ─── Certification Footer ──────────────────────────────────────────
function CertificationFooter({ driverName }) {
  return (
    <div style={{
      border: '1px solid #000', borderTop: 'none',
      padding: '10px 14px', background: '#fafafa',
      fontFamily: "'Courier New', monospace", fontSize: '9px', color: '#333',
    }}>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 3, minWidth: '200px' }}>
          <strong>DRIVER CERTIFICATION</strong><br />
          I hereby certify that my data entries and my record of duty status for this 24-hour period are true and correct,
          that I have not and will not violate any provisions of the Federal Motor Carrier Safety Regulations,
          and that I have at least 10 consecutive hours off duty preceding this day's work. (49 CFR §395.8(j))
        </div>
        <div style={{ flex: 2, minWidth: '160px' }}>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '4px', minWidth: '140px', paddingBottom: '12px' }}></div>
          <div>Driver Signature</div>
          <br />
          <strong>{driverName}</strong>
        </div>
        <div style={{ flex: 1, minWidth: '100px', fontSize: '8px', color: '#666', lineHeight: '1.6' }}>
          <div><b>Carrier Copy</b></div>
          <div>USDOT: —</div>
          <div>MC/MX: —</div>
          <div>FMCSA §395.8</div>
          <div>HOS Rule: 70/8</div>
        </div>
      </div>
    </div>
  )
}

// ─── Activity Detail Table ─────────────────────────────────────────
function ActivityTable({ activities }) {
  const fmtTime = h => {
    const hh = Math.floor(h % 24)
    const mm = Math.round((h % 1) * 60)
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
  }

  return (
    <div style={{
      border: '1px solid #000', background: 'white',
      fontFamily: "'Courier New', monospace", overflow: 'hidden',
    }}>
      <div style={{
        background: '#0f172a', color: 'white',
        padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px',
      }}>
        ACTIVITY LOG — DETAILED TIMELINE
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
              {['#', 'Status', 'Start', 'End', 'Duration', 'Activity', 'Location'].map((h, i) => (
                <th key={i} style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map((act, i) => {
              const dur = act.end - act.start
              const color = ACTIVITY_COLORS[act.type]?.bg || '#333'
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #eee', color: '#666' }}>{i + 1}</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #eee' }}>
                    <span style={{ background: color, color: 'white', padding: '1px 6px', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold' }}>
                      {ACTIVITY_COLORS[act.type]?.label || act.type}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{fmtTime(act.start)}</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{fmtTime(act.end)}</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #eee', color: '#0f172a' }}>{dur.toFixed(2)}h</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #eee' }}>{act.label}</td>
                  <td style={{ padding: '4px 8px', color: '#555' }}>📍 {act.location}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main ELDLog Component ─────────────────────────────────────────
function ELDLog({ tripData }) {
  const [selectedDay, setSelectedDay] = useState(0)
  const logs = tripData?.logs || []
  const currentLog = logs[selectedDay]
  const driverName = tripData?.driver_name || 'CMV Operator'

  // Calculate date for the selected day
  const getDayDate = (dayIndex) => {
    if (!tripData?.trip_date) return `Day ${dayIndex + 1}`
    const d = new Date(tripData.trip_date)
    d.setDate(d.getDate() + dayIndex)
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Day Selector */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius)',
        padding: '16px', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-200)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Select Day
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
            Driver: <strong style={{ color: 'var(--gray-700)' }}>{driverName}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {logs.map((log, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                background: selectedDay === i ? 'linear-gradient(135deg, #0f172a, #1e3a5f)' : 'var(--gray-100)',
                color: selectedDay === i ? 'white' : 'var(--gray-600)',
                boxShadow: selectedDay === i ? '0 4px 12px rgba(15,23,42,0.3)' : 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              Day {log.day}
              <span style={{ display: 'block', fontSize: '10px', fontWeight: '400', opacity: 0.7 }}>
                {getDayDate(i).split(',')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* FMCSA Paper Log */}
      {currentLog && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {/* Paper Log Container */}
          <div style={{ padding: '20px', background: '#f8f8f0', overflowX: 'auto' }}>
            <div style={{ minWidth: '720px' }}>

              {/* FMCSA Header */}
              <FMCSAHeader log={currentLog} tripData={tripData} dayDate={getDayDate(selectedDay)} />

              {/* Spacer */}
              <div style={{ height: '1px', background: '#000' }} />

              {/* 24-Hour Grid */}
              <ELDGrid activities={currentLog.activities || []} />

              {/* Remarks */}
              <RemarksRow activities={currentLog.activities || []} />

              {/* Hours Summary */}
              <HoursSummary log={currentLog} />

              {/* Certification */}
              <CertificationFooter driverName={driverName} />

            </div>
          </div>

          {/* Activity Detail Table */}
          <div style={{ padding: '20px', borderTop: '2px solid var(--gray-200)' }}>
            <h3 style={{
              fontSize: '13px', fontWeight: '700', color: 'var(--gray-600)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px',
            }}>
              📋 Detailed Activity Timeline — Day {currentLog.day}
            </h3>
            <ActivityTable activities={currentLog.activities || []} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ELDLog