import React, { useState } from 'react'
import { reportsAPI } from '../services/api.js'
import { FileDown, Download } from 'lucide-react'

const SCHEMES = [
  { id: 'mgnrega', name: 'MGNREGA' },
  { id: 'pmayg', name: 'PMAY-G' },
  { id: 'pmjay', name: 'PM-JAY' },
  { id: 'udise', name: 'UDISE+' },
]

const RESULT_TYPES = [
  { id: 'state_performance', label: 'State-wise Performance' },
  { id: 'summary', label: 'Scheme Summary' },
]

export default function ReportsPage() {
  const [scheme, setScheme] = useState('mgnrega')
  const [resultType, setResultType] = useState('state_performance')

  function download() {
    const url = reportsAPI.exportCsv(scheme, resultType)
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Reports</h2>
        <p className="page-subtitle">Export analytics results as CSV. Data is retrieved from processed Parquet files via FastAPI.</p>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <h3 className="section-title">Export Analytics as CSV</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Scheme</label>
          <select value={scheme} onChange={e => setScheme(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}>
            {SCHEMES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Report Type</label>
          <select value={resultType} onChange={e => setResultType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}>
            {RESULT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        <button onClick={download} className="btn-primary">
          <Download size={16} /> Download CSV
        </button>

        <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          Note: CSV export is only available after a Spark processing job has completed for the selected scheme.
        </p>
      </div>
    </div>
  )
}
