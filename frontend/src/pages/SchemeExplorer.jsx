import React, { useEffect, useState } from 'react'
import { schemesAPI, analyticsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const SCHEME_ICONS = {
  mgnrega: '🏗️', pmayg: '🏠', pmjay: '🏥', udise: '🎓'
}

function SchemeCard({ scheme, analytics }) {
  const summary = analytics?.summary || {}
  const statePerf = analytics?.state_performance || []
  const hasData = analytics?.has_data

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '2rem' }}>{SCHEME_ICONS[scheme.id] || '📊'}</span>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{scheme.name}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{scheme.ministry}</p>
        </div>
        <span className="chip chip-blue" style={{ marginLeft: 'auto' }}>{scheme.id.toUpperCase()}</span>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{scheme.description}</p>

      {!hasData ? (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No processed data for this scheme. Upload a dataset and run Spark processing.</p>
          <Link to="/datasets" className="btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>Upload Data</Link>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {scheme.supported_indicators?.map(ind => (
              <div key={ind} style={{
                background: summary[`total_${ind}`] !== undefined && summary[`total_${ind}`] !== null ? '#eff6ff' : '#f1f5f9',
                padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.78rem',
                color: summary[`total_${ind}`] !== undefined && summary[`total_${ind}`] !== null ? '#1d4ed8' : '#94a3b8',
              }}>
                <span style={{ fontWeight: 600 }}>{ind.replace(/_/g, ' ')}: </span>
                {summary[`total_${ind}`] !== undefined && summary[`total_${ind}`] !== null
                  ? Number(summary[`total_${ind}`]).toLocaleString('en-IN')
                  : 'Data not available'}
              </div>
            ))}
          </div>

          {statePerf.length > 0 && (
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>State Performance (Top 10)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statePerf.slice(0,10)} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="state" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="achievement_pct" fill="#1e3a8a" radius={[3, 3, 0, 0]} name="Achievement %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SchemeExplorer() {
  const [schemes, setSchemes] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const sRes = await schemesAPI.list()
        setSchemes(sRes.data)
        const analyticsData = {}
        await Promise.all(sRes.data.map(async s => {
          try {
            const aRes = await analyticsAPI.scheme(s.id)
            analyticsData[s.id] = aRes.data
          } catch {}
        }))
        setAnalytics(analyticsData)
      } catch (e) {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Scheme Explorer</h2>
        <p className="page-subtitle">Scheme-specific performance indicators and analytics</p>
      </div>
      {schemes.map(s => (
        <SchemeCard key={s.id} scheme={s} analytics={analytics[s.id]} />
      ))}
    </div>
  )
}
