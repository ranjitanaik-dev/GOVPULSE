import React from 'react'
import { Link } from 'react-router-dom'
import {
  ExternalLink,
  ShieldAlert,
  ArrowUp,
  Heart,
  Landmark,
  FileText,
  Lock,
} from 'lucide-react'

export default function PublicFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer style={{ background: '#0a192f', color: '#cbd5e1', position: 'relative' }}>
      {/* Tricolour Accent Line */}
      <div
        style={{
          height: 4,
          width: '100%',
          background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%)',
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem 2rem' }}>
        {/* Main Footer Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Column 1: Identity */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <img
                src="/images/govpulse-seal.png"
                alt="GovPulse Seal"
                style={{ width: 44, height: 44, objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
                  GovPulse
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
                  Karnataka Rural Governance Monitor
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              A dedicated public monitoring and governance analytics portal tracking the implementation,
              expenditure, and citizen welfare velocity of flagship rural schemes across 31 Karnataka districts.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.6rem',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.75rem',
                color: '#e2e8f0',
              }}
            >
              <Landmark size={13} color="#FF9933" />
              <span>RDPR Karnataka Focus</span>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div>
            <h4
              style={{
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}
            >
              Quick Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Home Overview', href: '#home' },
                { label: 'Government Schemes', href: '#schemes' },
                { label: 'About the Portal', href: '#about' },
                { label: 'Governance Values', href: '#values' },
                { label: 'Platform Highlights', href: '#highlights' },
                { label: 'Contact & Helpline', href: '#contact' },
              ].map((item, idx) => (
                <li key={idx}>
                  <a
                    href={item.href}
                    style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '0.825rem',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/login"
                  style={{
                    color: '#FF9933',
                    textDecoration: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <Lock size={12} /> Officer Login Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Monitored Schemes */}
          <div>
            <h4
              style={{
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}
            >
              Monitored Schemes
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                  MGNREGA Karnataka
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                  7.96 Cr Central PD | 54.98% Women Workers
                </div>
              </li>
              <li>
                <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                  PMAY-G Rural Housing
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                  6.33L Sanctioned | 1.77L Completed Homes
                </div>
              </li>
              <li>
                <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                  Direct Benefit Transfer (DBT)
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                  72.11% Aadhaar Bank Account Verification
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Official Government Links */}
          <div>
            <h4
              style={{
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}
            >
              External Official Portals
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'nrega.nic.in (Central MGNREGA)', url: 'https://nrega.nic.in' },
                { label: 'pmayg.nic.in (AwaasSoft Portal)', url: 'https://pmayg.nic.in' },
                { label: 'rdpr.karnataka.gov.in (RDPR)', url: 'https://rdpr.karnataka.gov.in' },
                { label: 'karnataka.gov.in (Govt of Karnataka)', url: 'https://karnataka.gov.in' },
                { label: 'digitalindia.gov.in (Digital India)', url: 'https://digitalindia.gov.in' },
              ].map((site, sIdx) => (
                <li key={sIdx}>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <span>{site.label}</span>
                    <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Academic Disclaimer Box */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <ShieldAlert size={20} color="#FF9933" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            <strong style={{ color: '#FF9933' }}>Mandatory Academic Project Notice:</strong> GovPulse is an
            independent academic project and is not an official Government of India website. All scheme data
            presented is based on verified public disclosures and administrative reports for analytical research.
            GovPulse does not claim official ministerial authority or legal representation on behalf of any
            government agency.
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <div>
            © 2026 GovPulse Karnataka. Developed for public governance analytics and transparent monitoring.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button
              onClick={scrollToTop}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <span>Back to Top</span>
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
