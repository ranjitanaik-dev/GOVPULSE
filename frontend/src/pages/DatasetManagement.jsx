import React, { useEffect, useState, useRef } from 'react'
import { datasetsAPI, schemesAPI, jobsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Upload, RefreshCw, CheckCircle, AlertCircle, Clock, Play, ChevronDown } from 'lucide-react'

const STATUS_STYLES = {
  uploaded: { background: '#eff6ff', color: '#1d4ed8' },
  processing: { background: '#fef3c7', color: '#92400e' },
  processed: { background: '#d1fae5', color: '#065f46' },
  failed: { background: '#fee2e2', color: '#991b1b' },
}

export default function DatasetManagement() {
  const [datasets, setDatasets] = useState([])
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [processingJob, setProcessingJob] = useState({})
  const fileRef = useRef()

  const [form, setForm] = useState({
    scheme_id: 'mgnrega',
    reporting_year: '2023-24',
    source: '',
  })

  async function refresh() {
    try {
      const [dsRes, schRes] = await Promise.all([datasetsAPI.list(), schemesAPI.list()])
      setDatasets(dsRes.data)
      setSchemes(schRes.data)
    } catch(e) {}
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setUploadError('Please select a file.'); return }
    setUploading(true); setUploadError(null); setUploadResult(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('scheme_id', form.scheme_id)
    fd.append('reporting_year', form.reporting_year)
    fd.append('source', form.source)
    try {
      const res = await datasetsAPI.upload(fd)
      setUploadResult(res.data)
      fileRef.current.value = ''
      await refresh()
    } catch(e) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleProcess(datasetId) {
    try {
      const res = await datasetsAPI.process(datasetId)
      setProcessingJob(j => ({ ...j, [datasetId]: res.data.job_id }))
      await refresh()
    } catch(e) {
      alert('Error: ' + e.message)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dataset Management</h2>
        <p className="page-subtitle">Upload government scheme datasets (CSV / Excel) and trigger Apache Spark processing</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Upload form */}
        <div className="card">
          <h3 className="section-title">Upload Dataset</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Government Scheme *</label>
              <select
                value={form.scheme_id}
                onChange={e => setForm(f => ({...f, scheme_id: e.target.value}))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}
              >
                {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Reporting Year *</label>
              <input
                type="text" value={form.reporting_year} placeholder="e.g. 2023-24"
                onChange={e => setForm(f => ({...f, reporting_year: e.target.value}))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Data Source</label>
              <input
                type="text" value={form.source} placeholder="e.g. MGNREGA Portal, MoRD"
                onChange={e => setForm(f => ({...f, source: e.target.value}))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Dataset File (CSV / Excel) *</label>
              <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx"
                style={{ width: '100%', padding: '0.5rem 0', fontSize: '0.875rem' }}
              />
            </div>

            {uploadError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.8rem' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />{uploadError}
              </div>
            )}

            {uploadResult && (
              <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: 8, fontSize: '0.8rem' }}>
                <CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                Uploaded: {uploadResult.file_name}<br />
                Columns detected: {uploadResult.detected_columns?.length || 0}
                {uploadResult.detected_columns?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: '0.75rem', opacity: 0.8 }}>
                    {uploadResult.detected_columns.slice(0,8).join(', ')}{uploadResult.detected_columns.length > 8 ? '...' : ''}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={uploading}>
              <Upload size={16} />{uploading ? 'Uploading...' : 'Upload Dataset'}
            </button>
          </form>
        </div>

        {/* Dataset list */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Uploaded Datasets</h3>
            <button onClick={refresh} className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {!datasets.length ? (
            <EmptyState title="No datasets yet" message="Upload a dataset using the form on the left." />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>File</th>
                    <th>Scheme</th>
                    <th>Year</th>
                    <th>Records</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>#{d.id}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.file_name}>
                        {d.file_name}
                      </td>
                      <td><span className="chip chip-blue">{d.scheme_id?.toUpperCase()}</span></td>
                      <td>{d.reporting_year || '—'}</td>
                      <td>{d.total_records ? d.total_records.toLocaleString() : '—'}</td>
                      <td>
                        <span style={{
                          ...STATUS_STYLES[d.status],
                          display: 'inline-block', padding: '2px 10px',
                          borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                        }}>{d.status}</span>
                      </td>
                      <td>
                        {(d.status === 'uploaded' || d.status === 'failed') && (
                          <button onClick={() => handleProcess(d.id)} className="btn-primary"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                            <Play size={12} /> Process
                          </button>
                        )}
                        {d.status === 'processing' && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}><Clock size={12} style={{ display: 'inline' }} /> Running...</span>}
                        {d.status === 'processed' && <span style={{ color: '#10b981', fontSize: '0.8rem' }}><CheckCircle size={12} style={{ display: 'inline' }} /> Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
