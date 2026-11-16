import React from 'react'
import {
  Eye,
  ShieldCheck,
  HeartHandshake,
  Scale,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

export default function ValuesSection() {
  const values = [
    {
      icon: Eye,
      title: 'Transparency & Open Data',
      tagline: 'Public Information Belongs to Citizens',
      desc: 'Open governance begins with unvarnished, accessible information. All scheme performance indicators, financial outlays, and beneficiary milestones are presented without selective filtering or obscurity.',
      color: '#1e3a8a', // Deep Blue
      points: [
        'Unrestricted public access to scheme indicators',
        'Direct reporting against official administrative records',
        'Zero obfuscation of low-performing districts',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Accountability & Integrity',
      tagline: 'Standardized Administrative Fidelity',
      desc: 'Every figure displayed across the portal conforms to strict data validation standards. Complete audit logs and provenance tracking ensure that published reports maintain total administrative integrity.',
      color: '#15803d', // Green
      points: [
        'Tamper-evident verification standards',
        'Standardized central and state record validation',
        'Permanent audit logs for all administrative actions',
      ],
    },
    {
      icon: HeartHandshake,
      title: 'Citizen Welfare First',
      tagline: 'Human Impact Over Abstract Numbers',
      desc: 'Welfare schemes exist for living individuals and families. We prioritize metrics that reflect real-world human outcomes—women earning dignified wages, families moving into pucca homes, and seamless DBT transfers.',
      color: '#d97706', // Saffron / Ochre
      points: [
        'Priority tracking of women’s workforce participation',
        'Direct Benefit Transfer account validation status',
        'Focus on livable, completed rural houses',
      ],
    },
    {
      icon: Scale,
      title: 'District Equity & Balanced Growth',
      tagline: 'No Taluk or District Left Behind',
      desc: 'Karnataka’s progress is measured by the well-being of its least developed regions. GovPulse benchmarks indicators across Kalyana Karnataka, Kittur Karnataka, Coastal, and Southern regions to spotlight disparities.',
      color: '#7c3aed', // Purple
      points: [
        'Comparative district rankings across 31 districts',
        'Clear identification of implementation bottlenecks',
        'Guidance for targeted developmental allocations',
      ],
    },
    {
      icon: BrainCircuit,
      title: 'Evidence-Based Decisions',
      tagline: 'Actionable Insights for Public Servants',
      desc: 'By translating raw administrative registers into structured trend analyses and performance rankings, GovPulse equips district collectors and departmental officers with the tools needed for timely corrective action.',
      color: '#0284c7', // Cyan / Sky Blue
      points: [
        'Unified cross-scheme indicators',
        'Target-vs-achievement progress monitoring',
        'Actionable alerts for delayed works and sanctions',
      ],
    },
  ]

  return (
    <section id="values" style={{ padding: '5rem 1.5rem', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 9999,
              color: '#92400e',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={14} /> Guiding Principles
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
            Public-Service Values & Governance Philosophy
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
            GovPulse operates on core principles designed to foster trust between citizens and public
            institutions, ensuring that every rupee spent on rural welfare is clearly accounted for.
          </p>
        </div>

        {/* Values Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {values.map((v, idx) => {
            const Icon = v.icon
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                {/* Top Colored Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: v.color,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${v.color}15`,
                      color: v.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f2a4a', margin: 0 }}>
                      {v.title}
                    </h3>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: v.color, marginTop: 2 }}>
                      {v.tagline}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.65, marginBottom: '1.5rem', flex: 1 }}>
                  {v.desc}
                </p>

                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  {v.points.map((pt, pIdx) => (
                    <div key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <CheckCircle2 size={15} color={v.color} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                        {pt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
