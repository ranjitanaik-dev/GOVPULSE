import React, { useEffect, useState, useMemo } from 'react'
import { analyticsAPI, schemesAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Search, Filter, Download, RotateCcw, AlertTriangle, CheckCircle2,
  TrendingUp, Users, Hammer, DollarSign, Award, MapPin, Building, Info, ChevronRight,
  Home, Layers, ShieldCheck, Calendar, BookOpen, ExternalLink, BarChart3, Activity,
  Check, Eye, ArrowUpDown, ChevronDown, ChevronUp, Table as TableIcon, LayoutGrid, FileText
} from 'lucide-react'

const SCHEMES = [
  { id: 'mgnrega', name: 'MGNREGA', desc: 'Rural Employment Guarantee' },
  { id: 'pmayg', name: 'PMAY-G', desc: 'Pradhan Mantri Awaas Yojana' },
  { id: 'pmjay', name: 'PM-JAY', desc: 'Ayushman Bharat Healthcare' },
  { id: 'udise', name: 'UDISE+', desc: 'Unified School Education' },
]

const SCHEME_DETAILS = {
  mgnrega: {
    title: 'Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)',
    shortName: 'MGNREGA Karnataka',
    image: '/images/mgnrega-banner.jpg',
    logo: '/images/mgnrega-logo.png',
    category: 'Statutory Wage Employment',
    ministry: 'Ministry of Rural Development (MoRD) / RDPR Karnataka',
    objective: 'Provide at least 100 days of guaranteed wage employment per fiscal year to adult members of rural households willing to do unskilled manual work.',
    beneficiaries: 'Rural adult job-card holders seeking manual wage employment.',
    reportingPeriod: 'FY 2023-24 (Audited Close)',
    dataSource: 'Open Government Data (OGD) Platform India & Karnataka RDPR MIS (nrega.nic.in)',
    coverage: '31 Karnataka Districts (100% ZP Coverage)',
    keyHighlight: '7.96 Cr Central PD • 54.98% Women Workers • ₹3,440.58 Cr Outlay',
  },
  pmayg: {
    title: 'Pradhan Mantri Awaas Yojana - Gramin (PMAY-G)',
    shortName: 'PMAY-G Rural Housing',
    image: '/images/pmayg-banner.png',
    logo: '/images/pmayg-logo.png',
    category: 'Flagship Rural Housing & Shelter',
    ministry: 'Ministry of Rural Development (MoRD) / Govt. of Karnataka',
    objective: 'Provide an all-weather pucca house with basic amenities to homeless rural households and those living in kutcha or dilapidated structures.',
    beneficiaries: 'SECC 2011 and Awaas+ verified rural households.',
    reportingPeriod: 'FY 2023-24 (Cumulative Progress)',
    dataSource: 'AwaasSoft Portal (pmayg.nic.in) & Departmental Progress Report A.2',
    coverage: '31 Karnataka Districts (Statewide Rural Housing)',
    keyHighlight: '6.33L Sanctioned • 1.77L Completed • 72.11% DBT Verified',
  },
  pmjay: {
    title: 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
    shortName: 'PM-JAY Health Protection',
    image: '/images/hero-slide-5.jpg',
    logo: '/images/govpulse-seal.png',
    category: 'Universal Health Protection',
    ministry: 'National Health Authority (NHA) / Health & Family Welfare Karnataka',
    objective: 'Provide secondary and tertiary hospitalisation cover of up to ₹5 Lakh per eligible family per year.',
    beneficiaries: 'Bottom 40% vulnerable rural and urban families identified under SECC 2011.',
    reportingPeriod: 'FY 2023-24',
    dataSource: 'National Health Authority (NHA) Registry',
    coverage: 'Statewide Health Network',
    keyHighlight: 'Universal Secondary & Tertiary Health Insurance Registry',
  },
  udise: {
    title: 'Unified District Information System for Education Plus (UDISE+)',
    shortName: 'UDISE+ School Education',
    image: '/images/civic-buildings.png',
    logo: '/images/govpulse-emblem.png',
    category: 'Education Infrastructure & Enrolment',
    ministry: 'Department of School Education & Literacy, MoE / Karnataka School Education',
    objective: 'Monitor school infrastructure, pupil-teacher ratios, learning resources, and student retention.',
    beneficiaries: 'Government, aided, and recognized private schools across Karnataka.',
    reportingPeriod: 'FY 2023-24',
    dataSource: 'Department of School Education & Literacy (udiseplus.gov.in)',
    coverage: '31 Karnataka Districts (Educational Blocks)',
    keyHighlight: 'Statewide School Infrastructure & Enrolment Registry',
  },
}

function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A'
  return Number(val).toLocaleString('en-IN')
}

function formatLakhToCrore(valInLakh) {
  if (valInLakh === null || valInLakh === undefined || isNaN(valInLakh)) return 'N/A'
  const cr = Number(valInLakh) / 100
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
}

