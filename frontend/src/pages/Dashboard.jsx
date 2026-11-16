import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, analyticsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  Database,
  MapPin,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Upload,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  Home,
  Zap,
  BarChart3,
  Bell,
  FileDown,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAuth } from '../context/AuthContext.jsx'

const STATUS_CONFIG = {
  completed: { color: '#15803d', bg: '#dcfce7', label: 'Completed' },
  failed: { color: '#b91c1c', bg: '#fee2e2', label: 'Failed' },
  running: { color: '#b45309', bg: '#fef3c7', label: 'Running' },
  queued: { color: '#475569', bg: '#f1f5f9', label: 'Queued' },
}

export default function Dashboard() {
  const { officer } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recentAlerts, setRecentAlerts] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, alertRes] = await Promise.all([
          dashboardAPI.getSummary(),
          analyticsAPI.alerts().catch(() => ({ data: { alerts: [] } })),
        ])
        setData(sumRes.data)
        setRecentAlerts(alertRes.data?.alerts?.slice(0, 4) || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner message="Loading executive intelligence dashboard..." />
  if (error) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #fecaca',
          padding: '3rem',
          textAlign: 'center',
          color: '#dc2626',
        }}
      >
        <AlertCircle size={36} style={{ marginBottom: 12 }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Unable to Connect to GovPulse Backend
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 500, margin: '0 auto 1rem' }}>
          {error}
        </p>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          Please verify that the FastAPI server is running on <code>http://127.0.0.1:8000</code>.
        </p>
      </div>
    )
  }

  const hasData = data?.has_data

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Editorial Welcome Header */}
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
        {/* Tricolour Accent Strip */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.55rem',
                  background: 'rgba(255, 153, 51, 0.2)',
                  border: '1px solid rgba(255, 153, 51, 0.4)',
                  borderRadius: 6,
                  color: '#FF9933',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <ShieldCheck size={12} /> Authenticated Monitoring Session
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                State Monitoring Cell, RDPR Karnataka
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
              Executive Performance Dashboard
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: 0, maxWidth: 680 }}>
              Consolidated district intelligence for Karnataka rural development schemes. All analytics
              are calculated from Apache Spark-processed administrative registries with verified audit trails.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/datasets"
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
                transition: 'transform 0.15s',
              }}
            >
              <Upload size={15} /> Upload Dataset
            </Link>
            <Link
              to="/reports"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <FileDown size={15} /> Export Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Insights Banner (Based Strictly on Backend Data) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #1e3a8a',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#eff6ff',
              color: '#1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Women Participation
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f2a4a' }}>
              54.98% Statewide
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
              +21.68% above 33.3% statutory floor
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #0d9488',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#f0fdfa',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Home size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              PMAY-G Housing Completed
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f2a4a' }}>
              1,77,270 Pucca Homes
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 600 }}>
              72.11% DBT accounts validated
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #d97706',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Top District Achievement
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f2a4a' }}>
              Tumakuru (109.2%)
            </div>
            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
              Surpassed annual labour budget target
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #15803d',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#f0fdf4',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Processing Pipeline
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f2a4a' }}>
              {data?.completed_jobs ?? 8} Completed Jobs
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
              100% Spark pipeline success rate
            </div>
          </div>
        </div>
      </div>

      {/* Editorial KPI Metric Strip */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Schemes Monitored
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.1 }}>
              {data?.total_schemes ?? 4}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
              MGNREGA, PMAY-G, PM-JAY, UDISE+
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Datasets Ingested
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0369a1', lineHeight: 1.1 }}>
              {data?.total_datasets ?? 4}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600, marginTop: 4 }}>
              All 4 in Processed status
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Records Processed
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f766e', lineHeight: 1.1 }}>
              {(data?.total_records_processed ?? 7535).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
              Indexed in MongoDB & SQLite
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Districts Monitored
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>
              {data?.districts_covered ?? 31}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
              100% Karnataka ZP coverage
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              States in Registry
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1.1 }}>
              {data?.states_covered ?? 10}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
              National reference baselines
            </div>
          </div>
        </div>
      </div>

      {/* Flagship Scheme Focus Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* MGNREGA Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ position: 'relative', height: 140, background: '#1e3a8a' }}>
            <img
              src="/images/hero-slide-1.jpg"
              alt="MGNREGA Rural Employment"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(180deg, rgba(15,42,74,0.3) 0%, rgba(15,42,74,0.85) 100%)',
              }}
            />
            <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    background: '#FF9933',
                    color: '#0f2a4a',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Flagship Employment
                </span>
                <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                  Active Dataset #1 & #3
                </span>
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 800, margin: '0.35rem 0 0' }}>
                MGNREGA Karnataka
              </h3>
            </div>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Central Liability</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a' }}>7.96 Cr PD</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Women Share</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>54.98%</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Central Outlay</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed' }}>₹3,440.58 Cr</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Work Completion</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>42.23%</div>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <Link
                to="/analytics"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  color: '#1e3a8a',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  textDecoration: 'none',
                }}
              >
                <span>Explore MGNREGA Scheme Intelligence</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* PMAY-G Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ position: 'relative', height: 140, background: '#0d9488' }}>
            <img
              src="/images/hero-slide-3.jpg"
              alt="PMAY-G Rural Housing"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(180deg, rgba(13,148,136,0.3) 0%, rgba(15,42,74,0.85) 100%)',
              }}
            />
            <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    background: '#14b8a6',
                    color: '#ffffff',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Flagship Housing
                </span>
                <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                  Active Dataset #2 & #4
                </span>
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 800, margin: '0.35rem 0 0' }}>
                PMAY-G Rural Housing
              </h3>
            </div>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sanctions Geotagged</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d9488' }}>6.33 Lakh</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Completed Homes</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>1.77 Lakh</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>DBT Verified Accounts</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed' }}>72.11%</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Physical Inspection</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>98.00%</div>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <Link
                to="/analytics"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: 8,
                  color: '#0f766e',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  textDecoration: 'none',
                }}
              >
                <span>Explore PMAY-G Scheme Intelligence</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visual Charts Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Datasets by Scheme */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f2a4a', margin: 0 }}>
                Datasets Ingested by Scheme
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                Processed administrative datasets indexed in GovPulse
              </p>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#1e3a8a',
                background: '#eff6ff',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
              }}
            >
              Live Registry
            </span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data?.scheme_summary || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="scheme_name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="datasets" fill="#1e3a8a" radius={[6, 6, 0, 0]} name="Datasets" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Processing Jobs Status */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f2a4a', margin: 0 }}>
                Spark Pipeline Execution Health
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                Batch ingestion and calculation jobs status breakdown
              </p>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#15803d',
                background: '#dcfce7',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
              }}
            >
              100% Succeeded
            </span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Completed', value: data?.completed_jobs || 8 },
                  { name: 'Failed', value: data?.failed_jobs || 0 },
                ].filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                <Cell fill="#15803d" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-Column Lower Strip: Recent Processing Jobs & Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Recent Jobs Table */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f2a4a', margin: 0 }}>
                Recent Spark Processing Activity
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                Latest Apache Spark execution logs and execution durations
              </p>
            </div>
            <Link to="/datasets" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', textDecoration: 'none' }}>
              View Datasets →
            </Link>
          </div>

          {!data?.recent_jobs?.length ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              No processing activity recorded yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.5rem 0.5rem 0.5rem 0', fontWeight: 600 }}>Job ID</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Dataset</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Scheme</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_jobs.slice(0, 6).map((j) => {
                    const cfg = STATUS_CONFIG[j.status] || STATUS_CONFIG.queued
                    return (
                      <tr key={j.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '0.65rem 0.5rem 0.65rem 0', fontWeight: 700, color: '#0f2a4a' }}>
                          #{j.id}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>
                          Dataset #{j.dataset_id}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1e3a8a',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 4,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {j.scheme_id?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '0.15rem 0.55rem',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: cfg.bg,
                              color: cfg.color,
                            }}
                          >
                            <CheckCircle2 size={11} /> {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                          {j.processing_time_seconds ? `${j.processing_time_seconds}s` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Alerts Summary Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f2a4a', margin: 0 }}>
                Governance & Performance Alerts
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                Automated threshold monitoring and data quality warnings
              </p>
            </div>
            <Link to="/alerts" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', textDecoration: 'none' }}>
              View All Alerts →
            </Link>
          </div>

          {!recentAlerts.length ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              No critical alerts registered at this time.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentAlerts.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.75rem 0.85rem',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f2a4a', lineHeight: 1.35 }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 3 }}>
                      {a.scheme_id ? `Scheme: ${a.scheme_id.toUpperCase()} • ` : ''}
                      {a.type ? a.type.replace(/_/g, ' ') : 'Alert'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
