import { useState } from 'react'
import TripForm from './components/TripForm'
import ELDLog from './components/ELDLog'
import MapView from './components/MapView'
import RouteInstructions from './components/RouteInstructions'
import './index.css'

function App() {
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('map')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
        padding: '0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
            }}>🚛</div>
            <div>
              <h1 style={{
                color: 'white',
                fontSize: 'clamp(16px, 3vw, 22px)',
                fontWeight: '800',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}>ELD Trip Planner</h1>
              <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '400',
              }}>FMCSA Compliant Hours of Service</p>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.1)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div style={{
              width: '8px', height: '8px',
              background: '#10b981',
              borderRadius: '50%',
              boxShadow: '0 0 6px #10b981',
            }}></div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '500' }}>
              70hr/8-day Rule Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px)',
        display: 'grid',
        gridTemplateColumns: tripData ? 'minmax(320px, 400px) 1fr' : '1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left Panel - Form */}
        <div style={{ position: tripData ? 'sticky' : 'static', top: '90px' }}>
          <TripForm
            onTripCalculated={setTripData}
            loading={loading}
            setLoading={setLoading}
          />
        </div>

        {/* Right Panel - Results */}
        {tripData && (
          <div className="fade-in">
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'white',
              padding: '6px',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              marginBottom: '20px',
              border: '1px solid var(--gray-200)',
            }}>
              {[
                { id: 'map', label: '🗺️ Route Map', },
                { id: 'logs', label: '📋 ELD Logs', },
                { id: 'instructions', label: '🧭 Route Instructions' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    background: activeTab === tab.id
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--gray-500)',
                    boxShadow: activeTab === tab.id ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Trip Summary */}
            <div style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--gray-200)',
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--gray-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '16px',
              }}>Trip Summary</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}>
                {[
                  { label: 'Total Days', value: tripData.total_days, icon: '📅', color: '#2563eb' },
                  { label: 'Est. Distance', value: tripData.route?.estimated_distance || 'N/A', icon: '📍', color: '#7c3aed' },
                  { label: 'From', value: tripData.route?.current_location || 'N/A', icon: '🚛', color: '#059669' },
                  { label: 'To', value: tripData.route?.dropoff_location || 'N/A', icon: '🏁', color: '#dc2626' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    border: '1px solid var(--gray-200)',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: item.color,
                      marginBottom: '2px',
                      wordBreak: 'break-word',
                    }}>{item.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '500' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'map' && <MapView tripData={tripData} />}
            {activeTab === 'logs' && <ELDLog tripData={tripData} />}
            {activeTab === 'instructions' && <RouteInstructions tripData={tripData} />}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        background: 'var(--gray-900)',
        color: 'var(--gray-400)',
        textAlign: 'center',
        padding: '20px',
        fontSize: '13px',
        marginTop: '40px',
      }}>
        <p>ELD Trip Planner • FMCSA HOS Compliant • 70hr/8-day Property Carrier Rules</p>
      </footer>
    </div>
  )
}

export default App