export default function PerformanceAnalytics() {
  const [scheme, setScheme] = useState('mgnrega')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedState, setSelectedState] = useState('all')
  const [selectedDistrict, setSelectedDistrict] = useState('all')
  const [districtSearch, setDistrictSearch] = useState('')
  
  // Segmented Workspace Tabs
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'regional' | 'financial' | 'trends'

  // Interactive Chart Controls
  const [districtSort, setDistrictSort] = useState('desc') // 'desc' | 'asc' | 'alpha'
  const [mgnregaChartMetric, setMgnregaChartMetric] = useState('persondays') // 'persondays' | 'expenditure' | 'works'
  const [pmaygChartMetric, setPmaygChartMetric] = useState('completed') // 'completed' | 'sanctions' | 'verified'
  const [viewModeRegional, setViewModeRegional] = useState('chart') // 'chart' | 'table'
  const [trendMetric, setTrendMetric] = useState('person_days') // 'person_days' | 'expenditure' | 'works'
  const [showDataProvenance, setShowDataProvenance] = useState(false)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true)
      setError(null)
      try {
        const yearParam = selectedYear !== 'all' ? selectedYear : null
        const res = await analyticsAPI.scheme(scheme, yearParam)
        setData(res.data)
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err.message || 'Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [scheme, selectedYear])

  const summary = data?.summary || {}
  const rankings = data?.district_rankings || {}
  const allDistricts = useMemo(() => rankings.all || [], [rankings])
  const monthlyTrends = useMemo(() => data?.monthly_trends || [], [data])
  const participation = useMemo(() => data?.participation || {}, [data])
  const workCompletion = useMemo(() => data?.work_completion || {}, [data])
  const expBreakdown = useMemo(() => data?.expenditure_breakdown || {}, [data])

  // Available states for filter
  const availableStates = useMemo(() => {
    const states = new Set()
    allDistricts.forEach(d => {
      if (d.state) states.add(d.state)
    })
    return Array.from(states).sort()
  }, [allDistricts])

  const handleStateChange = (e) => {
    setSelectedState(e.target.value)
    setSelectedDistrict('all')
  }

  // Active district object if filtered
  const activeDistrictObj = useMemo(() => {
    if (selectedDistrict === 'all') return null
    return allDistricts.find(d => d.district?.toLowerCase() === selectedDistrict.toLowerCase()) || null
  }, [selectedDistrict, allDistricts])

  // Filtered district list
  const filteredDistricts = useMemo(() => {
    let list = [...allDistricts]

    if (selectedState !== 'all') {
      list = list.filter(d => d.state?.toLowerCase() === selectedState.toLowerCase())
    }

    if (selectedDistrict !== 'all') {
      list = list.filter(d => d.district?.toLowerCase() === selectedDistrict.toLowerCase())
    }

    if (districtSearch.trim()) {
      const q = districtSearch.toLowerCase().trim()
      list = list.filter(d => d.district?.toLowerCase().includes(q))
    }

    // Apply sorting
    if (districtSort === 'desc') {
      list.sort((a, b) => {
        if (scheme === 'pmayg') {
          const valB = b[pmaygChartMetric === 'completed' ? 'completed_houses' : pmaygChartMetric === 'sanctions' ? 'sanctions_geotagged' : 'sanctions_verified_accounts'] || 0
          const valA = a[pmaygChartMetric === 'completed' ? 'completed_houses' : pmaygChartMetric === 'sanctions' ? 'sanctions_geotagged' : 'sanctions_verified_accounts'] || 0
          return valB - valA
        } else {
          const valB = b[mgnregaChartMetric === 'persondays' ? 'central_liability_persondays' : mgnregaChartMetric === 'expenditure' ? 'total_expenditure' : 'completed_works'] || 0
          const valA = a[mgnregaChartMetric === 'persondays' ? 'central_liability_persondays' : mgnregaChartMetric === 'expenditure' ? 'total_expenditure' : 'completed_works'] || 0
          return valB - valA
        }
      })
    } else if (districtSort === 'asc') {
      list.sort((a, b) => {
        if (scheme === 'pmayg') {
          const valB = b[pmaygChartMetric === 'completed' ? 'completed_houses' : pmaygChartMetric === 'sanctions' ? 'sanctions_geotagged' : 'sanctions_verified_accounts'] || 0
          const valA = a[pmaygChartMetric === 'completed' ? 'completed_houses' : pmaygChartMetric === 'sanctions' ? 'sanctions_geotagged' : 'sanctions_verified_accounts'] || 0
          return valA - valB
        } else {
          const valB = b[mgnregaChartMetric === 'persondays' ? 'central_liability_persondays' : mgnregaChartMetric === 'expenditure' ? 'total_expenditure' : 'completed_works'] || 0
          const valA = a[mgnregaChartMetric === 'persondays' ? 'central_liability_persondays' : mgnregaChartMetric === 'expenditure' ? 'total_expenditure' : 'completed_works'] || 0
          return valA - valB
        }
      })
    } else if (districtSort === 'alpha') {
      list.sort((a, b) => (a.district || '').localeCompare(b.district || ''))
    }

    return list
  }, [allDistricts, selectedState, selectedDistrict, districtSearch, districtSort, scheme, mgnregaChartMetric, pmaygChartMetric])

  // Dynamic PMAY-G KPIs
  const pmaygKpis = useMemo(() => {
    if (activeDistrictObj) {
      const d = activeDistrictObj
      const sanctions = d.sanctions_geotagged || 0
      const verifiedAcc = d.sanctions_verified_accounts || 0
      const inst1 = d.installment_1 || 0
      const inst2 = d.installment_2 || 0
      const inst3 = d.installment_3 || 0
      const inst4 = d.installment_4 || 0
      const compVerified = d.completed_verified || 0
      const comp = d.completed_houses || 0
      const compShare = sanctions > 0 ? ((comp / sanctions) * 100).toFixed(2) : 'N/A'
      return {
        districtsCovered: 1,
        sanctionsGeotagged: sanctions,
        verifiedAccounts: verifiedAcc,
        accountVerificationPct: sanctions > 0 ? ((verifiedAcc / sanctions) * 100).toFixed(2) : 'N/A',
        installment1: inst1,
        installment2: inst2,
        installment3: inst3,
        installment4: inst4,
        completedVerified: compVerified,
        completedHouses: comp,
        completionSharePct: compShare,
        physicalVerificationShare: comp > 0 ? ((compVerified / comp) * 100).toFixed(2) : 'N/A',
      }
    }

    return {
      districtsCovered: summary.districts_covered || allDistricts.length || 'N/A',
      sanctionsGeotagged: summary.total_sanctions_geotagged,
      verifiedAccounts: summary.total_sanctions_verified_accounts,
      accountVerificationPct: summary.account_verification_pct,
      installment1: summary.total_installment_1,
      installment2: summary.total_installment_2,
      installment3: summary.total_installment_3,
      installment4: summary.total_installment_4,
      completedVerified: summary.total_completed_verified,
      completedHouses: summary.total_completed_houses,
      completionSharePct: summary.completion_share_pct,
      physicalVerificationShare: summary.physical_verification_share_pct,
    }
  }, [activeDistrictObj, summary, allDistricts])

  // Dynamic MGNREGA KPIs
  const kpis = useMemo(() => {
    if (activeDistrictObj) {
      const d = activeDistrictObj
      const cw = d.completed_works || 0
      const ow = d.ongoing_works || 0
      const totalW = d.total_works_takenup || (cw + ow)
      return {
        districtsCovered: 1,
        totalExpCrore: d.total_expenditure ? (d.total_expenditure / 100).toFixed(2) : 'N/A',
        totalExpLakh: d.total_expenditure ? d.total_expenditure : null,
        labourBudget: d.total_target,
        centralLiability: d.central_liability_persondays,
        achievementPct: d.achievement_pct,
        womenParticipationPct: d.women_participation_pct,
        workCompletionRate: totalW > 0 ? ((cw / totalW) * 100).toFixed(1) : 'N/A',
        completedWorks: cw,
        ongoingWorks: ow,
        totalWorks: totalW,
        isExceeded: d.achievement_pct > 100.0,
      }
    }

    return {
      districtsCovered: summary.districts_covered || allDistricts.length || 'N/A',
      totalExpCrore: summary.total_expenditure_lakh ? (summary.total_expenditure_lakh / 100).toFixed(2) : 'N/A',
      totalExpLakh: summary.total_expenditure_lakh || null,
      labourBudget: summary.total_person_days_target,
      centralLiability: summary.total_central_liability_persondays,
      achievementPct: summary.achievement_pct,
      womenParticipationPct: summary.women_participation_pct,
      workCompletionRate: summary.work_completion_pct,
      completedWorks: summary.total_completed_works || workCompletion.completed_works,
      ongoingWorks: summary.total_ongoing_works || workCompletion.ongoing_works,
      totalWorks: summary.total_works_takenup || workCompletion.total_works,
      isExceeded: (summary.achievement_pct || 0) > 100.0,
    }
  }, [activeDistrictObj, summary, allDistricts, workCompletion])

  // Women's Participation Donut Data (MGNREGA)
  const womenParticipationDonutData = useMemo(() => {
    const womenPd = summary.total_women_persondays || participation.women_persondays || 0
    const totalPd = summary.total_central_liability_persondays || participation.total_persondays || 1
    const otherPd = Math.max(0, totalPd - womenPd)
    const womenPct = summary.women_participation_pct || participation.women_pct || 54.98
    return [
      { name: "Women's Person-Days", value: womenPd, color: '#ec4899', pct: womenPct },
      { name: 'Men & Other Person-Days', value: otherPd, color: '#0ea5e9', pct: (100 - womenPct).toFixed(2) },
    ]
  }, [summary, participation])

  // MGNREGA Expenditure Breakdown Donut Data
  const expenditureDonutData = useMemo(() => {
    const wages = expBreakdown.wages_lakh || summary.total_wages_lakh || 274133
    const material = expBreakdown.material_lakh || summary.total_material_lakh || 46633
    const admin = expBreakdown.admin_expenditure_lakh || summary.total_admin_expenditure_lakh || 23292
    const total = wages + material + admin
    return [
      { name: 'Wages (DBT)', value: wages, color: '#1e3a8a', pct: ((wages / total) * 100).toFixed(1), cr: (wages / 100).toFixed(2) },
      { name: 'Material & Skilled', value: material, color: '#10b981', pct: ((material / total) * 100).toFixed(1), cr: (material / 100).toFixed(2) },
      { name: 'Administrative Outlay', value: admin, color: '#f59e0b', pct: ((admin / total) * 100).toFixed(1), cr: (admin / 100).toFixed(2) },
    ]
  }, [expBreakdown, summary])

  // PMAY-G Sanctions vs Verified Donut Data
  const pmaygVerifiedDonutData = useMemo(() => {
    const verified = pmaygKpis.verifiedAccounts || 457015
    const sanctions = pmaygKpis.sanctionsGeotagged || 633782
    const unverified = Math.max(0, sanctions - verified)
    const verifiedPct = pmaygKpis.accountVerificationPct !== 'N/A' ? pmaygKpis.accountVerificationPct : 72.11
    return [
      { name: 'Aadhaar / DBT Verified Accounts', value: verified, color: '#059669', pct: verifiedPct },
      { name: 'Pending Re-verification / Seeding', value: unverified, color: '#f59e0b', pct: (100 - verifiedPct).toFixed(2) },
    ]
  }, [pmaygKpis])

  // PMAY-G Completion vs Sanction Donut Data
  const pmaygCompletionDonutData = useMemo(() => {
    const comp = pmaygKpis.completedHouses || 177159
    const sanctions = pmaygKpis.sanctionsGeotagged || 633782
    const inProgress = Math.max(0, sanctions - comp)
    const compPct = pmaygKpis.completionSharePct !== 'N/A' ? pmaygKpis.completionSharePct : 27.95
    return [
      { name: 'Fully Completed Houses', value: comp, color: '#1e3a8a', pct: compPct },
      { name: 'Under Construction / Stages', value: inProgress, color: '#93c5fd', pct: (100 - compPct).toFixed(2) },
    ]
  }, [pmaygKpis])

  // Reset all filters
  const resetFilters = () => {
    setSelectedYear('all')
    setSelectedState('all')
    setSelectedDistrict('all')
    setDistrictSearch('')
    setDistrictSort('desc')
  }

  // Export CSV handler
  const exportFilteredCSV = () => {
    if (!data?.has_data) return
    const lines = []
    lines.push(`GovPulse Analytics Export — ${scheme.toUpperCase()}`)
    lines.push(`Exported At: ${new Date().toISOString()}`)
    lines.push(`Scope: 31 Karnataka Districts • Scheme: ${scheme.toUpperCase()}`)
    lines.push('')

    if (scheme === 'pmayg') {
      lines.push('Indicator,Value,Unit')
      lines.push(`Districts Covered,"${pmaygKpis.districtsCovered}",Count`)
      lines.push(`Sanctions Geotagged,"${pmaygKpis.sanctionsGeotagged || 'N/A'}",Houses`)
      lines.push(`Verified Accounts,"${pmaygKpis.verifiedAccounts || 'N/A'}",Houses`)
      lines.push(`Account Verification Rate,"${pmaygKpis.accountVerificationPct || 'N/A'}","%"`)
      lines.push(`1st Installment,"${pmaygKpis.installment1 || 'N/A'}",Houses`)
      lines.push(`2nd Installment,"${pmaygKpis.installment2 || 'N/A'}",Houses`)
      lines.push(`3rd Installment,"${pmaygKpis.installment3 || 'N/A'}",Houses`)
      lines.push(`4th Installment,"${pmaygKpis.installment4 || 'N/A'}",Houses`)
      lines.push(`Completed & Verified,"${pmaygKpis.completedVerified || 'N/A'}",Houses`)
      lines.push(`Completed Houses,"${pmaygKpis.completedHouses || 'N/A'}",Houses`)
      lines.push(`Completion Share %,"${pmaygKpis.completionSharePct || 'N/A'}","%"`)
      lines.push('')
      lines.push('District,Sanctions Geotagged,Verified Accounts,1st Inst,2nd Inst,3rd Inst,4th Inst,Completed Verified,Completed Houses,Completion Share %')
      filteredDistricts.forEach(d => {
        lines.push(`"${d.district}","${d.sanctions_geotagged || ''}","${d.sanctions_verified_accounts || ''}","${d.installment_1 || ''}","${d.installment_2 || ''}","${d.installment_3 || ''}","${d.installment_4 || ''}","${d.completed_verified || ''}","${d.completed_houses || ''}","${d.completion_share_pct || ''}"`)
      })
    } else {
      lines.push('Indicator,Value,Unit')
      lines.push(`Districts Covered,"${kpis.districtsCovered}",Count`)
      lines.push(`Total Expenditure,"${kpis.totalExpCrore}","₹ Crore"`)
      lines.push(`Labour Budget Target,"${kpis.labourBudget || 'N/A'}","Person-days"`)
      lines.push(`Central Liability Achieved,"${kpis.centralLiability || 'N/A'}","Person-days"`)
      lines.push(`Labour Budget Achievement,"${kpis.achievementPct || 'N/A'}","%"`)
      lines.push(`Women Participation Rate,"${kpis.womenParticipationPct || 'N/A'}","%"`)
      lines.push(`Work Completion Rate,"${kpis.workCompletionRate || 'N/A'}","%"`)
      lines.push('')
      lines.push('District,Labour Budget,Central Liability Achieved,Achievement %,Expenditure (₹ Lakh),Completed Works,Ongoing Works,Women Participation %')
      filteredDistricts.forEach(d => {
        lines.push(`"${d.district}","${d.total_target || ''}","${d.central_liability_persondays || ''}","${d.achievement_pct || ''}","${d.total_expenditure || ''}","${d.completed_works || ''}","${d.ongoing_works || ''}","${d.women_participation_pct || ''}"`)
      })
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `govpulse_${scheme}_analytics_${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* 1. Header & Scheme Workspace Selector */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Statutory Policy Intelligence Engine
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              31 Karnataka Districts • FY 2023-24 Audited
            </span>
          </div>
          <h2 className="page-title" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f2a4a', margin: 0, letterSpacing: '-0.02em' }}>
            Performance Analytics Workspace
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowDataProvenance(!showDataProvenance)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            title="Inspect dataset provenance and legal notes"
          >
            <Info size={14} /> Provenance Notes
          </button>
          <button
            onClick={exportFilteredCSV}
            disabled={!data?.has_data || loading}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', background: '#047857' }}
          >
            <Download size={14} /> Export CSV
          </button>
          <Link
            to="/reports"
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', textDecoration: 'none' }}
          >
            <FileText size={14} /> Generate PDF
          </Link>
        </div>
      </div>

      {/* Scheme Selection Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {SCHEMES.map(s => (
          <button
            key={s.id}
            onClick={() => { setScheme(s.id); setSelectedDistrict('all'); }}
            style={{
              padding: '0.6rem 1.15rem',
              borderRadius: 8,
              border: scheme === s.id ? '2px solid #1e3a8a' : '1px solid #e2e8f0',
              background: scheme === s.id ? '#1e3a8a' : '#ffffff',
              color: scheme === s.id ? '#ffffff' : '#1e293b',
              fontWeight: scheme === s.id ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: scheme === s.id ? '0 2px 4px rgba(30,58,138,0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{s.name}</span>
            <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 400 }}>({s.desc})</span>
          </button>
        ))}
      </div>

      {/* Expandable Provenance & Legal Disclosures Panel */}
      {showDataProvenance && SCHEME_DETAILS[scheme] && (
        <div className="card" style={{ marginBottom: '1.25rem', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0369a1', textTransform: 'uppercase' }}>
              Data Provenance & Compliance Notice — {SCHEME_DETAILS[scheme].shortName}
            </span>
            <button onClick={() => setShowDataProvenance(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <ChevronUp size={16} />
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Official Origin:</strong> {SCHEME_DETAILS[scheme].dataSource} | <strong>Coverage:</strong> {SCHEME_DETAILS[scheme].coverage} | <strong>Reporting Period:</strong> {SCHEME_DETAILS[scheme].reportingPeriod}
            </p>
            {scheme === 'pmayg' ? (
              <p style={{ margin: 0, color: '#64748b' }}>
                Note: In strict alignment with official AwaasSoft Report A.2 extracts, state-wide financial allocations and multi-year statutory targets are missing and preserved strictly as <strong>N/A</strong>. Account verification reflects current PFMS mandates (72.11% state rate).
              </p>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>
                Note: Person-days are aggregated from Central Liability records. Women participation (54.98%) significantly exceeds the statutory 33.30% minimum floor mandated under Section 7 of the Act.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. Global Filter Strip */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Filter size={15} color="#1e3a8a" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Filters & Scope
            </span>
          </div>
          {(selectedState !== 'all' || selectedDistrict !== 'all' || selectedYear !== 'all' || districtSearch) && (
            <button
              onClick={resetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
              Financial Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
            >
              <option value="all">All Audited Years (2023-24)</option>
              <option value="2023-24">FY 2023-24</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
              State / UT
            </label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
            >
              <option value="all">All States ({availableStates.length || 'Karnataka'})</option>
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
              District Focus
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
            >
              <option value="all">All Districts (31 Total)</option>
              {allDistricts.map(d => (
                <option key={d.district} value={d.district}>
                  {d.district}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
              Search District
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search district name..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 1.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
              />
              <Search size={13} style={{ position: 'absolute', left: 9, top: 10, color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {selectedDistrict !== 'all' && activeDistrictObj && (
          <div style={{ marginTop: '0.65rem', padding: '0.4rem 0.75rem', background: '#eff6ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={13} /> Active District: <strong>{activeDistrictObj.district}</strong> ({activeDistrictObj.state})
            </span>
            <button
              onClick={() => setSelectedDistrict('all')}
              style={{ background: '#dbeafe', border: 'none', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
            >
              Clear Focus
            </button>
          </div>
        )}
      </div>

      {/* 3. Four Segmented Workspace Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: '1. Overview & Mandate', icon: LayoutGrid },
          { id: 'regional', label: '2. Regional Performance (31 Districts)', icon: MapPin },
          { id: 'financial', label: scheme === 'pmayg' ? '3. Installment & DBT Verification' : '3. Financial & Social Inclusion', icon: DollarSign },
          { id: 'trends', label: '4. Progress & Time-Series Trends', icon: TrendingUp },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: isActive ? '3px solid #1e3a8a' : '3px solid transparent',
                background: isActive ? '#f8fafc' : 'transparent',
                color: isActive ? '#1e3a8a' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} color={isActive ? '#1e3a8a' : '#64748b'} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main View Loading / Error / Content */}
      {loading ? (
        <LoadingSpinner message="Calculating Spark SQL scheme analytics..." />
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#dc2626' }}>
          <AlertTriangle size={36} style={{ marginBottom: 8 }} />
          <h3>Error loading analytics</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{error}</p>
        </div>
      ) : !data?.has_data ? (
        <div className="card">
          <EmptyState
            title={`No analytics available for ${scheme.toUpperCase()}`}
            message="Upload a dataset on the Dataset Management page and run PySpark processing to compute analytics."
            action={<Link to="/datasets" className="btn-primary">Upload Dataset</Link>}
          />
        </div>
      ) : scheme === 'pmayg' ? (
        /* ================================================================
           PMAY-G SCHEME WORKSPACE
           ================================================================ */
        <div>
          {/* TAB 1: PMAY-G OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Photo & Mandate Banner */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                }}
              >
                <div style={{ position: 'relative', minHeight: 180, background: '#0f2a4a' }}>
                  <img
                    src="/images/pmayg-banner.png"
                    alt="PMAY-G Rural Housing"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,42,74,0.1) 0%, rgba(15,42,74,0.85) 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem' }}>
                    <span style={{ background: '#10b981', color: '#ffffff', padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Flagship Rural Housing
                    </span>
                    <h3 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, margin: '0.35rem 0 0' }}>
                      Pradhan Mantri Awaas Yojana - Gramin
                    </h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: '2px 0 0' }}>
                      31 Karnataka Districts • SECC 2011 Verified Pucca Housing
                    </p>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                      Scheme Objective
                    </span>
                    <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: '0.25rem 0 0.75rem' }}>
                      Provide an all-weather pucca house with basic amenities to homeless rural households and those living in kutcha or dilapidated structures.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>DBT Verified Accounts</span>
                        <strong style={{ color: '#059669' }}>{formatNumber(pmaygKpis.verifiedAccounts)} (72.11%)</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>Financial Allocation</span>
                        <strong style={{ color: '#64748b' }}>N/A (Not in Report A.2)</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>
                      6.33L Sanctions • 1.77L Pucca Homes Completed
                    </span>
                    <button onClick={() => setActiveTab('regional')} style={{ background: 'none', border: 'none', color: '#1e3a8a', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                      Inspect 31 Districts <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #1e3a8a' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Geotagged Sanctions</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a', margin: '4px 0 0' }}>
                    {formatNumber(pmaygKpis.sanctionsGeotagged)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0' }}>Total Verified Sanctions</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #059669' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DBT Verified Accounts</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '4px 0 0' }}>
                    {formatNumber(pmaygKpis.verifiedAccounts)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#059669', margin: '2px 0 0' }}>{pmaygKpis.accountVerificationPct}% of sanctions</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #4f46e5' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>1st Installment</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5', margin: '4px 0 0' }}>
                    {formatNumber(pmaygKpis.installment1)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0' }}>Foundation Released</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #0891b2' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Completed Houses</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0891b2', margin: '4px 0 0' }}>
                    {formatNumber(pmaygKpis.completedHouses)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#0891b2', margin: '2px 0 0' }}>{pmaygKpis.completionSharePct}% of Sanctions</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Physical Verification</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '4px 0 0' }}>
                    {formatNumber(pmaygKpis.completedVerified)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#10b981', margin: '2px 0 0' }}>99.89% of completed houses</p>
                </div>
              </div>

              {/* 4-Stage Construction Progression Visual */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Layers size={17} color="#1e3a8a" /> 4-Stage Milestone Progression Funnel
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Sanctions', count: pmaygKpis.sanctionsGeotagged, pct: '100%', color: '#1e3a8a' },
                    { label: 'Verified Accounts', count: pmaygKpis.verifiedAccounts, pct: '72.1%', color: '#059669' },
                    { label: '1st Inst (Plinth)', count: pmaygKpis.installment1, pct: '69.4%', color: '#4f46e5' },
                    { label: '2nd Inst (Lintel)', count: pmaygKpis.installment2, pct: '54.0%', color: '#7c3aed' },
                    { label: '3rd Inst (Roof)', count: pmaygKpis.installment3, pct: '38.4%', color: '#c026d3' },
                    { label: '4th Inst (Finishing)', count: pmaygKpis.installment4, pct: '26.7%', color: '#db2777' },
                    { label: 'Completed Pucca', count: pmaygKpis.completedHouses, pct: '28.0%', color: '#0891b2' },
                  ].map((st) => (
                    <div key={st.label} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 8, borderTop: `3px solid ${st.color}`, textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, display: 'block' }}>{st.label}</span>
                      <strong style={{ fontSize: '1.15rem', color: '#0f2a4a', display: 'block', margin: '2px 0' }}>{formatNumber(st.count)}</strong>
                      <span style={{ fontSize: '0.7rem', color: st.color, fontWeight: 700 }}>{st.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PMAY-G REGIONAL PERFORMANCE (31 DISTRICTS) */}
          {activeTab === 'regional' && (
            <div>
              {/* Controls bar */}
              <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Metric:</span>
                  {[
                    { id: 'completed', label: 'Completed Houses' },
                    { id: 'sanctions', label: 'Geotagged Sanctions' },
                    { id: 'verified', label: 'Verified Accounts' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPmaygChartMetric(m.id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 6,
                        border: pmaygChartMetric === m.id ? '1px solid #1e3a8a' : '1px solid #cbd5e1',
                        background: pmaygChartMetric === m.id ? '#1e3a8a' : '#ffffff',
                        color: pmaygChartMetric === m.id ? '#ffffff' : '#1e293b',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ArrowUpDown size={13} color="#64748b" />
                    <select
                      value={districtSort}
                      onChange={e => setDistrictSort(e.target.value)}
                      style={{ padding: '0.35rem 0.55rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                    >
                      <option value="desc">Sort: Highest First</option>
                      <option value="asc">Sort: Lowest First</option>
                      <option value="alpha">Sort: Alphabetical</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                    <button
                      onClick={() => setViewModeRegional('chart')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: viewModeRegional === 'chart' ? '#1e3a8a' : '#ffffff',
                        color: viewModeRegional === 'chart' ? '#ffffff' : '#64748b',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                      }}
                    >
                      <BarChart3 size={13} /> Chart
                    </button>
                    <button
                      onClick={() => setViewModeRegional('table')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: viewModeRegional === 'table' ? '#1e3a8a' : '#ffffff',
                        color: viewModeRegional === 'table' ? '#ffffff' : '#64748b',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                      }}
                    >
                      <TableIcon size={13} /> Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart View */}
              {viewModeRegional === 'chart' && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 className="section-title" style={{ margin: '0 0 0.5rem' }}>
                    District Comparison — {pmaygChartMetric === 'completed' ? 'Completed Pucca Houses' : pmaygChartMetric === 'sanctions' ? 'Geotagged Sanctions' : 'Verified DBT Accounts'} ({filteredDistricts.length} Districts)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem' }}>
                    Click any district bar to focus the dashboard on that district. Hover for exact verified counts.
                  </p>
                  <div style={{ height: 420 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredDistricts.slice(0, 16).map(d => ({
                          district: d.district,
                          value: d[pmaygChartMetric === 'completed' ? 'completed_houses' : pmaygChartMetric === 'sanctions' ? 'sanctions_geotagged' : 'sanctions_verified_accounts'] || 0,
                          sanctions: d.sanctions_geotagged || 0,
                          completed: d.completed_houses || 0,
                          verified: d.sanctions_verified_accounts || 0,
                        }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 45 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="district" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={55} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v) => [
                            `${formatNumber(v)} houses`,
                            pmaygChartMetric === 'completed' ? 'Completed' : pmaygChartMetric === 'sanctions' ? 'Sanctions' : 'Verified Accounts'
                          ]}
                          contentStyle={{ background: '#0f2a4a', color: '#fff', borderRadius: 8, fontSize: '0.8rem' }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#1e3a8a"
                          radius={[4, 4, 0, 0]}
                          onClick={(entry) => setSelectedDistrict(entry.district)}
                          cursor="pointer"
                        >
                          {filteredDistricts.slice(0, 16).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={selectedDistrict.toLowerCase() === entry.district?.toLowerCase() ? '#FF9933' : '#1e3a8a'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Comprehensive 31-District Data Table */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>
                    Official District Registry & Progress Audit ({filteredDistricts.length} Districts)
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Click any row to filter</span>
                </div>
                <div className="table-container" style={{ maxHeight: 460, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 45 }}>#</th>
                        <th>District</th>
                        <th>Sanctions</th>
                        <th>Verified Accounts</th>
                        <th>1st Inst</th>
                        <th>2nd Inst</th>
                        <th>3rd Inst</th>
                        <th>4th Inst</th>
                        <th>Completed</th>
                        <th>Completion %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDistricts.map((d, idx) => {
                        const isSelected = selectedDistrict.toLowerCase() === d.district?.toLowerCase()
                        return (
                          <tr
                            key={d.district || idx}
                            onClick={() => setSelectedDistrict(isSelected ? 'all' : d.district)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? '#eff6ff' : 'transparent',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, color: isSelected ? '#1e40af' : '#0f2a4a' }}>
                              {d.district}
                            </td>
                            <td>{formatNumber(d.sanctions_geotagged)}</td>
                            <td>{formatNumber(d.sanctions_verified_accounts)}</td>
                            <td>{formatNumber(d.installment_1)}</td>
                            <td>{formatNumber(d.installment_2)}</td>
                            <td>{formatNumber(d.installment_3)}</td>
                            <td>{formatNumber(d.installment_4)}</td>
                            <td style={{ fontWeight: 700, color: '#0891b2' }}>{formatNumber(d.completed_houses)}</td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: d.completion_share_pct >= 30 ? '#d1fae5' : d.completion_share_pct >= 20 ? '#fef3c7' : '#fee2e2',
                                color: d.completion_share_pct >= 30 ? '#065f46' : d.completion_share_pct >= 20 ? '#92400e' : '#991b1b',
                              }}>
                                {d.completion_share_pct}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PMAY-G INSTALLMENT & DBT VERIFICATION */}
          {activeTab === 'financial' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* DBT Account Verification Donut */}
              <div className="card">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem' }}>
                  <ShieldCheck size={17} color="#059669" /> DBT Bank Account Verification Rate
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Aadhaar-seeded PFMS validation status against sanctioned cohort
                </p>
                <div style={{ height: 260, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pmaygVerifiedDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {pmaygVerifiedDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [`${formatNumber(v)} (${p.payload.pct}%)`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>72.11%</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Verified DBT</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  {pmaygVerifiedDonutData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                      <span>{d.name}: <strong>{d.pct}%</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Houses vs Sanctions Donut */}
              <div className="card">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem' }}>
                  <Home size={17} color="#1e3a8a" /> Completed Pucca Houses vs Sanctions
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Physical completion share across 6,33,782 approved rural housing units
                </p>
                <div style={{ height: 260, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pmaygCompletionDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {pmaygCompletionDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [`${formatNumber(v)} (${p.payload.pct}%)`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>27.95%</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Completed</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  {pmaygCompletionDonutData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                      <span>{d.name}: <strong>{d.pct}%</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PMAY-G PROGRESS & TRENDS */}
          {activeTab === 'trends' && (
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem' }}>
                  <TrendingUp size={17} color="#1e3a8a" /> 4-Stage Construction Progression Velocity
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1.25rem' }}>
                  Beneficiary retention and attrition through successive construction milestones
                </p>
                <div style={{ height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { stage: 'Geotagged Sanction', count: 633782, retention: 100 },
                        { stage: 'Verified Accounts', count: 457015, retention: 72.1 },
                        { stage: '1st Inst (Plinth)', count: 440024, retention: 69.4 },
                        { stage: '2nd Inst (Lintel)', count: 342040, retention: 54.0 },
                        { stage: '3rd Inst (Roof)', count: 243365, retention: 38.4 },
                        { stage: '4th Inst (Finishing)', count: 169328, retention: 26.7 },
                        { stage: 'Fully Completed', count: 177159, retention: 28.0 },
                      ]}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`${formatNumber(v)} houses`, 'Beneficiary Count']} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                        <Cell fill="#1e3a8a" />
                        <Cell fill="#059669" />
                        <Cell fill="#4f46e5" />
                        <Cell fill="#7c3aed" />
                        <Cell fill="#c026d3" />
                        <Cell fill="#db2777" />
                        <Cell fill="#0891b2" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================================================================
           MGNREGA SCHEME WORKSPACE
           ================================================================ */
        <div>
          {/* TAB 1: MGNREGA OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Photo & Mandate Banner */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                }}
              >
                <div style={{ position: 'relative', minHeight: 180, background: '#0f2a4a' }}>
                  <img
                    src="/images/mgnrega-banner.jpg"
                    alt="MGNREGA Karnataka"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,42,74,0.1) 0%, rgba(15,42,74,0.85) 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem' }}>
                    <span style={{ background: '#FF9933', color: '#0f2a4a', padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Statutory Wage Employment
                    </span>
                    <h3 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, margin: '0.35rem 0 0' }}>
                      Mahatma Gandhi NREGA Karnataka
                    </h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: '2px 0 0' }}>
                      31 Karnataka Districts • 100 Days Guaranteed Wage Employment
                    </p>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                      Statutory Mandate & Budget
                    </span>
                    <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: '0.25rem 0 0.75rem' }}>
                      Rights-based entitlement guaranteeing 100 days of unskilled wage work per rural household per financial year under Sections 7 & 22 of the Act.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>Labour Budget Target</span>
                        <strong style={{ color: '#0f2a4a' }}>9.00 Cr PD</strong>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>Central Outlay</span>
                        <strong style={{ color: '#059669' }}>₹3,440.58 Cr</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                      54.98% Women Workers (+21.68% above 33.3% floor)
                    </span>
                    <button onClick={() => setActiveTab('regional')} style={{ background: 'none', border: 'none', color: '#1e3a8a', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                      Inspect 31 Districts <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Cards Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #1e3a8a' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Central Liability PD</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a', margin: '4px 0 0' }}>
                    {formatNumber(kpis.centralLiability)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#1e3a8a', margin: '2px 0 0' }}>7.96 Cr Person-Days</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #059669' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Labour Budget Met</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '4px 0 0' }}>
                    {kpis.achievementPct}%
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#059669', margin: '2px 0 0' }}>Target: 9.00 Cr PD</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #ec4899' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Women Participation</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#db2777', margin: '4px 0 0' }}>
                    {kpis.womenParticipationPct}%
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#db2777', margin: '2px 0 0' }}>Floor: 33.30% (+21.68%)</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #d97706' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Expenditure</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '4px 0 0' }}>
                    ₹{kpis.totalExpCrore} Cr
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#d97706', margin: '2px 0 0' }}>Wages + Material + Admin</p>
                </div>

                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #0891b2' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Completed Works</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0891b2', margin: '4px 0 0' }}>
                    {formatNumber(kpis.completedWorks)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#0891b2', margin: '2px 0 0' }}>42.23% Completion Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MGNREGA REGIONAL PERFORMANCE (31 DISTRICTS) */}
          {activeTab === 'regional' && (
            <div>
              {/* Controls bar */}
              <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Metric:</span>
                  {[
                    { id: 'persondays', label: 'Person-Days Generated' },
                    { id: 'expenditure', label: 'Expenditure (₹ Lakh)' },
                    { id: 'works', label: 'Completed Works' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMgnregaChartMetric(m.id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 6,
                        border: mgnregaChartMetric === m.id ? '1px solid #1e3a8a' : '1px solid #cbd5e1',
                        background: mgnregaChartMetric === m.id ? '#1e3a8a' : '#ffffff',
                        color: mgnregaChartMetric === m.id ? '#ffffff' : '#1e293b',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ArrowUpDown size={13} color="#64748b" />
                    <select
                      value={districtSort}
                      onChange={e => setDistrictSort(e.target.value)}
                      style={{ padding: '0.35rem 0.55rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                    >
                      <option value="desc">Sort: Highest First</option>
                      <option value="asc">Sort: Lowest First</option>
                      <option value="alpha">Sort: Alphabetical</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                    <button
                      onClick={() => setViewModeRegional('chart')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: viewModeRegional === 'chart' ? '#1e3a8a' : '#ffffff',
                        color: viewModeRegional === 'chart' ? '#ffffff' : '#64748b',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                      }}
                    >
                      <BarChart3 size={13} /> Chart
                    </button>
                    <button
                      onClick={() => setViewModeRegional('table')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: viewModeRegional === 'table' ? '#1e3a8a' : '#ffffff',
                        color: viewModeRegional === 'table' ? '#ffffff' : '#64748b',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                      }}
                    >
                      <TableIcon size={13} /> Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart View */}
              {viewModeRegional === 'chart' && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 className="section-title" style={{ margin: '0 0 0.5rem' }}>
                    District Comparison — {mgnregaChartMetric === 'persondays' ? 'Central Liability Person-Days' : mgnregaChartMetric === 'expenditure' ? 'Total Expenditure (₹ Lakh)' : 'Completed Civil Works'} ({filteredDistricts.length} Districts)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem' }}>
                    Sorted by {districtSort === 'desc' ? 'highest to lowest' : districtSort === 'asc' ? 'lowest to highest' : 'alphabetical'}. Click bar to focus single district.
                  </p>
                  <div style={{ height: 440 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredDistricts.slice(0, 16).map(d => ({
                          district: d.district,
                          value: d[mgnregaChartMetric === 'persondays' ? 'central_liability_persondays' : mgnregaChartMetric === 'expenditure' ? 'total_expenditure' : 'completed_works'] || 0,
                          target: d.total_target || 0,
                          achievement_pct: d.achievement_pct || 0,
                        }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 45 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="district" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={55} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v > 100000 ? `${(v/100000).toFixed(1)}L` : `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v) => [
                            mgnregaChartMetric === 'expenditure' ? `₹${formatNumber(Math.round(v))} Lakh` : formatNumber(v),
                            mgnregaChartMetric === 'persondays' ? 'Person-Days' : mgnregaChartMetric === 'expenditure' ? 'Expenditure' : 'Completed Works'
                          ]}
                          contentStyle={{ background: '#0f2a4a', color: '#fff', borderRadius: 8, fontSize: '0.8rem' }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#1e3a8a"
                          radius={[4, 4, 0, 0]}
                          onClick={(entry) => setSelectedDistrict(entry.district)}
                          cursor="pointer"
                        >
                          {filteredDistricts.slice(0, 16).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={selectedDistrict.toLowerCase() === entry.district?.toLowerCase() ? '#FF9933' : '#1e3a8a'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Comprehensive 31-District Data Table */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>
                    Official District Rankings & Audit Registers ({filteredDistricts.length} Districts)
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Click row to toggle district view</span>
                </div>
                <div className="table-container" style={{ maxHeight: 460, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 45 }}>#</th>
                        <th>District</th>
                        <th>Labour Budget (Target)</th>
                        <th>Person-Days Achieved</th>
                        <th>Achievement %</th>
                        <th>Expenditure (₹ Lakh)</th>
                        <th>Completed Works</th>
                        <th>Women %</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDistricts.map((d, idx) => {
                        const isSelected = selectedDistrict.toLowerCase() === d.district?.toLowerCase()
                        const isExceeded = (d.achievement_pct || 0) >= 100
                        return (
                          <tr
                            key={d.district || idx}
                            onClick={() => setSelectedDistrict(isSelected ? 'all' : d.district)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? '#eff6ff' : 'transparent',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, color: isSelected ? '#1e40af' : '#0f2a4a' }}>
                              {d.district}
                            </td>
                            <td>{formatNumber(d.total_target)}</td>
                            <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{formatNumber(d.central_liability_persondays)}</td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isExceeded ? '#d1fae5' : d.achievement_pct >= 80 ? '#eff6ff' : '#fef3c7',
                                color: isExceeded ? '#065f46' : d.achievement_pct >= 80 ? '#1e40af' : '#92400e',
                              }}>
                                {d.achievement_pct}%
                              </span>
                            </td>
                            <td>{d.total_expenditure ? `₹${formatNumber(Math.round(d.total_expenditure))}` : 'N/A'}</td>
                            <td>{formatNumber(d.completed_works)}</td>
                            <td style={{ fontWeight: 600, color: d.women_participation_pct >= 33.3 ? '#059669' : '#dc2626' }}>
                              {d.women_participation_pct}%
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: isExceeded ? '#059669' : d.achievement_pct >= 80 ? '#2563eb' : '#d97706',
                              }}>
                                {isExceeded ? 'Target Exceeded' : d.achievement_pct >= 80 ? 'On Track' : 'Needs Attention'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MGNREGA FINANCIAL & SOCIAL INCLUSION */}
          {activeTab === 'financial' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Expenditure Breakdown Donut */}
              <div className="card">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem' }}>
                  <DollarSign size={17} color="#1e3a8a" /> Expenditure Component Distribution
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Total Outlay: ₹3,440.58 Crore (Wages, Material & Admin Outlays)
                </p>
                <div style={{ height: 260, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenditureDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {expenditureDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [`₹${p.payload.cr} Cr (${p.payload.pct}%)`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a' }}>₹3,440 Cr</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Total Outlay</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {expenditureDonutData.map(d => (
                    <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid #f8fafc' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                        {d.name}
                      </span>
                      <strong>₹{d.cr} Cr ({d.pct}%)</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Women's Participation Donut */}
              <div className="card">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem' }}>
                  <Users size={17} color="#db2777" /> Women's Participation (54.98%)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Exceeds the statutory 33.30% minimum floor by +21.68%
                </p>
                <div style={{ height: 260, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={womenParticipationDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {womenParticipationDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [`${formatNumber(v)} PD (${p.payload.pct}%)`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#db2777' }}>54.98%</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Women Share</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  {womenParticipationDonutData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                      <span>{d.name}: <strong>{d.pct}%</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MGNREGA PROGRESS & TRENDS */}
          {activeTab === 'trends' && (
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <TrendingUp size={17} color="#1e3a8a" /> Monthly Employment Progression (April — March)
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                      Seasonal employment curves and lean-season wage disbursement
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[
                      { id: 'person_days', label: 'Person-Days' },
                      { id: 'expenditure', label: 'Expenditure' },
                      { id: 'works', label: 'Completed Works' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTrendMetric(t.id)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 6,
                          border: trendMetric === t.id ? '1px solid #1e3a8a' : '1px solid #cbd5e1',
                          background: trendMetric === t.id ? '#1e3a8a' : '#ffffff',
                          color: trendMetric === t.id ? '#ffffff' : '#1e293b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends} margin={{ top: 10, right: 15, left: 10, bottom: 25 }}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => trendMetric === 'expenditure' ? `₹${(v/100).toFixed(0)}Cr` : v > 100000 ? `${(v/100000).toFixed(1)}L` : `${(v/1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(v) => [
                          trendMetric === 'expenditure' ? `₹${formatNumber(Math.round(v))} Lakh` : formatNumber(v),
                          trendMetric === 'person_days' ? 'Cumulative Person-Days' : trendMetric === 'expenditure' ? 'Cumulative Expenditure' : 'Completed Works'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={trendMetric === 'person_days' ? 'cumulative_central_persondays' : trendMetric === 'expenditure' ? 'cumulative_expenditure_lakh' : 'cumulative_completed_works'}
                        stroke="#1e3a8a"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#trendGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
