import { useState, useEffect } from 'react'
import axios from 'axios'
import TripForm from './components/TripForm'
import ELDLog from './components/ELDLog'
import MapView from './components/MapView'
import RouteInstructions from './components/RouteInstructions'
import './index.css'

const API_URL = 'http://127.0.0.1:8000/api'

// ─── Trip History Panel ───────────────────────────────────────────
function TripHistory({ onLoadTrip }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      const res = await axios.get(`${API_URL}/trips/`)
      setTrips(res.data.trips || [])
    } catch (e) {
      console.error('Failed to fetch trips', e)
    }
    setLoading(false)
  }

  const loadTrip = async (tripId) => {
    setLoadingId(tripId)
    try {
      const res = await axios.get(`${API_URL}/trip/${tripId}/`)
      onLoadTrip(res.data)
    } catch (e) {
      alert('Failed to load trip')
    }
    setLoadingId(null)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch { return dateStr }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
      <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }}></div>
      <p style={{ fontSize: '14px' }}>Loading trip history...</p>
    </div>
  )

  if (trips.length === 0) return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius)', padding: '60px 24px',
      textAlign: 'center', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-200)',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗂️</div>
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--gray-700)', marginBottom: '8px' }}>No Trips Yet</h3>
      <p style={{ fontSize: '14px', color: 'var(--gray-400)' }}>Calculate your first trip to see history here</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gray-700)' }}>
          🗂️ Recent Trips ({trips.length})
        </h3>
        <button
          onClick={fetchTrips}
          style={{
            padding: '6px 12px', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '600',
            color: 'var(--gray-600)', background: 'white', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {trips.map((trip, i) => (
        <div key={trip.trip_id} style={{
          background: 'white', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)', border: '1px solid var(--gray-200)',
          overflow: 'hidden', transition: 'box-shadow 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
        >
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Index badge */}
            <div style={{
              width: '40px', height: '40px', flexShrink: 0,
              background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
              borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '14px',
            }}>
              #{trip.trip_id}
            </div>

            {/* Route info */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: '700', color: 'var(--gray-800)',
                flexWrap: 'wrap', marginBottom: '4px',
              }}>
                <span style={{ color: '#2563eb' }}>🚛 {trip.current_location}</span>
                <span style={{ color: 'var(--gray-300)' }}>→</span>
                <span style={{ color: '#7c3aed' }}>📦 {trip.pickup_location}</span>
                <span style={{ color: 'var(--gray-300)' }}>→</span>
                <span style={{ color: '#dc2626' }}>🏁 {trip.dropoff_location}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {trip.driver_name && (
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                    👤 <strong>{trip.driver_name}</strong>
                  </span>
                )}
                {trip.trip_date && (
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                    📅 {new Date(trip.trip_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                  ⏱️ Cycle used: {trip.current_cycle_used}h
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                  🕒 Saved: {formatDate(trip.created_at)}
                </span>
              </div>
            </div>

            {/* Load button */}
            <button
              onClick={() => loadTrip(trip.trip_id)}
              disabled={loadingId === trip.trip_id}
              style={{
                padding: '9px 18px',
                background: loadingId === trip.trip_id ? 'var(--gray-200)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: loadingId === trip.trip_id ? 'var(--gray-500)' : 'white',
                border: 'none', borderRadius: 'var(--radius-sm)',
                fontSize: '13px', fontWeight: '600', cursor: loadingId === trip.trip_id ? 'not-allowed' : 'pointer',
                flexShrink: 0, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: loadingId === trip.trip_id ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
              }}
            >
              {loadingId === trip.trip_id
                ? <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div> Loading...</>
                : '📂 Load Trip'
              }
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────
function App() {
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('map')

  const handleTripCalculated = (data) => {
    setTripData(data)
    setActiveTab('map')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
        padding: '0', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        position: 'sticky', top: 0, zIndex: 1000,
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
            }}>🚛</div>
            <div>
              <h1 style={{ color: 'white', fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                ELD Trip Planner
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>FMCSA Compliant Hours of Service</p>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.1)', padding: '6px 14px',
            borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 6px #10b981' }}></div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '500' }}>70hr/8-day Rule Active</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{
        maxWidth: '1400px', margin: '0 auto',
        padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px)',
        display: 'grid',
        gridTemplateColumns: tripData ? 'minmax(320px, 400px) 1fr' : '1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left Panel — Form */}
        <div style={{ position: tripData ? 'sticky' : 'static', top: '90px' }}>
          <TripForm
            onTripCalculated={handleTripCalculated}
            loading={loading}
            setLoading={setLoading}
          />
        </div>

        {/* Right Panel — Results */}
        {tripData ? (
          <div className="fade-in">
            {/* Tab Navigation */}
            <div style={{
              display: 'flex', gap: '4px',
              background: 'white', padding: '6px',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
              marginBottom: '20px', border: '1px solid var(--gray-200)',
              flexWrap: 'wrap',
            }}>
              {[
                { id: 'map',          label: '🗺️ Route Map' },
                { id: 'logs',         label: '📋 ELD Logs' },
                { id: 'instructions', label: '🧭 Instructions' },
                { id: 'history',      label: '🗂️ Trip History' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '10px 12px',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                    transition: 'all 0.2s ease',
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #0f172a, #1e3a5f)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--gray-500)',
                    boxShadow: activeTab === tab.id ? '0 4px 12px rgba(15,23,42,0.3)' : 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Trip Summary Card */}
            {activeTab !== 'history' && (
              <div style={{
                background: 'white', borderRadius: 'var(--radius)',
                padding: '20px', marginBottom: '20px',
                boxShadow: 'var(--shadow)', border: '1px solid var(--gray-200)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Trip Summary
                  </h3>
                  {tripData.driver_name && (
                    <span style={{
                      background: '#eff6ff', color: '#2563eb',
                      padding: '4px 12px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '600',
                    }}>
                      👤 {tripData.driver_name}
                      {tripData.trip_date && <span style={{ color: '#60a5fa', marginLeft: '8px' }}>
                        📅 {new Date(tripData.trip_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Total Days',    value: tripData.total_days,                         icon: '📅', color: '#2563eb' },
                    { label: 'Est. Distance', value: tripData.route?.estimated_distance || 'N/A', icon: '📍', color: '#7c3aed' },
                    { label: 'From',          value: tripData.route?.current_location || 'N/A',   icon: '🚛', color: '#059669' },
                    { label: 'To',            value: tripData.route?.dropoff_location || 'N/A',   icon: '🏁', color: '#dc2626' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', padding: '14px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: item.color, marginBottom: '2px', wordBreak: 'break-word' }}>{item.value}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'map'          && <MapView tripData={tripData} />}
            {activeTab === 'logs'         && <ELDLog tripData={tripData} />}
            {activeTab === 'instructions' && <RouteInstructions tripData={tripData} />}
            {activeTab === 'history'      && <TripHistory onLoadTrip={(data) => { setTripData(data); setActiveTab('map') }} />}
          </div>
        ) : (
          /* No trip yet — show history full width */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tab bar - history only when no trip */}
            <div style={{
              display: 'flex', gap: '4px',
              background: 'white', padding: '6px',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
              border: '1px solid var(--gray-200)',
            }}>
              <button style={{
                flex: 1, padding: '10px 16px', border: 'none',
                borderRadius: 'var(--radius-sm)', cursor: 'default',
                fontWeight: '600', fontSize: '14px', fontFamily: 'inherit',
                background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', color: 'white',
                boxShadow: '0 4px 12px rgba(15,23,42,0.3)',
              }}>🗂️ Trip History</button>
            </div>
            <TripHistory onLoadTrip={(data) => { setTripData(data); setActiveTab('map') }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        background: 'var(--gray-900)', color: 'var(--gray-400)',
        textAlign: 'center', padding: '20px', fontSize: '13px', marginTop: '40px',
      }}>
        <p>ELD Trip Planner • FMCSA HOS Compliant • 70hr/8-day Property Carrier Rules</p>
      </footer>
    </div>
  )
}

export default App