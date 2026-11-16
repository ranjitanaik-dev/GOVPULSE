import React from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Bell,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Globe,
  LogOut,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/schemes', label: 'Scheme Explorer', icon: Activity },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileDown },
]

export default function Sidebar({ open, onToggle, isMobile }) {
  const { officer, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: isMobile ? (open ? 0 : '-280px') : 0,
        bottom: 0,
        width: isMobile ? 'var(--sidebar-width)' : (open ? 'var(--sidebar-width)' : '72px'),
        background: 'linear-gradient(180deg, #0f2a4a 0%, #1e3a8a 60%, #1d4ed8 100%)',
        boxShadow: open ? '2px 0 16px rgba(0,0,0,0.2)' : 'none',
        transition: isMobile ? 'left 0.3s ease' : 'width 0.3s ease',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: open ? '0 1.25rem' : '0 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          gap: '0.75rem',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1rem',
            fontWeight: 800,
            color: 'white',
          }}
        >
          GP
        </div>
        {open && (
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>
              GovPulse
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', marginTop: 1 }}>
              Officer Monitoring Workspace
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.25rem 0.75rem 0.5rem',
            display: open ? 'block' : 'none',
          }}
        >
          Administrative Modules
        </div>

        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.75rem',
              borderRadius: 8,
              color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
              textDecoration: 'none',
              marginBottom: '0.25rem',
              transition: 'all 0.15s',
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

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            margin: '1rem 0 0.5rem',
            paddingTop: '0.75rem',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0.25rem 0.75rem 0.5rem',
              display: open ? 'block' : 'none',
            }}
          >
            Public View
          </div>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.75rem',
              borderRadius: 8,
              color: '#fde047',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'rgba(254, 224, 71, 0.08)',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
            title="Switch to Public Homepage"
          >
            <Globe size={18} style={{ flexShrink: 0 }} />
            {open && 'Public Homepage'}
          </Link>
        </div>
      </nav>

      {/* Officer Profile & Logout */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '0.75rem',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        {open && officer && (
          <div style={{ marginBottom: '0.75rem', padding: '0.25rem 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#86efac', fontSize: '0.7rem', fontWeight: 600 }}>
              <UserCheck size={13} /> Logged in as
            </div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {officer.name || officer.officer_id}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {officer.designation || 'State Officer'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleLogout}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: open ? 'flex-start' : 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            title="Sign out of Officer Workspace"
          >
            <LogOut size={16} />
            {open && 'Sign Out'}
          </button>

          <button
            onClick={onToggle}
            style={{
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
        </div>
      </div>
    </aside>
  )
}
