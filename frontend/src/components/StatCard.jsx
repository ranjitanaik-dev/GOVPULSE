import React from 'react'

export default function StatCard({ label, value, icon: Icon, color = '#1e3a8a', trend, suffix = '' }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 4, background: color, borderRadius: '0 10px 10px 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
            {value !== null && value !== undefined
              ? (typeof value === 'number' ? value.toLocaleString('en-IN') : value) + suffix
              : '—'}
          </p>
          {trend && (
            <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 6 }}>{trend}</p>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: color + '1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} color={color} />
          </div>
        )}
      </div>
    </div>
  )
}
