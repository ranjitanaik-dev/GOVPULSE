import React, { useState } from 'react'
import { CheckCircle2, TrendingUp, Users, Building, AlertCircle, ArrowRight, ShieldCheck, X } from 'lucide-react'

const SCHEMES = [
  {
    id: 'mgnrega',
    name: 'Mahatma Gandhi NREGA',
    fullName: 'Mahatma Gandhi National Rural Employment Guarantee Act',
    ministry: 'Ministry of Rural Development, Government of India',
    image: '/images/hero-slide-1.jpg',
    logo: '/images/scheme-mgnrega.png',
    status: 'Active Performance Monitoring',
    description:
      'Provides a statutory guarantee of at least 100 days of wage employment per financial year to rural households whose adult members volunteer to perform unskilled manual work, focusing on soil and water conservation and livelihood security.',
    indicators: [
      { label: 'Person-days Generated', value: '7.96 Cr', detail: '88.41% Agreed Budget Achievement' },
      { label: 'Women Participation', value: '54.98%', detail: 'Surpassing 33.3% statutory mandate' },
      { label: 'Financial Expenditure', value: '₹3,440.58 Cr', detail: 'Wage & material allocation' },
      { label: 'Districts Monitored', value: '31 Districts', detail: 'Statewide Karnataka coverage' },
    ],
    features: [
      'Demand-driven statutory right to work',
      'Direct wage deposit into Jan Dhan / Aadhaar-linked accounts',
      'Asset creation in water harvesting, afforestation, and rural roads',
      'Social audit oversight at the Gram Panchayat level',
    ],
  },
  {
    id: 'pmayg',
    name: 'PMAY - Gramin',
    fullName: 'Pradhan Mantri Awaas Yojana - Gramin',
    ministry: 'Ministry of Rural Development, Government of India',
    image: '/images/hero-slide-4.png',
    logo: '/images/scheme-pmayg.png',
    status: 'Active Performance Monitoring',
    description:
      'Enables homeless rural families and those living in dilapidated houses to construct dignified, pucca dwelling units equipped with hygienic cooking spaces, power connectivity, and basic sanitation.',
    indicators: [
      { label: 'Sanctions Geotagged', value: '6,33,782', detail: 'Official AwaasSoft tracking' },
      { label: 'Completed Homes', value: '1,77,270', detail: 'Quality-verified dwelling units' },
      { label: 'Account Verification', value: '72.11%', detail: '4.57 Lakh DBT-ready bank accounts' },
      { label: 'Inspection Coverage', value: '98.00%', detail: '1.73 Lakh physically verified' },
    ],
    features: [
      'Multi-tranche DBT disbursements tied to construction stages',
      'Mandatory geotagged spatial photo verification at each milestone',
      'Convergence with Swachh Bharat for toilet construction',
      'Direct credit verification to prevent intermediate leakage',
    ],
  },
]

export default function SchemesSection() {
  const [selectedScheme, setSelectedScheme] = useState(null)

  return (
    <section
      id="schemes"
      style={{
        padding: '5.5rem 1.5rem',
        backgroundColor: '#f8fafc',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 4rem auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}>
            Public Welfare Initiatives
          </div>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: '#0f294a',
            margin: '0 0 1rem 0',
            letterSpacing: '-0.02em',
          }}>
            Government Schemes & Public Welfare
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#64748b',
            lineHeight: 1.6,
            margin: 0,
          }}>
            GovPulse structures, analyzes, and benchmarks implementation data from verified public portals. Below are the core welfare programs currently tracked in the system.
          </p>
        </div>

        {/* Schemes Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2rem',
        }}>
          {SCHEMES.map((scheme) => (
            <div
              key={scheme.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Scheme Image Banner */}
              <div style={{ position: 'relative', height: '210px', width: '100%', overflow: 'hidden' }}>
                <img
                  src={scheme.image}
                  alt={scheme.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,23,42,0.7) 100%)',
                }} />

                {/* Scheme Badge / Logo Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    padding: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img
                      src={scheme.logo}
                      alt={scheme.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <h3 style={{
                      margin: 0,
                      color: '#ffffff',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    }}>
                      {scheme.name}
                    </h3>
                    <span style={{
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                    }}>
                      {scheme.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {scheme.ministry}
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#475569',
                  lineHeight: 1.55,
                  marginBottom: '1.5rem',
                  flex: 1,
                }}>
                  {scheme.description}
                </p>

                {/* Verified Metrics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  padding: '1rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                }}>
                  {scheme.indicators.map((ind, i) => (
                    <div key={i}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                        {ind.label}
                      </div>
                      <div style={{ fontSize: '1.15rem', color: '#0f294a', fontWeight: 700, marginTop: '0.1rem' }}>
                        {ind.value}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#0284c7', marginTop: '0.1rem' }}>
                        {ind.detail}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setSelectedScheme(scheme)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #1e3a8a',
                    borderRadius: '8px',
                    color: '#1e3a8a',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e3a8a'
                    e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = '#1e3a8a'
                  }}
                >
                  <span>Explore Scheme Overview</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedScheme && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <button
              onClick={() => setSelectedScheme(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <img
                src={selectedScheme.logo}
                alt={selectedScheme.name}
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f294a', margin: 0 }}>
                  {selectedScheme.fullName}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 500 }}>
                  {selectedScheme.ministry}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {selectedScheme.description}
            </p>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              Key Operational Milestones & Indicators
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {selectedScheme.indicators.map((ind, i) => (
                <div key={i} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{ind.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f294a' }}>{ind.value}</div>
                  <div style={{ fontSize: '0.7rem', color: '#0284c7' }}>{ind.detail}</div>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              Core Welfare Features Monitored
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
              {selectedScheme.features.map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div style={{
              padding: '0.85rem',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              fontSize: '0.78rem',
              color: '#1e40af',
            }}>
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Administrative Access Note:</strong> Detailed block-level raw logs, district benchmarking matrices, and analytical reports are accessible through the secure <strong>Officer Login</strong>.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
