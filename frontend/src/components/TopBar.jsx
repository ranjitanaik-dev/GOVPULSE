import React, { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  ExternalLink,
  Globe,
  LogOut,
  Shield,
  Bell,
  ChevronDown,
  User,
  Settings,
  FileText,
  Search,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { analyticsAPI } from '../services/api.js'

const PAGE_METADATA = {
  '/dashboard': { title: 'Executive Intelligence Dashboard', category: 'Monitoring' },
  '/datasets': { title: 'Dataset & Ingestion Registry', category: 'Data Management' },
  '/schemes': { title: 'Flagship Scheme Directory', category: 'Programmes' },
  '/analytics': { title: 'Interactive Performance Intelligence', category: 'Analytics' },
  '/alerts': { title: 'Governance & Quality Alerts', category: 'Compliance' },
  '/reports': { title: 'Performance Reports & PDF Centre', category: 'Publications' },
}

export default function TopBar({ onToggleSidebar, isMobile }) {
  const { pathname } = useLocation()
  const { officer, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  const meta = PAGE_METADATA[pathname] || { title: 'GovPulse Officer Portal', category: 'Workspace' }

  useEffect(() => {
    let isMounted = true
    analyticsAPI.alerts()
      .then((res) => {
        if (!isMounted) return
        const count = res.data?.alerts?.length || 0
        setAlertCount(count)
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: 0,
        height: 'var(--topbar-height)',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 0.75rem' : '0 1.5rem',
        zIndex: 90,
        gap: isMobile ? '0.5rem' : '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Top Tricolour Stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)',
        }}
      />

      {/* Sidebar Toggle */}
      <button
        onClick={onToggleSidebar}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem',
          borderRadius: 8,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        title="Toggle Sidebar Navigation"
      >
        <Menu size={20} />
      </button>

            {/* Page Title & Breadcrumb */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF9933', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {meta.category}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>/</span>
          <h1 style={{ fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: 800, color: '#0f2a4a', margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.title}
          </h1>
        </div>
        {!isMobile && (
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>
            GovPulse Karnataka — Department of Rural Development & Panchayat Raj (RDPR)
          </p>
        )}
      </div>

      {/* Action Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexShrink: 0 }}>
        {/* Alerts Notification Button */}
        <Link
          to="/alerts"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 38,
            height: 38,
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          title={`${alertCount} Active Alerts`}
        >
          <Bell size={18} />
          {alertCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#dc2626',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
              }}
            >
              {alertCount}
            </span>
          )}
        </Link>

        {/* Public Portal Switcher */}
        {!isMobile && (
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: '#0f2a4a',
            textDecoration: 'none',
            fontWeight: 600,
            padding: '0.45rem 0.75rem',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#ffffff',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#eff6ff'
            e.currentTarget.style.borderColor = '#93c5fd'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff'
            e.currentTarget.style.borderColor = '#cbd5e1'
          }}
          title="Switch to Public Citizen Portal"
        >
          <Globe size={14} color="#1e3a8a" />
          <span>Public Portal</span>
        </Link>
        )}

        {/* API Documentation */}
        {!isMobile && (
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: '#1e3a8a',
            textDecoration: 'none',
            fontWeight: 600,
            padding: '0.45rem 0.75rem',
            border: '1px solid #dbeafe',
            borderRadius: 8,
            background: '#eff6ff',
          }}
        >
          <ExternalLink size={12} />
          <span>API Docs</span>
        </a>
        )}

        {/* Officer Profile & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#1e3a8a',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield size={14} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0f2a4a', lineHeight: 1.2 }}>
                {officer?.name || officer?.officer_id || 'State Officer'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                {officer?.designation || 'Monitoring Officer'}
              </div>
            </div>
            <ChevronDown size={14} color="#94a3b8" />
          </button>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: '115%',
                right: 0,
                width: 250,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '0.75rem',
                zIndex: 100,
              }}
            >
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f2a4a' }}>
                  {officer?.name || 'Smt. Rajeshwari N.'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {officer?.department || 'RDPR Department, Govt of Karnataka'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600, marginTop: 4 }}>
                  ID: {officer?.officer_id || 'OFFICER-KA-001'} (Authenticated)
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Link
                  to="/reports"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.5rem',
                    borderRadius: 6,
                    color: '#334155',
                    fontSize: '0.75rem',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <FileText size={14} color="#1e3a8a" />
                  <span>Download Officer Reports</span>
                </Link>

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.45rem 0.5rem',
                    borderRadius: 6,
                    background: '#fef2f2',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '0.25rem',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
