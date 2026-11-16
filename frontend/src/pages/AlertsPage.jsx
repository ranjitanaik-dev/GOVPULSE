import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  FileDown,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    badgeBg: '#fee2e2',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    badgeBg: '#fef3c7',
  },
  info: {
    label: 'Informational',
    icon: Info,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    badgeBg: '#e0f2fe',
  },
}

function classifyAlert(alert) {
  const type = alert.type || ''
  const msg = (alert.message || '').toLowerCase()

  if (type === 'validation_error' || msg.includes('low achievement') || msg.includes('<50%') || msg.includes('failed')) {
    return 'critical'
  }
  if (type === 'data_warning' || msg.includes('needs attention') || msg.includes('50–79%') || msg.includes('disparity')) {
    return 'warning'
  }
  return 'info'
}

export default function AlertsPage() {
  const [alertsData, setAlertsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [schemeFilter, setSchemeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIndex, setExpandedIndex] = useState(null)

  useEffect(() => {
    analyticsAPI.alerts(schemeFilter || undefined)
      .then((r) => setAlertsData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [schemeFilter])

  const alertsList = useMemo(() => {
    return alertsData?.alerts || []
  }, [alertsData])

  // Count summaries
  const counts = useMemo(() => {
    let crit = 0
    let warn = 0
    let info = 0
    alertsList.forEach((a) => {
      const s = classifyAlert(a)
      if (s === 'critical') crit++
      else if (s === 'warning') warn++
      else info++
    })
    return { total: alertsList.length, critical: crit, warning: warn, info }
  }, [alertsList])

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alertsList.filter((a) => {
      const severity = classifyAlert(a)
      if (severityFilter !== 'all' && severity !== severityFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const text = `${a.message || ''} ${a.scheme_id || ''} ${a.type || ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [alertsList, severityFilter, searchQuery])

  if (loading) return <LoadingSpinner message="Scanning performance thresholds and alerts..." />

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2a4a 0%, #1e3a8a 100%)',
          borderRadius: 14,
          padding: '2rem 2.25rem',
          color: '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(15, 42, 74, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Tricolour Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)',
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.55rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 6,
                  color: '#fca5a5',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <ShieldAlert size={12} /> Compliance & Threshold Engine
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Automated Quality & Lag Monitoring
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
              Governance & Performance Alerts
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: 0, maxWidth: 680 }}>
              Real-time exception identification across 31 Karnataka districts. Benchmarks: ≥80% On Track,
              50–79% Needs Attention, and &lt;50% Low Achievement with data quality checks.
            </p>
          </div>

          <Link
            to="/reports"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.15rem',
              background: '#ffffff',
              color: '#0f2a4a',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <FileDown size={15} /> Export Alerts Report
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          onClick={() => setSeverityFilter('all')}
          style={{
            background: severityFilter === 'all' ? '#eff6ff' : '#ffffff',
            borderRadius: 10,
            border: severityFilter === 'all' ? '2px solid #1e3a8a' : '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Active Alerts
            </span>
            <Bell size={18} color="#1e3a8a" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f2a4a', marginTop: 4 }}>
            {counts.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
            Across all monitored schemes
          </div>
        </div>

        <div
          onClick={() => setSeverityFilter('critical')}
          style={{
            background: severityFilter === 'critical' ? '#fef2f2' : '#ffffff',
            borderRadius: 10,
            border: severityFilter === 'critical' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
              Critical Lags (&lt;50%)
            </span>
            <AlertCircle size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            {counts.critical}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2 }}>
            Requires priority departmental action
          </div>
        </div>

        <div
          onClick={() => setSeverityFilter('warning')}
          style={{
            background: severityFilter === 'warning' ? '#fffbeb' : '#ffffff',
            borderRadius: 10,
            border: severityFilter === 'warning' ? '2px solid #d97706' : '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
              Attention Needed (50-79%)
            </span>
            <AlertTriangle size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {counts.warning}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: 2 }}>
            Pace acceleration recommended
          </div>
        </div>

        <div
          onClick={() => setSeverityFilter('info')}
          style={{
            background: severityFilter === 'info' ? '#f0f9ff' : '#ffffff',
            borderRadius: 10,
            border: severityFilter === 'info' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
              Informational Notices
            </span>
            <Info size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            {counts.info}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 2 }}>
            Data quality & reporting updates
          </div>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Scheme Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: '', label: 'All Schemes' },
            { id: 'mgnrega', label: 'MGNREGA' },
            { id: 'pmayg', label: 'PMAY-G' },
            { id: 'pmjay', label: 'PM-JAY' },
            { id: 'udise', label: 'UDISE+' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSchemeFilter(s.id)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 6,
                border: schemeFilter === s.id ? '1px solid #1e3a8a' : '1px solid #cbd5e1',
                background: schemeFilter === s.id ? '#1e3a8a' : '#ffffff',
                color: schemeFilter === s.id ? '#ffffff' : '#334155',
                fontSize: '0.78rem',
                fontWeight: schemeFilter === s.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts or districts..."
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2rem',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Alerts Compact Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {!filteredAlerts.length ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <EmptyState
              title="No alerts match the active criteria"
              message="All monitored indicators within selected parameters are currently conforming to expected performance baselines."
            />
          </div>
        ) : (
          filteredAlerts.map((a, i) => {
            const severity = classifyAlert(a)
            const cfg = SEVERITY_CONFIG[severity]
            const Icon = cfg.icon
            const isExpanded = expandedIndex === i

            return (
              <div
                key={i}
                style={{
                  background: '#ffffff',
                  borderRadius: 10,
                  border: `1px solid ${cfg.border}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {/* Main Card Strip */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    gap: '1rem',
                    cursor: 'pointer',
                    background: isExpanded ? cfg.bg : '#ffffff',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: cfg.badgeBg,
                      color: cfg.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: cfg.color,
                          background: cfg.badgeBg,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                        }}
                      >
                        {cfg.label}
                      </span>
                      {a.scheme_id && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#1e3a8a',
                            background: '#eff6ff',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 4,
                          }}
                        >
                          {a.scheme_id.toUpperCase()}
                        </span>
                      )}
                      {a.dataset_id && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Dataset #{a.dataset_id}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f2a4a' }}>
                      {a.message}
                    </div>
                  </div>

                  <div style={{ color: '#94a3b8' }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Expandable Diagnostic Panel */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      background: '#f8fafc',
                      borderTop: `1px solid ${cfg.border}`,
                      fontSize: '0.8rem',
                      color: '#475569',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Alert Category</span>
                        <strong style={{ color: '#0f2a4a' }}>{a.type ? a.type.replace(/_/g, ' ').toUpperCase() : 'GENERAL PERFORMANCE'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Affected Territory</span>
                        <strong style={{ color: '#0f2a4a' }}>Karnataka State / Monitored Districts</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Resolution Guidance</span>
                        <strong style={{ color: '#0f2a4a' }}>Review Zilla Panchayat shelf-of-works & muster roll verification</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <Link
                        to="/analytics"
                        style={{
                          fontSize: '0.75rem',
                          color: '#1e3a8a',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <span>Investigate in Analytics</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
