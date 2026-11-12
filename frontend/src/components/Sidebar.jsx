import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Database, BarChart3, TrendingUp,
  Bell, FileDown, ChevronLeft, ChevronRight, Activity
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/schemes', label: 'Scheme Explorer', icon: Activity },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileDown },
]

export default function Sidebar({ open, onToggle }) {
  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: open ? 'var(--sidebar-width)' : '72px',
      background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 60%, #1d4ed8 100%)',
      boxShadow: '2px 0 12px rgba(0,0,0,0.12)',
      transition: 'width 0.3s ease',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: open ? '0 1.25rem' : '0 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        gap: '0.75rem',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1rem', fontWeight: 700, color: 'white',
        }}>GP</div>
        {open && (
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>GovPulse</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', marginTop: 1 }}>Performance Monitor</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.75rem',
              borderRadius: 8,
              color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              textDecoration: 'none',
              marginBottom: '0.25rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem',
            })}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {open && label}
          </NavLink>
        ))}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          margin: '0.75rem',
          padding: '0.5rem',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </aside>
  )
}
