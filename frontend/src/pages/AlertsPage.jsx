import React, { useEffect, useState } from 'react'
import { analyticsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AlertBadge from '../components/AlertBadge.jsx'
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react'

const ALERT_ICONS = {
  validation_error: { icon: AlertTriangle, color: '#ef4444' },
  data_warning: { icon: Info, color: '#f59e0b' },
  performance_alert: { icon: Bell, color: '#1d4ed8' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [schemeFilter, setSchemeFilter] = useState('')

  useEffect(() => {
    analyticsAPI.alerts(schemeFilter || undefined)
      .then(r => setAlerts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [schemeFilter])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Performance Alerts</h2>
        <p className="page-subtitle">
          Automatically identified data quality issues and underperforming districts.
          Thresholds: ≥80% = On Track, 50–79% = Needs Attention, &lt;50% = Low Achievement.
          <em style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Note: These are project-defined thresholds, not official government classifications.</em>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['', 'mgnrega', 'pmayg', 'pmjay', 'udise'].map(s => (
          <button key={s} onClick={() => setSchemeFilter(s)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
              background: schemeFilter === s ? '#1e3a8a' : '#f1f5f9',
              color: schemeFilter === s ? 'white' : 'var(--color-text)',
              cursor: 'pointer', fontSize: '0.8rem',
            }}>
            {s || 'All Schemes'}
          </button>
        ))}
      </div>

      <div className="card">
        {!alerts?.alerts?.length ? (
          <EmptyState title="No alerts" message="No data quality or performance alerts found. Process a dataset to generate alerts." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.alerts.map((a, i) => {
              const cfg = ALERT_ICONS[a.type] || ALERT_ICONS.data_warning
              const Icon = cfg.icon
              return (
                <div key={i} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  padding: '0.875rem', borderRadius: 8,
                  background: cfg.color + '0d',
                  border: `1px solid ${cfg.color}33`,
                }}>
                  <Icon size={16} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{a.message}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                      Type: {a.type.replace(/_/g, ' ')} {a.scheme_id ? `| Scheme: ${a.scheme_id.toUpperCase()}` : ''} {a.dataset_id ? `| Dataset #${a.dataset_id}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
