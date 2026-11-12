import React, { useEffect, useState } from 'react'
import { analyticsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'

const SCHEMES = [
  { id: 'mgnrega', name: 'MGNREGA' },
  { id: 'pmayg', name: 'PMAY-G' },
  { id: 'pmjay', name: 'PM-JAY' },
  { id: 'udise', name: 'UDISE+' },
]

export default function PerformanceAnalytics() {
  const [scheme, setScheme] = useState('mgnrega')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [rankings, setRankings] = useState(null)
  const [trends, setTrends] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsAPI.scheme(scheme),
      analyticsAPI.rankings(scheme),
      analyticsAPI.trends(scheme),
    ]).then(([sRes, rRes, tRes]) => {
      setData(sRes.data)
      setRankings(rRes.data)
      setTrends(tRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [scheme])

  const statePerf = data?.state_performance || []
  const topDistricts = rankings?.top || []
  const bottomDistricts = rankings?.bottom || []
  const trendData = trends?.trends || []

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Performance Analytics</h2>
        <p className="page-subtitle">Scheme-wise, state-wise and district-wise performance analysis powered by Spark SQL</p>
      </div>

      {/* Scheme selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {SCHEMES.map(s => (
          <button key={s.id} onClick={() => setScheme(s.id)}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
              background: scheme === s.id ? '#1e3a8a' : '#f1f5f9',
              color: scheme === s.id ? 'white' : 'var(--color-text)',
              fontWeight: scheme === s.id ? 600 : 400,
              cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s',
            }}>
            {s.name}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : !data?.has_data ? (
        <div className="card">
          <EmptyState
            title={`No data for ${SCHEMES.find(s=>s.id===scheme)?.name}`}
            message="Upload and process a dataset for this scheme to view analytics."
            action={<Link to="/datasets" className="btn-primary">Go to Datasets</Link>}
          />
        </div>
      ) : (
        <>
          {/* Summary */}
          {data?.summary && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="section-title">Scheme Summary</h3>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {Object.entries(data.summary)
                  .filter(([k, v]) => typeof v === 'number' || v === null)
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <div key={k}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {k.replace(/_/g, ' ')}
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {v !== null ? (k.includes('pct') ? `${v}%` : Number(v).toLocaleString('en-IN')) : '—'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* State performance */}
          {statePerf.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="section-title">State-wise Achievement (%)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statePerf.slice(0,20)} margin={{ top: 0, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="state" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => v !== null ? `${v}%` : 'N/A'} />
                  <Bar dataKey="achievement_pct" fill="#1e3a8a" radius={[3,3,0,0]} name="Achievement %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* District rankings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 className="section-title" style={{ color: '#065f46' }}>🏆 Top 10 Districts</h3>
              {!topDistricts.length ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No district data available</p> : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>#</th><th>District</th><th>State</th><th>Achievement</th></tr></thead>
                    <tbody>
                      {topDistricts.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: '#065f46' }}>{i+1}</td>
                          <td>{d.district}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.state}</td>
                          <td><span className="badge-on-track">{d.achievement_pct?.toFixed(1)}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="section-title" style={{ color: '#991b1b' }}>⚠️ Bottom 10 Districts</h3>
              {!bottomDistricts.length ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No district data available</p> : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>#</th><th>District</th><th>State</th><th>Achievement</th></tr></thead>
                    <tbody>
                      {bottomDistricts.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: '#991b1b' }}>{i+1}</td>
                          <td>{d.district}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.state}</td>
                          <td><span className="badge-low-achievement">{d.achievement_pct?.toFixed(1)}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
