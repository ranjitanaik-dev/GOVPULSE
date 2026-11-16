import React, { useState, useEffect } from 'react'
import { reportsAPI, analyticsAPI, dashboardAPI, datasetsAPI } from '../services/api.js'
import {
  FileText,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Building2,
  Users,
  Home,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  X,
} from 'lucide-react'
import { generateGovPulsePDF } from '../utils/pdfGenerator.js'
import { useAuth } from '../context/AuthContext.jsx'

const REPORT_CATALOG = [
  {
    id: 'overall',
    title: 'Overall GovPulse Performance Report',
    category: 'Executive Summary',
    desc: 'Comprehensive multi-scheme governance review covering MGNREGA employment, PMAY-G housing, and state-wide indicators.',
    scheme: 'all',
    icon: Building2,
    badge: 'Comprehensive',
    color: '#1e3a8a',
  },
  {
    id: 'mgnrega',
    title: 'MGNREGA Rural Employment Performance Report',
    category: 'Employment Guarantee',
    desc: 'Deep-dive analysis of central liability person-days, labour budget targets, women’s participation (54.98%), and expenditure.',
    scheme: 'mgnrega',
    icon: Users,
    badge: 'Flagship Employment',
    color: '#0d9488',
  },
  {
    id: 'pmayg',
    title: 'PMAY-G Rural Housing Performance Report',
    category: 'Rural Shelter',
    desc: 'Oversight of 6.33L sanctions, 1.77L completed homes, 4-stage installment velocity, and 72.11% DBT account validation.',
    scheme: 'pmayg',
    icon: Home,
    badge: 'Flagship Housing',
    color: '#0284c7',
  },
  {
    id: 'district',
    title: 'District-Wise Performance & Disparity Report',
    category: 'Regional Equity',
    desc: 'Granular 31-district ranking and disparity benchmarks identifying high-performing districts vs areas requiring intervention.',
    scheme: 'mgnrega',
    icon: MapPin,
    badge: '31 Districts',
    color: '#d97706',
  },
  {
    id: 'datasets',
    title: 'Dataset Processing & Data Quality Audit',
    category: 'Data Provenance',
    desc: 'Complete audit trail of ingested datasets, record validation matrices, Apache Spark job runtimes, and Parquet metadata.',
    scheme: 'all',
    icon: Layers,
    badge: 'Audit & Provenance',
    color: '#15803d',
  },
  {
    id: 'alerts',
    title: 'Governance Alerts & Compliance Audit',
    category: 'Compliance',
    desc: 'Summary of automated quality warnings, low-achievement alerts (<50%), and delayed milestone notices across schemes.',
    scheme: 'all',
    icon: AlertCircle,
    badge: 'Compliance',
    color: '#dc2626',
  },
]

