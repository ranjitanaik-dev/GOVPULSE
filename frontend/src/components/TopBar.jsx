import React from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, ExternalLink } from 'lucide-react'

const PAGE_TITLES = {
  '/': 'Dashboard Overview',
  '/datasets': 'Dataset Management',
  '/schemes': 'Scheme Explorer',
  '/analytics': 'Performance Analytics',
  '/alerts': 'Performance Alerts',
  '/reports': 'Reports',
}

export default function TopBar({ onToggleSidebar }) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] || 'GovPulse'

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      right: 0,
      left: 0,
      height: 'var(--topbar-height)',
      background: 'white',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      zIndex: 90,
      gap: '1rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <button onClick={onToggleSidebar} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-muted)', display: 'flex',
        alignItems: 'center', padding: '0.5rem',
      }}>
        <Menu size={20} />
      </button>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>
          Government & Public Policy Performance Monitoring System
        </p>
      </div>
      <a
        href="http://localhost:8000/docs"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.75rem', color: 'var(--color-primary)',
          textDecoration: 'none', fontWeight: 500,
          padding: '0.4rem 0.8rem', border: '1px solid #dbeafe',
          borderRadius: 6, background: '#eff6ff',
        }}
      >
        <ExternalLink size={12} /> API Docs
      </a>
    </header>
  )
}
