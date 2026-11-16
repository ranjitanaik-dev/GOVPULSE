import React from 'react'
import {
  Building2,
  Users,
  Compass,
  FileCheck2,
  ShieldCheck,
  Award,
  ArrowRight,
  Landmark,
  MapPin,
  TrendingUp,
} from 'lucide-react'

export default function AboutSection() {
  const pillars = [
    {
      icon: Users,
      title: 'Rural Livelihood Security',
      desc: 'Transparently tracking work demand, active job cards, women participation (54.98%), and direct wage disbursements under the Mahatma Gandhi NREGA across every gram panchayat.',
      badge: 'MGNREGA Focus',
      color: '#1e3a8a',
    },
    {
      icon: Building2,
      title: 'Dignified Rural Shelter',
      desc: 'Monitoring sanction-to-completion velocity, pucca house construction stages, and DBT account validation (72.11%) under Pradhan Mantri Awaas Yojana - Gramin.',
      badge: 'PMAY-G Focus',
      color: '#0d9488',
    },
    {
      icon: MapPin,
      title: 'District Equity & Balance',
      desc: 'Highlighting regional performance variations across all 31 Karnataka districts—from Bidar to Chamarajanagar—to support targeted developmental interventions.',
      badge: '31 Districts Covered',
      color: '#d97706',
    },
    {
      icon: ShieldCheck,
      title: 'Verifiable Public Trust',
      desc: 'Ensuring that every reported statistic conforms to standardized administrative records, with immutable audit verification and complete public disclosure fidelity.',
      badge: 'Audit Verified',
      color: '#15803d',
    },
  ]

  return (
    <section id="about" style={{ padding: '5rem 1.5rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section Header */}
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
            <Landmark size={14} /> Public Service Mandate
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
            About GovPulse Karnataka
          </h2>
          <p
            style={{
              maxWidth: 760,
              margin: '0 auto',
              fontSize: '1.05rem',
              color: '#475569',
              lineHeight: 1.65,
            }}
          >
            GovPulse is a dedicated governance monitoring and transparency initiative focused on tracking
            flagship rural development schemes across Karnataka. We bridge public administrative disclosures
            and actionable civic insights through unified, district-level performance analytics.
          </p>
        </div>

        {/* Two-Column Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            marginBottom: '4rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '2.5rem',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                background: '#e0f2fe',
                color: '#0369a1',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              Institutional Mission
            </div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0f2a4a',
                marginBottom: '1rem',
                lineHeight: 1.35,
              }}
            >
              Empowering Evidence-Based Governance for Rural Development
            </h3>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#475569',
                lineHeight: 1.7,
                marginBottom: '1.25rem',
              }}
            >
              Rural prosperity depends on the timely, equitable implementation of welfare programmes.
              GovPulse consolidates data across employment guarantee (MGNREGA) and rural housing
              (PMAY-G) to give policymakers, field officers, and citizens an unvarnished, accurate picture
              of grassroots progress.
            </p>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#475569',
                lineHeight: 1.7,
                marginBottom: '1.75rem',
              }}
            >
              By identifying districts with exemplary execution alongside those requiring administrative
              support, GovPulse fosters constructive peer-learning and helps direct public resources
              where they are needed most.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>31</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Districts Tracked</div>
              </div>
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0d9488' }}>2 Major</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Flagship Schemes</div>
              </div>
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>100%</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Public Disclosures</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                background: 'white',
                padding: '1.5rem',
                borderRadius: 16,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                maxWidth: 420,
                width: '100%',
              }}
            >
              <img
                src="/images/civic-buildings.png"
                alt="Civic Architecture & Governance"
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'contain',
                  marginBottom: '1.25rem',
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2a4a' }}>
                  Karnataka Rural Governance Monitor
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                  Department of Rural Development & Panchayat Raj (RDPR) Focus
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {pillars.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: '1.75rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 10px 20px -3px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `${item.color}15`,
                      color: item.color,
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
                      fontWeight: 700,
                      color: item.color,
                      background: `${item.color}10`,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f2a4a', marginBottom: '0.6rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, flex: 1 }}>
                  {item.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