export default function ReportsPage() {
  const { officer } = useAuth()
  const [selectedReportId, setSelectedReportId] = useState('overall')
  const [scheme, setScheme] = useState('mgnrega')
  const [reportingYear, setReportingYear] = useState('2023-24')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState('')

  // Backend Data Sources for Reports
  const [summaryData, setSummaryData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [mgnregaData, setMgnregaData] = useState(null)
  const [pmaygData, setPmaygData] = useState(null)
  const [alertsData, setAlertsData] = useState([])
  const [datasetsData, setDatasetsData] = useState([])

  useEffect(() => {
    let isMounted = true
    Promise.all([
      dashboardAPI.getSummary().catch(() => ({ data: {} })),
      analyticsAPI.scheme('mgnrega').catch(() => ({ data: {} })),
      analyticsAPI.scheme('pmayg').catch(() => ({ data: {} })),
      analyticsAPI.alerts().catch(() => ({ data: { alerts: [] } })),
      datasetsAPI.list().catch(() => ({ data: [] })),
    ]).then(([sRes, mRes, pRes, alRes, dRes]) => {
      if (!isMounted) return
      setSummaryData(sRes.data)
      setMgnregaData(mRes.data)
      setPmaygData(pRes.data)
      setAnalyticsData(scheme === 'pmayg' ? pRes.data : mRes.data)
      setAlertsData(alRes.data?.alerts || [])
      setDatasetsData(dRes.data || [])
    })

    return () => { isMounted = false }
  }, [scheme])

  const selectedReport = REPORT_CATALOG.find((r) => r.id === selectedReportId) || REPORT_CATALOG[0]

  // Direct CSV Export (Preserves original backend functionality)
  const handleDownloadCsv = () => {
    let resultType = 'summary'
    if (selectedReportId === 'district') resultType = 'district_rankings'
    else if (selectedReportId === 'mgnrega' || selectedReportId === 'pmayg') resultType = 'state_performance'
    else if (selectedReportId === 'datasets') resultType = 'summary'

    const url = reportsAPI.exportCsv(scheme, resultType)
    window.open(url, '_blank')
  }

  // PDF Generation via jsPDF
  const handleDownloadPdf = async () => {
    setGenerating(true)
    setDownloadSuccess('')
    try {
      const filename = await generateGovPulsePDF({
        reportType: selectedReportId,
        schemeId: scheme,
        reportingYear,
        officerName: officer?.name || 'Smt. Rajeshwari N.',
        officerRole: officer?.designation || 'State Monitoring Officer',
        summaryData,
        analyticsData: scheme === 'pmayg' ? pmaygData : mgnregaData,
        mgnregaAnalytics: mgnregaData,
        pmaygAnalytics: pmaygData,
        alertsData,
        datasetsData,
      })
      setDownloadSuccess(`Report generated successfully: ${filename}`)
      setTimeout(() => setDownloadSuccess(''), 6000)
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2a4a 0%, #1e3a8a 100%)',
          borderRadius: 14,
          padding: '2rem 2.25rem',
          color: '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(15, 42, 74, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Tricolour Accent Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)',
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.55rem',
                  background: 'rgba(255, 153, 51, 0.2)',
                  border: '1px solid rgba(255, 153, 51, 0.4)',
                  borderRadius: 6,
                  color: '#FF9933',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <ShieldCheck size={12} /> Official Publications Division
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Department of Rural Development & Panchayat Raj (RDPR)
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
              Governance Performance Reports & PDF Centre
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: 0, maxWidth: 680 }}>
              Generate, preview, and download statutory performance reports for Karnataka rural schemes.
              Formatted in accordance with official government publication guidelines with vector tables,
              provenance metadata, and cryptographic audit hashes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPreviewOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <Eye size={15} /> Preview Report
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={generating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.25rem',
                background: '#FF9933',
                color: '#0f2a4a',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(255, 153, 51, 0.35)',
                transition: 'all 0.15s',
              }}
            >
              <Download size={16} /> {generating ? 'Compiling PDF...' : 'Download PDF Report'}
            </button>
          </div>
        </div>
      </div>

      {downloadSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#065f46',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Configuration & Selection Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          alignItems: 'flex-end',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
            Selected Report Document
          </label>
          <select
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0f2a4a',
              outline: 'none',
              background: '#f8fafc',
            }}
          >
            {REPORT_CATALOG.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
            Primary Focus Scheme
          </label>
          <select
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0f2a4a',
              outline: 'none',
              background: '#f8fafc',
            }}
          >
            <option value="mgnrega">MGNREGA — Rural Employment Guarantee</option>
            <option value="pmayg">PMAY-G — Pradhan Mantri Awaas Yojana</option>
            <option value="pmjay">PM-JAY — Ayushman Bharat Healthcare</option>
            <option value="udise">UDISE+ — Unified School Education</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
            Reporting Financial Year
          </label>
          <select
            value={reportingYear}
            onChange={(e) => setReportingYear(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0f2a4a',
              outline: 'none',
              background: '#f8fafc',
            }}
          >
            <option value="2023-24">FY 2023-24 (Audited Close)</option>
            <option value="2022-23">FY 2022-23 (Historical)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleDownloadCsv}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.65rem 0.85rem',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            title="Download Raw Aggregated Data in CSV Format"
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.65rem 0.85rem',
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title="Print Document directly via Browser"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Report Catalog Cards */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2a4a', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
          Available Official Performance Reports
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {REPORT_CATALOG.map((r) => {
            const Icon = r.icon
            const isSelected = selectedReportId === r.id
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: isSelected ? '2px solid #1e3a8a' : '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: isSelected ? '0 8px 20px -3px rgba(30, 58, 138, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.15s',
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: '#FF9933',
                      borderRadius: '12px 12px 0 0',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: `${r.color}15`,
                      color: r.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: r.color,
                      background: `${r.color}10`,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 4,
                    }}
                  >
                    {r.badge}
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                  {r.category}
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f2a4a', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {r.title}
                </h4>
                <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.55, flex: 1, marginBottom: '1.25rem' }}>
                  {r.desc}
                </p>

                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#1e3a8a' : '#94a3b8' }}>
                    {isSelected ? 'Currently Selected' : 'Click to Select'}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#1e3a8a',
                    }}
                  >
                    <span>Configure</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive In-Page Report Preview Section */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a', background: '#eff6ff', padding: '0.2rem 0.55rem', borderRadius: 4, textTransform: 'uppercase', marginBottom: 4 }}>
              Document Verification Preview
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f2a4a', margin: 0 }}>
              {selectedReport.title}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
              Standardized administrative preview based on live processed Spark datasets
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={generating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                background: '#1e3a8a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={15} /> {generating ? 'Generating...' : 'Download PDF Document'}
            </button>
            <button
              onClick={handleDownloadCsv}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                background: '#ffffff',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Paper-styled Mock Document Container */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '2rem',
            position: 'relative',
          }}
        >
          {/* Mock Header Tricolour */}
          <div
            style={{
              height: 3,
              background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)',
              marginBottom: '1.25rem',
            }}
          />

          <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f2a4a' }}>
              GOVERNMENT OF KARNATAKA — RURAL DEVELOPMENT & PANCHAYAT RAJ DEPARTMENT
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', marginTop: 4 }}>
              {selectedReport.title.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
              Reporting Financial Year: {reportingYear} • Ref: GP-REP-2026-STATUTORY • Prepared for: {officer?.designation || 'State Monitoring Officer'}
            </div>
          </div>

          {/* Section 1: Executive Overview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f2a4a', marginBottom: '0.5rem' }}>
              1. Executive Performance Highlights
            </h4>
            <div style={{ fontSize: '0.825rem', color: '#334155', lineHeight: 1.6 }}>
              Under the audited governance records for FY {reportingYear}, Karnataka monitored 31 districts with
              complete Zilla Panchayat coverage. MGNREGA delivered <strong>7.96 Crore Central Liability Person-Days</strong>{' '}
              with an expenditure of <strong>₹3,440.58 Crore</strong>. Women’s participation achieved{' '}
              <strong style={{ color: '#15803d' }}>54.98%</strong>, surpassing the statutory minimum. Concurrently,
              PMAY-G completed <strong>1,77,270 rural homes</strong> with <strong>72.11% DBT account verification</strong>.
            </div>
          </div>

          {/* Section 2: Indicator Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f2a4a', marginBottom: '0.5rem' }}>
              2. Core Statutory Performance Matrix
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Scheme</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Key Verified Indicator</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Reported Metric</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Statutory Benchmark</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>MGNREGA</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Central Liability Person-Days</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>7.96 Crore PD</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>9.00 Crore PD Target</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#15803d', fontWeight: 600 }}>88.41% Achieved</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>MGNREGA</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Women Workforce Participation</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#15803d' }}>54.98%</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>33.30% Statutory Floor</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#15803d', fontWeight: 600 }}>+21.68% Floor Delta</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>MGNREGA</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Total Central Wage Outlay</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>₹3,440.58 Crore</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>State Allocation</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#0284c7', fontWeight: 600 }}>Audited Close</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>PMAY-G</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Geotagged Sanctions</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>6,33,782 Houses</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Beneficiary Cohort</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#0d9488', fontWeight: 600 }}>100% Geotagged</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>PMAY-G</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>DBT Account Validation</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0284c7' }}>72.11% (4.57L Acc.)</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Aadhaar Bank Seed</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#15803d', fontWeight: 600 }}>Leakage-Free</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>PMAY-G</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Completed Pucca Houses</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>1,77,270 Houses</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>Sanction Velocity</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#0d9488', fontWeight: 600 }}>98.0% Inspected</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Data Provenance & Academic Disclaimer */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '1rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
            <strong style={{ color: '#0f2a4a' }}>Methodological & Academic Disclaimer:</strong> GovPulse is an
            independent academic project and is not an official Government of India website. All data is processed
            from public disclosures with cryptographic provenance to support evidence-based rural policy evaluation.
          </div>
        </div>
      </div>
    </div>
  )
}
