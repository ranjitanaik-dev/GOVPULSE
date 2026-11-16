import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Building2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function OfficerLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, loading: authLoading } = useAuth()

  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // If already logged in, redirect to dashboard or requested page
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(officerId.trim(), password)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid Officer ID or Password. Please verify and retry.')
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a192f 0%, #0f2a4a 50%, #1e3a8a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
      }}
    >
      {/* Tricolour Top Line */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)',
          zIndex: 100,
        }}
      />

      {/* Return to Public Portal */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
            padding: '0.5rem 0.85rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          <ArrowLeft size={16} /> Return to Public Portal
        </Link>
      </div>

      {/* Login Box */}
      <div
        style={{
          maxWidth: 460,
          width: '100%',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        {/* Header Header */}
        <div
          style={{
            padding: '2rem 2rem 1.5rem',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <img
              src="/images/govpulse-seal.png"
              alt="GovPulse Emblem"
              style={{ width: 44, height: 44, objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2a4a', lineHeight: 1.1 }}>
                GovPulse
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                Karnataka Rural Governance
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              background: '#eff6ff',
              borderRadius: 9999,
              color: '#1e3a8a',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.5rem',
            }}
          >
            <ShieldCheck size={13} /> Officer Authentication Portal
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f2a4a', margin: '0 0 0.35rem' }}>
            Official Administrative Sign-In
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Enter your Departmental Officer ID and secure credentials
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                color: '#991b1b',
                fontSize: '0.825rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Authentication Failed:</strong> {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Departmental Officer ID
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="e.g. OFFICER-KA-001"
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.6rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                    letterSpacing: '0.02em',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Officer Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.6rem 0.7rem 2.6rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                fontSize: '0.8rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ borderRadius: 4 }}
                />
                Remember Officer ID
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.8rem',
                background: submitting ? '#94a3b8' : '#1e3a8a',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
                transition: 'background 0.2s',
              }}
            >
              {submitting ? 'Authenticating Officer...' : (
                <>
                  <KeyRound size={18} /> Sign In to Officer Workspace
                </>
              )}
            </button>
          </form>

          {/* Institutional Warning */}
          <div
            style={{
              marginTop: '1.5rem',
              fontSize: '0.72rem',
              color: '#94a3b8',
              lineHeight: 1.5,
              textAlign: 'center',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1rem',
            }}
          >
            <strong>Official Personnel Notice:</strong> Public user self-registration is disabled. If you require
            administrative credentials, contact the RDPR Monitoring Cell at{' '}
            <span style={{ color: '#475569' }}>support.govpulse@karnataka.gov.in</span>.
          </div>
        </div>
      </div>

      {/* Academic Disclaimer Footer */}
      <div
        style={{
          marginTop: '2rem',
          maxWidth: 500,
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#94a3b8',
          lineHeight: 1.5,
        }}
      >
        GovPulse Karnataka is an independent academic research project. Officer authentication is designed
        for role-based governance monitoring demonstration.
      </div>
    </div>
  )
}
