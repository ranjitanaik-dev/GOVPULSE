import React, { useEffect, useState } from 'react'
import { schemesAPI, analyticsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts'
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Hammer,
  DollarSign,
  Calendar,
  Home,
  Layers,
  ShieldCheck,
  Award,
  MapPin,
  HeartPulse,
  GraduationCap,
  Activity,
  ArrowRight,
} from 'lucide-react'

const SCHEME_ICONS = {
  mgnrega: Users,
  pmayg: Home,
  pmjay: HeartPulse,
  udise: GraduationCap,
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

function MgnregaDetailedView({ analytics }) {
  const summary = analytics?.summary || {}
  const monthlyTrends = analytics?.monthly_trends || []
  const participation = analytics?.participation || {}
  const workCompletion = analytics?.work_completion || {}
  const rankings = analytics?.district_rankings || { top: [], bottom: [] }

  const hasCentral = summary.total_central_liability_persondays !== null && summary.total_central_liability_persondays !== undefined
  const hasOverall = summary.total_person_days !== null && summary.total_person_days !== undefined

  return (
    <div style={{ marginTop: '1.25rem' }}>
      {/* 1. Core Employment & Liability Breakdown (Requirement 8) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Central Liability Person-days</span>
            <span className="chip" style={{ background: '#dcfce7', color: '#166534', fontSize: '0.7rem' }}>Central Liability</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14532d', margin: 0 }}>
            {hasCentral ? formatNumber(summary.total_central_liability_persondays) : 'N/A'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#15803d', margin: '0.25rem 0 0 0' }}>
            {summary.central_liability_achievement_pct ? `${summary.central_liability_achievement_pct}% of Labour Budget` : 'Official central liability'}
          </p>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Overall Person-days</span>
            <span className="chip" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }}>
              {hasOverall ? 'Total' : 'Not in Dataset'}
            </span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: hasOverall ? '#0f172a' : '#94a3b8', margin: 0 }}>
            {hasOverall ? formatNumber(summary.total_person_days) : 'N/A'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            {hasOverall ? `${summary.employment_achievement_pct}% target achieved` : 'Metric not separately available'}
          </p>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Approved Labour Budget</span>
            <span className="chip" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem' }}>Target</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
            {formatNumber(summary.total_person_days_target)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: '0.25rem 0 0 0' }}>
            Annual ministry target
          </p>
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Total Expenditure</span>
            <DollarSign size={14} color="#6b21a8" />
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#581c87', margin: 0 }}>
            {formatLakhToCrore(summary.total_expenditure_lakh)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#7e22ce', margin: '0.25rem 0 0 0' }}>
            {summary.total_expenditure_lakh ? `₹${Number(summary.total_expenditure_lakh).toLocaleString('en-IN')} Lakh` : 'N/A'}
          </p>
        </div>
      </div>

      {/* 2. Secondary Metrics Row: Social Inclusion & Works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Women Person-days</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
            {summary.women_participation_pct !== null && summary.women_participation_pct !== undefined ? `${summary.women_participation_pct}%` : 'N/A'}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#16a34a', margin: 0 }}>Reference benchmark: ≥ 33.3%</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>SC / ST Person-days</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
            {summary.sc_participation_pct ? `${summary.sc_participation_pct}% SC / ${summary.st_participation_pct}% ST` : 'N/A'}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>Social inclusion metrics</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Works Completed</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
            {formatNumber(summary.total_completed_works)}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>
            {summary.work_completion_pct ? `${summary.work_completion_pct}% (internal maximum-based indicator)` : 'Rural infrastructure'}
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Households Employed</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
            {formatNumber(summary.total_households_employed)}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>
            {summary.total_individuals_worked ? `${formatNumber(summary.total_individuals_worked)} individuals` : 'Wage earners'}
          </p>
        </div>
      </div>

      {/* 3. Monthly Progression Chart (Spark SQL output) */}
      {monthlyTrends.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Monthly Employment Trajectory (April — March)</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Spark SQL aggregation: Cumulative progress and monthly incremental person-days generated
              </p>
            </div>
            <span className="chip chip-blue">Financial Year 2025-26</span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="mgnregaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v, name) => [Number(v).toLocaleString('en-IN'), name]} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Area type="monotone" dataKey="cumulative_central_persondays" name="Cumulative Central Liability" stroke="#1e3a8a" fillOpacity={1} fill="url(#mgnregaGrad)" />
              <Area type="monotone" dataKey="monthly_incremental_persondays" name="Monthly Incremental Generated" stroke="#059669" fillOpacity={1} fill="url(#incGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 4. District Rankings Table (Top 5 & Bottom 5) */}
      {rankings?.top?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' }}>
            <h5 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#166534', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Award size={16} /> Top Performing Districts
            </h5>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0' }}>District</th>
                  <th>Central Liability</th>
                  <th>Target</th>
                  <th style={{ textAlign: 'right' }}>Achievement</th>
                </tr>
              </thead>
              <tbody>
                {rankings.top.slice(0, 5).map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ fontWeight: 600, padding: '0.4rem 0' }}>{d.district}</td>
                    <td>{formatNumber(d.central_liability_persondays || d.total_value)}</td>
                    <td>{formatNumber(d.total_target)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge-on-track">{d.achievement_pct?.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' }}>
            <h5 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#991b1b', margin: '0 0 0.5rem 0' }}>⚠️ Districts Requiring Attention</h5>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0' }}>District</th>
                  <th>Central Liability</th>
                  <th>Target</th>
                  <th style={{ textAlign: 'right' }}>Achievement</th>
                </tr>
              </thead>
              <tbody>
                {rankings.bottom.slice(0, 5).map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ fontWeight: 600, padding: '0.4rem 0' }}>{d.district}</td>
                    <td>{formatNumber(d.central_liability_persondays || d.total_value)}</td>
                    <td>{formatNumber(d.total_target)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={d.achievement_pct < 50 ? 'badge-low-achievement' : 'badge-needs-attention'}>
                        {d.achievement_pct?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PmaygDetailedView({ analytics }) {
  const summary = analytics?.summary || {}
  const progression = analytics?.installment_progression || []
  const rankings = analytics?.district_rankings || { top: [], bottom: [], all: [] }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      {/* 1. Core Physical Milestones Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Sanctions Geotagged</span>
            <span className="chip" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem' }}>Initial Sanction</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
            {formatNumber(summary.total_sanctions_geotagged)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: '0.25rem 0 0 0' }}>
            Verified Geotagged Beneficiaries
          </p>
        </div>

        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Verified Accounts</span>
            <span className="chip" style={{ background: '#ccfbf1', color: '#0f766e', fontSize: '0.7rem' }}>DBT Ready</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#115e59', margin: 0 }}>
            {formatNumber(summary.total_sanctions_verified_accounts)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#0d9488', margin: '0.25rem 0 0 0' }}>
            {summary.account_verification_pct ? `${summary.account_verification_pct}% of sanctions` : 'Verified Bank Accounts'}
          </p>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>1st Installment</span>
            <span className="chip" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>Tranche 1</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {formatNumber(summary.total_installment_1)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.25rem 0 0 0' }}>
            Initial Financial Release
          </p>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Completed Houses</span>
            <span className="chip" style={{ background: '#dcfce7', color: '#166534', fontSize: '0.7rem' }}>Physically Complete</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14532d', margin: 0 }}>
            {formatNumber(summary.total_completed_houses)}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#15803d', margin: '0.25rem 0 0 0' }}>
            {summary.completion_share_pct ? `${summary.completion_share_pct}% completion share (derived)` : 'Total Houses Constructed'}
          </p>
        </div>
      </div>

      {/* 2. Secondary Metrics Row: Tranche Releases & Physical Inspection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>2nd Installment</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
            {formatNumber(summary.total_installment_2)}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>Plinth level release</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>3rd Installment</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
            {formatNumber(summary.total_installment_3)}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>Roof level release</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Completed & Verified</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f766e', margin: '0.25rem 0 0 0' }}>
            {formatNumber(summary.total_completed_verified)}
          </p>
          <p style={{ fontSize: '0.68rem', color: '#0f766e', margin: 0 }}>
            {summary.physical_verification_share_pct ? `${summary.physical_verification_share_pct}% physically inspected` : 'Inspected houses'}
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Financial Expenditure</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            N/A
          </p>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>Not in Report A.2</p>
        </div>
      </div>

      {/* 3. Physical Milestones & Installments Comparison */}
      {progression.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Physical Milestones & Installments Comparison</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Independent comparison of sanctions, tranche releases, and completion certification from AwaasSoft Report A.2
              </p>
            </div>
            <span className="chip chip-blue">AwaasSoft Report A.2</span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={progression} margin={{ top: 10, right: 10, left: 0, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="stage" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} height={50} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, name) => [Number(v).toLocaleString('en-IN'), 'Houses / Beneficiaries']} />
              <Bar dataKey="count" name="Houses / Beneficiaries" fill="#0284c7" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 4. Top Districts by Completed Houses */}
      {rankings?.top?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' }}>
            <h5 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#166534', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Award size={16} /> Top Districts by Completed Houses
            </h5>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0' }}>District</th>
                  <th>Sanctions</th>
                  <th>Completed</th>
                  <th style={{ textAlign: 'right' }}>Comp. Share</th>
                </tr>
              </thead>
              <tbody>
                {[...rankings.top].sort((a, b) => (b.completed_houses || 0) - (a.completed_houses || 0)).slice(0, 5).map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ fontWeight: 600, padding: '0.4rem 0' }}>{d.district}</td>
                    <td>{formatNumber(d.sanctions_geotagged)}</td>
                    <td style={{ fontWeight: 700, color: '#166534' }}>{formatNumber(d.completed_houses)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge-on-track">{d.completion_share_pct?.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.875rem' }}>
            <h5 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0369a1', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={16} /> High Sanction Capacity Districts
            </h5>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0' }}>District</th>
                  <th>Sanctions</th>
                  <th>1st Inst.</th>
                  <th style={{ textAlign: 'right' }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {[...(rankings.all || rankings.top)].sort((a, b) => (b.sanctions_geotagged || 0) - (a.sanctions_geotagged || 0)).slice(0, 5).map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ fontWeight: 600, padding: '0.4rem 0' }}>{d.district}</td>
                    <td>{formatNumber(d.sanctions_geotagged)}</td>
                    <td>{formatNumber(d.installment_1)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                      {formatNumber(d.completed_houses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SchemeCard({ scheme, analytics }) {
  const summary = analytics?.summary || {}
  const statePerf = analytics?.state_performance || []
  const hasData = analytics?.has_data
  const Icon = SCHEME_ICONS[scheme.id] || Activity

  return (
    <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#eff6ff',
            color: '#1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={24} />
        </div>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f2a4a', margin: 0 }}>{scheme.name}</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{scheme.ministry}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="chip chip-blue">{scheme.id.toUpperCase()}</span>
          <Link
            to="/analytics"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              background: '#1e3a8a',
              color: '#ffffff',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>Analytics</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
      <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
        {scheme.description}
      </p>

      {!hasData ? (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            No processed data for this scheme. Upload a dataset and run Spark processing.
          </p>
          <Link to="/datasets" className="btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>Upload Data</Link>
        </div>
      ) : scheme.id === 'mgnrega' ? (
        <MgnregaDetailedView analytics={analytics} />
      ) : scheme.id === 'pmayg' ? (
        <PmaygDetailedView analytics={analytics} />
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {scheme.supported_indicators?.map(ind => (
              <div key={ind} style={{
                background: summary[`total_${ind}`] !== undefined && summary[`total_${ind}`] !== null ? '#eff6ff' : '#f1f5f9',
                padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.78rem',
                color: summary[`total_${ind}`] !== undefined && summary[`total_${ind}`] !== null ? '#1d4ed8' : '#94a3b8',
              }}>
                <span style={{ fontWeight: 600 }}>{ind.replace(/_/g, ' ')}: </span>
                {summary[`total_${ind}`] !== undefined && summary[`total_${ind}`] !== null
                  ? Number(summary[`total_${ind}`]).toLocaleString('en-IN')
                  : 'N/A'}
              </div>
            ))}
          </div>

          {statePerf.length > 0 && (
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>State Performance (Top 10)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statePerf.slice(0, 10)} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="state" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="achievement_pct" fill="#1e3a8a" radius={[3, 3, 0, 0]} name="Achievement %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SchemeExplorer() {
  const [schemes, setSchemes] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const sRes = await schemesAPI.list()
        setSchemes(sRes.data)
        const analyticsData = {}
        await Promise.all(sRes.data.map(async s => {
          try {
            const aRes = await analyticsAPI.scheme(s.id)
            analyticsData[s.id] = aRes.data
          } catch {}
        }))
        setAnalytics(analyticsData)
      } catch (e) {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Scheme Explorer</h2>
        <p className="page-subtitle">Deep-dive into scheme indicators, monthly progress trajectories, and physical/financial analytics</p>
      </div>
      {schemes.map(s => (
        <SchemeCard key={s.id} scheme={s} analytics={analytics[s.id]} />
      ))}
    </div>
  )
}
