import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ShieldCheck } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#1e3a8a',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'rgba(30, 58, 138, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}>
          <ShieldCheck size={32} color="#1e3a8a" />
        </div>
        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#0f172a' }}>
          Verifying Officer Authorization...
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
          GovPulse Secure Administrative Gateway
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
