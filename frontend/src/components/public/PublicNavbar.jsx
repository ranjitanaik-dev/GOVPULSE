import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Menu, X, ExternalLink, ChevronRight } from 'lucide-react'

export default function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      const headerOffset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%',
      backgroundColor: '#ffffff',
      boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.3s ease',
    }}>
      {/* Indian National Tricolour Top Accent Line */}
      <div style={{ height: '4px', width: '100%', display: 'flex' }}>
        <div style={{ flex: 1, backgroundColor: '#FF9933' }} />
        <div style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
        <div style={{ flex: 1, backgroundColor: '#138808' }} />
      </div>

      {/* Official Top Citizen Service Bar */}
      <div style={{
        backgroundColor: '#0b192c',
        color: '#e2e8f0',
        padding: '0.35rem 1.5rem',
        fontSize: '0.72rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }} className="top-citizen-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="top-citizen-left">
          <span style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#f8fafc' }} className="top-citizen-primary">
            भारत सरकार | Government of India Initiative
          </span>
          <span style={{ color: '#64748b' }} className="top-citizen-divider">•</span>
          <span style={{ color: '#94a3b8' }} className="top-citizen-middle">
            सार्वजनिक योजना अनुश्रवण प्रणाली | Public Scheme Performance Monitoring System
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="top-citizen-right">
          <span style={{ color: '#94a3b8' }}>Academic Research & Governance Analytics</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: isScrolled ? '0.75rem 1.5rem' : '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'padding 0.3s ease',
      }} className="main-nav-container">
        {/* Brand / Logo */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            textDecoration: 'none',
          }}
          className="brand-link"
        >
          <img
            src="/images/govpulse-emblem.png"
            alt="GovPulse Civic Emblem"
            style={{
              height: '46px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }}
            className="brand-logo-img"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <span style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#0f294a',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }} className="brand-title">
                GovPulse
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid #bae6fd',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Portal
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#64748b',
              marginTop: '0.15rem',
            }} className="brand-subtitle">
              Government Performance Monitoring System
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{
          display: 'none',
          alignItems: 'center',
          gap: '1.75rem',
        }} className="desktop-nav">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={navLinkStyle}
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection('schemes')}
            style={navLinkStyle}
          >
            Government Schemes
          </button>
          <button
            onClick={() => scrollToSection('about')}
            style={navLinkStyle}
          >
            About
          </button>
          <button
            onClick={() => scrollToSection('values')}
            style={navLinkStyle}
          >
            Public Values
          </button>
          <button
            onClick={() => scrollToSection('highlights')}
            style={navLinkStyle}
          >
            Highlights
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            style={navLinkStyle}
          >
            Contact
          </button>
        </nav>

        {/* Officer Login CTA Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/login')}
            className="desktop-officer-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid #172554',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1e40af'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.35)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#1e3a8a'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 58, 138, 0.25)'
            }}
          >
            <Shield size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
            <span>Officer Login</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#0f172a',
              cursor: 'pointer',
            }}
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }}>
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            style={mobileNavLinkStyle}
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection('schemes')}
            style={mobileNavLinkStyle}
          >
            Government Schemes
          </button>
          <button
            onClick={() => scrollToSection('about')}
            style={mobileNavLinkStyle}
          >
            About GovPulse
          </button>
          <button
            onClick={() => scrollToSection('values')}
            style={mobileNavLinkStyle}
          >
            Public Values
          </button>
          <button
            onClick={() => scrollToSection('highlights')}
            style={mobileNavLinkStyle}
          >
            Platform Highlights
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            style={mobileNavLinkStyle}
          >
            Contact & Support
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              navigate('/login')
            }}
            style={{
              ...mobileNavLinkStyle,
              color: '#1e3a8a',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
            }}
          >
            <Shield size={16} color="#1e3a8a" />
            <span>Officer Login (Authorized Access)</span>
          </button>
        </div>
      )}

      {/* Inline styles for media query responsive display */}
      <style>{`
        @media (min-width: 860px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-toggle {
            display: none !important;
          }
          .desktop-officer-btn {
            display: inline-flex !important;
          }
        }
        @media (max-width: 859px) {
          .desktop-officer-btn {
            display: none !important;
          }
          .top-citizen-middle,
          .top-citizen-divider,
          .top-citizen-right {
            display: none !important;
          }
          .top-citizen-bar {
            padding: 0.3rem 1rem !important;
            font-size: 0.68rem !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .main-nav-container {
            padding: 0.65rem 1rem !important;
          }
          .brand-title {
            font-size: 1.25rem !important;
          }
          .brand-logo-img {
            height: 38px !important;
          }
          .brand-subtitle {
            font-size: 0.65rem !important;
          }
        }
        @media (max-width: 480px) {
          .brand-subtitle {
            font-size: 0.6rem !important;
            max-width: 190px !important;
            line-height: 1.15 !important;
          }
          .top-citizen-bar {
            font-size: 0.62rem !important;
            padding: 0.25rem 0.5rem !important;
          }
        }
      `}</style>
    </header>
  )
}

const navLinkStyle = {
  background: 'none',
  border: 'none',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#334155',
  cursor: 'pointer',
  padding: '0.25rem 0',
  position: 'relative',
  transition: 'color 0.2s ease',
}

const mobileNavLinkStyle = {
  background: 'none',
  border: 'none',
  textAlign: 'left',
  fontSize: '0.95rem',
  fontWeight: 500,
  color: '#1e293b',
  cursor: 'pointer',
  padding: '0.4rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}
