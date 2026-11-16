import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PublicNavbar from '../components/public/PublicNavbar.jsx'
import HeroCarousel from '../components/public/HeroCarousel.jsx'
import SchemesSection from '../components/public/SchemesSection.jsx'
import AboutSection from '../components/public/AboutSection.jsx'
import ValuesSection from '../components/public/ValuesSection.jsx'
import HighlightsSection from '../components/public/HighlightsSection.jsx'
import ContactSection from '../components/public/ContactSection.jsx'
import PublicFooter from '../components/public/PublicFooter.jsx'

export default function HomePage() {
  const location = useLocation()

  // Handle hash scrolling on navigation
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''))
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } else {
      window.scrollTo(0, 0)
    }
  }, [location])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <PublicNavbar />
      <main style={{ flex: 1 }}>
        <div id="home">
          <HeroCarousel />
        </div>
        <SchemesSection />
        <AboutSection />
        <ValuesSection />
        <HighlightsSection />
        <ContactSection />
      </main>
      <PublicFooter />
    </div>
  )
}
