import React, { useEffect, useState } from 'react'
import { dashboardAPI, datasetsAPI } from '../services/api.js'
import StatCard from '../components/StatCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Link } from 'react-router-dom'
import {
  Database, MapPin, FileText, Activity, CheckCircle, AlertCircle,
  TrendingUp, Clock, Upload
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const SCHEME_COLORS = { mgnrega: '#1e3a8a', pmayg: '#0369a1', pmjay: '#0e7490', udise: '#0f766e' }
const STATUS_COLORS = { completed: '#10b981', failed: '#ef4444', running: '#f59e0b', queued: '#94a3b8' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await dashboardAPI.getSummary()
        setData(res.data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner message="Loading dashboard..." />
  if (error) return (
    <div className="card" style={{ color: '#ef4444', textAlign: 'center', padding: '3rem' }}>
      <AlertCircle size={32} style={{ marginBottom: 8 }} />
      <p>Could not connect to backend: {error}</p>
      <p style={{ fontSize: '0.8rem', marginTop: 8, color: 'var(--color-text-muted)' }}>Make sure the FastAPI server is running on port 8000.</p>
    </div>
  )

  const hasData = data?.has_data

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard Overview</h2>
        <p className="page-subtitle">Government scheme performance at a glance — data sourced from processed Spark analytics</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard label="Schemes Monitored" value={data?.total_schemes} icon={Activity} color="#1e3a8a" />
        <StatCard label="Datasets Uploaded" value={data?.total_datasets} icon={Database} color="#0369a1" />
        <StatCard label="Records Processed" value={data?.total_records_processed} icon={FileText} color="#0e7490" />
        <StatCard label="States Covered" value={data?.states_covered} icon={MapPin} color="#0f766e" />
        <StatCard label="Districts Covered" value={data?.districts_covered} icon={MapPin} color="#065f46" />
        <StatCard label="Completed Jobs" value={data?.completed_jobs} icon={CheckCircle} color="#10b981" />
      </div>

      {!hasData && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <EmptyState
            title="No datasets uploaded yet"
            message="Upload a government scheme dataset to begin processing and viewing analytics. Datasets are processed using Apache Spark SQL."
            action={
              <Link to="/datasets" className="btn-primary">
                <Upload size={16} /> Upload Dataset
              </Link>
            }
          />
        </div>
      )}

      {hasData && data?.scheme_summary?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Scheme breakdown chart */}
          <div className="card">
            <h3 className="section-title">Datasets by Scheme</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.scheme_summary} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="scheme_name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="datasets" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Job status */}
          <div className="card">
            <h3 className="section-title">Processing Jobs Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: data.completed_jobs || 0 },
                    { name: 'Failed', value: data.failed_jobs || 0 },
                    { name: 'Other', value: (data.total_jobs || 0) - (data.completed_jobs || 0) - (data.failed_jobs || 0) },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent jobs */}
      <div className="card">
        <h3 className="section-title">Recent Processing Activity</h3>
        {!data?.recent_jobs?.length ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
            No processing jobs yet. Upload a dataset and trigger Spark processing.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Dataset</th>
                  <th>Scheme</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration (s)</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_jobs.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 500 }}>#{j.id}</td>
                    <td>{j.dataset_id}</td>
                    <td><span className="chip chip-blue">{j.scheme_id?.toUpperCase()}</span></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 10px', borderRadius: 999,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: STATUS_COLORS[j.status] + '1a',
                        color: STATUS_COLORS[j.status],
                      }}>
                        {j.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {j.started_at ? new Date(j.started_at).toLocaleString() : '—'}
                    </td>
                    <td>{j.processing_time_seconds ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
