import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Shield, ArrowDown, Pause, Play } from 'lucide-react'

const SLIDES = [
  {
    id: 1,
    image: '/images/hero-slide-1.jpg',
    title: 'Mahatma Gandhi NREGA: Rural Employment Guarantee',
    caption: 'Safeguarding rural livelihoods and empowering communities through statutory wage employment across Karnataka districts.',
    badge: 'Employment & Rural Livelihoods',
  },
  {
    id: 2,
    image: '/images/hero-slide-2.jpg',
    title: 'Mahila Kayakotsava: Women-Led Rural Progress',
    caption: 'Celebrating over 4.37 Crore women person-days generated — championing active female participation and social security.',
    badge: 'Social Inclusion & Gender Equity',
  },
  {
    id: 3,
    image: '/images/hero-slide-3.jpg',
    title: 'Pradhan Mantri Awaas Yojana - Gramin',
    caption: 'Transforming rural lives by enabling dignified, pucca shelter with geotagged inspection and DBT milestone tracking.',
    badge: 'Rural Housing Transformation',
  },
  {
    id: 4,
    image: '/images/hero-slide-4.png',
    title: 'Dignified Homes & Verified Physical Progress',
    caption: 'Tracking over 1.77 Lakh completed rural homes across verified stages of construction and basic amenity provision.',
    badge: 'Physical Verification & Quality',
  },
  {
    id: 5,
    image: '/images/hero-slide-5.jpg',
    title: 'Direct Benefit Transfers & Public Governance',
    caption: 'Ensuring transparent, zero-leakage financial disbursement directly to verified beneficiary bank accounts.',
    badge: 'Public Accountability & DBT',
  },
]

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const navigate = useNavigate()
  const timerRef = useRef(null)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(nextSlide, 6000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, nextSlide])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const headerOffset = 90
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section
      id="hero"
      aria-label="Portal Introduction & Visual Showcase"
      className="hero-carousel-section"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '620px',
        height: '75vh',
        maxHeight: '760px',
        backgroundColor: '#071527',
        overflow: 'hidden',
        color: '#ffffff',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Slideshow Layer */}
      {SLIDES.map((slide, index) => {
        const isActive = index === currentSlide
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: isActive ? 1 : 0,
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 35%',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                transition: 'transform 7s ease-out',
              }}
            />
          </div>
        )
      })}

      {/* Subtle Premium Government Overlay: Multi-layer gradient ensures maximum readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(8, 22, 44, 0.94) 0%, rgba(11, 31, 60, 0.82) 45%, rgba(15, 23, 42, 0.70) 100%)',
        zIndex: 2,
        pointerEvents: 'none',
      }} />

      {/* Decorative Indian Tricolour Vertical Ribbon on Left Margin */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '5px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 3,
      }}>
        <div style={{ flex: 1, backgroundColor: '#FF9933' }} />
        <div style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
        <div style={{ flex: 1, backgroundColor: '#138808' }} />
      </div>

      {/* Hero Foreground Content */}
      <div
        className="hero-content-wrap"
        style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '1280px',
          height: '100%',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '780px' }}>
          {/* Active Slide Theme Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#fbbf24',
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#fbbf24',
              display: 'inline-block',
            }} />
            {SLIDES[currentSlide].badge}
          </div>

          {/* Large Hero Headline */}
          <h1
            className="hero-headline"
            style={{
              fontSize: 'clamp(2.1rem, 4.5vw, 3.4rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              color: '#ffffff',
              margin: '0 0 1.25rem 0',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
            }}
          >
            Transparent Insights. <br />
            <span style={{
              background: 'linear-gradient(90deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Stronger Public Services.
            </span>
          </h1>

          {/* Supporting Public Description */}
          <p
            className="hero-description"
            style={{
              fontSize: 'clamp(1rem, 1.4vw, 1.18rem)',
              fontWeight: 400,
              lineHeight: 1.6,
              color: '#cbd5e1',
              margin: '0 0 2rem 0',
              maxWidth: '680px',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            GovPulse brings greater visibility to government welfare initiatives by structuring official scheme data into clear, verifiable performance metrics for authorized administration and public accountability.
          </p>

          {/* Call-to-Action Buttons */}
          <div
            className="hero-cta-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => scrollToSection('schemes')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                backgroundColor: '#FF9933',
                color: '#0f172a',
                padding: '0.85rem 1.65rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 153, 51, 0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f59e0b'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 153, 51, 0.45)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#FF9933'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(255, 153, 51, 0.35)'
              }}
            >
              <span>Explore Government Schemes</span>
              <ArrowDown size={16} />
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#f8fafc',
                padding: '0.85rem 1.65rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.45)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
              }}
            >
              <Shield size={18} color="#fbbf24" />
              <span>Officer Login</span>
            </button>
          </div>
        </div>

        {/* Carousel Bottom Control Bar */}
        <div
          className="hero-bottom-controls"
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '2rem',
            right: '2rem',
            maxWidth: '1280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 4,
          }}
        >
          {/* Active Slide Caption Highlight */}
          <div style={{
            display: 'none',
            fontSize: '0.85rem',
            color: '#94a3b8',
            maxWidth: '500px',
          }} className="hero-slide-caption">
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
              {SLIDES[currentSlide].title}:
            </span>{' '}
            {SLIDES[currentSlide].caption}
          </div>

          {/* Controls: Prev, Next, Play/Pause, Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
            {/* Pause/Play Toggle */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              style={carouselBtnStyle}
              title={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
              aria-label={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>

            {/* Previous Button */}
            <button
              onClick={prevSlide}
              style={carouselBtnStyle}
              title="Previous slide"
              aria-label="Previous slide"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Slide Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0.25rem' }}>
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  style={{
                    width: idx === currentSlide ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: idx === currentSlide ? '#FF9933' : 'rgba(255, 255, 255, 0.35)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  title={`Go to slide ${idx + 1}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={nextSlide}
              style={carouselBtnStyle}
              title="Next slide"
              aria-label="Next slide"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .hero-slide-caption {
            display: block !important;
          }
        }
        @media (max-width: 859px) {
          .hero-carousel-section {
            min-height: calc(100svh - 85px) !important;
            height: calc(100svh - 85px) !important;
            max-height: none !important;
          }
          .hero-content-wrap {
            padding: 1.5rem 1.25rem 5rem 1.25rem !important;
            justify-content: center !important;
          }
          .hero-headline {
            font-size: clamp(1.65rem, 6.5vw, 2.25rem) !important;
            margin-bottom: 0.85rem !important;
          }
          .hero-description {
            font-size: 0.88rem !important;
            line-height: 1.55 !important;
            margin-bottom: 1.35rem !important;
          }
          .hero-cta-group {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.65rem !important;
          }
          .hero-cta-group button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.75rem 1.25rem !important;
            font-size: 0.9rem !important;
          }
          .hero-bottom-controls {
            bottom: 1.25rem !important;
            left: 1.25rem !important;
            right: 1.25rem !important;
          }
        }
      `}</style>
    </section>
  )
}

const carouselBtnStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.12)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
  transition: 'background 0.2s ease',
}
