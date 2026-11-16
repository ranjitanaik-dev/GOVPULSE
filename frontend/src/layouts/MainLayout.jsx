import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import TopBar from '../components/TopBar.jsx'

export default function MainLayout() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  const location = useLocation()

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-close sidebar on route change on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)', width: '100%', overflowX: 'hidden' }}>
      {/* Mobile Drawer Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 42, 74, 0.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 95,
          }}
        />
      )}

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} isMobile={isMobile} />

      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : (sidebarOpen ? 'var(--sidebar-width)' : '72px'),
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 72px)',
        overflowX: 'hidden',
      }}>
        <TopBar onToggleSidebar={() => setSidebarOpen(o => !o)} isMobile={isMobile} />
        <main style={{
          flex: 1,
          padding: isMobile ? '1rem 0.75rem' : '1.5rem',
          marginTop: 'var(--topbar-height)',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
