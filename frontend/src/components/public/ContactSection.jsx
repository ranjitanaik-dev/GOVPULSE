import React, { useState } from 'react'
import axios from 'axios'
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Building,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react'

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await axios.post('/api/contact', formData)
      setResult(res.data)
      setFormData({
        name: '',
        email: '',
        organization: '',
        subject: '',
        message: '',
      })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || d).join(', '))
      } else {
        setError(detail || 'Unable to submit enquiry. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopyTicket = (ticketId) => {
    navigator.clipboard.writeText(ticketId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="contact" style={{ padding: '5rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 9999,
              color: '#065f46',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            <Mail size={14} /> Official Helpline & Communications
          </div>
          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: '#0f2a4a',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            Contact & Institutional Inquiries
          </h2>
          <p
            style={{
              maxWidth: 720,
              margin: '0 auto',
              fontSize: '1.05rem',
              color: '#475569',
              lineHeight: 1.65,
            }}
          >
            Reach out to the GovPulse Karnataka monitoring cell for technical questions, dataset
            clarifications, or academic research collaborations.
          </p>
        </div>

        {/* Content Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {/* Institutional Info Column */}
          <div>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                padding: '2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                marginBottom: '1.5rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#0f2a4a',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Building size={20} color="#1e3a8a" /> Rural Governance Monitoring Cell
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem' }}>
                  <MapPin size={20} color="#1e3a8a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f2a4a' }}>Physical Secretariat</div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>
                      Department of Rural Development & Panchayat Raj (RDPR)<br />
                      3rd Floor, M.S. Building, Dr. B.R. Ambedkar Veedhi<br />
                      Bengaluru, Karnataka - 560001
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem' }}>
                  <Phone size={20} color="#1e3a8a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f2a4a' }}>Official Helplines</div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>
                      <strong>1800-425-8666</strong> (MGNREGA Toll-Free)<br />
                      <strong>1902 / 1912</strong> (Karnataka Janasnehi Helpline)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem' }}>
                  <Mail size={20} color="#1e3a8a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f2a4a' }}>Electronic Correspondence</div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>
                      support.govpulse@karnataka.gov.in<br />
                      rdpr-monitoring.ka@nic.in
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem' }}>
                  <Clock size={20} color="#1e3a8a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f2a4a' }}>Operational Timings</div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>
                      Monday – Friday: 10:00 AM to 5:30 PM IST<br />
                      Closed on Second Saturdays, Sundays & Gazetted Holidays
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note on Grievance Redressal */}
            <div
              style={{
                background: '#eff6ff',
                borderRadius: 12,
                border: '1px solid #bfdbfe',
                padding: '1.25rem',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <HelpCircle size={20} color="#1e3a8a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>Citizen Grievance Notice:</strong> For personal wage delays, job card issuance grievances,
                or housing sanction appeals, citizens are advised to approach their respective Gram Panchayat
                Panchayat Development Officer (PDO) or use the state’s official <em>e-Swathu / IPGRS</em> portal.
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                padding: '2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f2a4a', marginBottom: '0.5rem' }}>
                Submit an Official Inquiry
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Please fill in your details below. You will receive an official inquiry ticket ID for tracking.
              </p>

              {result && (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 10,
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <CheckCircle2 size={18} /> Inquiry Successfully Registered
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#047857', marginBottom: '0.75rem' }}>
                    {result.message}
                  </p>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#ffffff',
                      border: '1px solid #6ee7b7',
                      borderRadius: 6,
                      padding: '0.4rem 0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>Ticket ID:</span>
                    <strong style={{ fontSize: '0.9rem', color: '#064e3b', letterSpacing: '0.05em' }}>
                      {result.ticket_id}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopyTicket(result.ticket_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 2,
                      }}
                      title="Copy Ticket ID"
                    >
                      {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Email Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. ramesh.k@karnataka.gov.in"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Department / District / Institution <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    placeholder="e.g. Zilla Panchayat Mysore / IIM Bangalore"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Subject of Inquiry <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Inquiry regarding PMAY-G DBT account validation metric"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Detailed Message <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Describe your inquiry, requested dataset verification, or technical question..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    background: loading ? '#94a3b8' : '#1e3a8a',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.925rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 10px rgba(30, 58, 138, 0.25)',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? 'Registering Inquiry...' : (
                    <>
                      <Send size={16} /> Submit Official Inquiry
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
