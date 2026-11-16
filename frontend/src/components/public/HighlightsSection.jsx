import React from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  BarChart2,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function HighlightsSection() {
  const { isAuthenticated } = useAuth()

  const highlights = [
    {
      icon: Layers,
      title: '31 Karnataka Districts Unified',
      desc: 'Seamless aggregation across every Zilla and Gram Panchayat, enabling holistic state-level overviews down to granular district comparisons.',
      tag: 'Statewide Coverage',
    },
    {
      icon: BarChart2,
      title: 'Standardized Scheme Indices',
      desc: 'Multi-parameter scoring combining physical work completion rates, financial expenditure ratios, and inclusion indicators into intuitive district rankings.',
      tag: 'Analytics & Indices',
    },
    {
      icon: Zap,
      title: 'Direct Benefit Transfer (DBT) Tracking',
      desc: 'Specialized oversight of Aadhaar-seeded accounts and DBT verification (currently 72.11% in PMAY-G) to prevent delivery leakages and delays.',
      tag: 'Benefit Accountability',
    },
    {
      icon: AlertTriangle,
      title: 'Automated Bottleneck Alerts',
      desc: 'Intelligent alerting identifies districts experiencing stalled house construction, sluggish wage generation, or sanction-to-work mismatches.',
      tag: 'Early Warning',
    },
    {
      icon: History,
      title: 'Permanent Administrative Audit Trail',
      desc: 'Every dataset registered and validated on the platform carries cryptographic provenance and full audit logging for complete accountability.',
      tag: 'Integrity by Design',
    },
    {
      icon: Lock,
      title: 'Role-Based Officer Portal',
      desc: 'Restricted administrative workspace empowering authenticated departmental officers to upload datasets, review anomalies, and export reports.',
      tag: 'Secure Access',
    },
  ]

  return (
    <section id="highlights" style={{ padding: '5rem 1.5rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 9999,
              color: '#1e3a8a',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={14} /> Platform Architecture
          </div>
          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: '#0f2a4a',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            Platform Highlights & Monitoring Capabilities
          </h2>
          <p
            style={{
              maxWidth: 720,
              margin: '0 auto',
              fontSize: '1.05rem',
              color: '#475569',
              lineHeight: 1.65,
            }}
          >
            GovPulse combines public clarity with administrative rigour, delivering the insights required
            to evaluate rural development progress across Karnataka.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
            marginBottom: '3.5rem',
          }}
        >
          {highlights.map((h, i) => {
            const Icon = h.icon
            return (
              <div
                key={i}
                style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: '2rem',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.boxShadow = '0 10px 20px -3px rgba(0,0,0,0.06)'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: '#1e3a8a12',
                      color: '#1e3a8a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#0284c7',
                      background: '#e0f2fe',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 4,
                    }}
                  >
                    {h.tag}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f2a4a', marginBottom: '0.6rem' }}>
                  {h.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, flex: 1 }}>
                  {h.desc}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f2a4a 0%, #1e3a8a 100%)',
            borderRadius: 16,
            padding: '2.5rem 2rem',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 12px 25px -4px rgba(15, 42, 74, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Tricolour Line */}
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

          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Are You an Authorized Monitoring Officer?
          </h3>
          <p style={{ maxWidth: 640, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Access the restricted Officer Portal to explore micro-level district analytics, upload latest scheme
            progress reports, and export compliance audits.
          </p>

          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1.75rem',
              background: '#FF9933',
              color: '#0f2a4a',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(255, 153, 51, 0.4)',
              transition: 'transform 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = '#f59e0b'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = '#FF9933'
            }}
          >
            {isAuthenticated ? 'Open Officer Dashboard' : 'Official Officer Login'} <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
