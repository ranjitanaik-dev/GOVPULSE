import React, { useEffect, useState, useRef } from 'react'
import { datasetsAPI, schemesAPI, jobsAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Link } from 'react-router-dom'
import {
  Upload, RefreshCw, CheckCircle, AlertCircle, Clock, Play,
  Settings2, Table, Eye, X, ArrowRight, Check, AlertTriangle, Info, FileSpreadsheet
} from 'lucide-react'

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
  const [uploadError, setUploadError] = useState(null)
  const fileRef = useRef()

  // Selected dataset for Preview & Mapping Modal
  const [activeModalDatasetId, setActiveModalDatasetId] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [userMapping, setUserMapping] = useState({})
  const [validationResult, setValidationResult] = useState(null)
  const [validating, setValidating] = useState(false)
  const [savingMapping, setSavingMapping] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [activeTab, setActiveTab] = useState('mapping') // 'mapping' | 'preview'

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
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setUploadError('Please select a CSV or Excel file.')
      return
    }
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('scheme_id', form.scheme_id)
    fd.append('reporting_year', form.reporting_year)
    fd.append('source', form.source)

    try {
      const res = await datasetsAPI.upload(fd)
      fileRef.current.value = ''
      await refresh()
      // Immediately open the preview and mapping drawer for the newly uploaded file!
      openMappingModal(res.data.dataset_id)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function openMappingModal(datasetId) {
    setActiveModalDatasetId(datasetId)
    setModalLoading(true)
    setPreviewData(null)
    setValidationResult(null)
    setActiveTab('mapping')

    try {
      const res = await datasetsAPI.getPreview(datasetId)
      setPreviewData(res.data)
      // Initialize mapping with current or suggested mapping
      const initialMap = res.data.current_mapping || res.data.suggested_mapping || {}
      setUserMapping(initialMap)
      setValidationResult(res.data.validation)
    } catch (err) {
      alert('Failed to load dataset preview: ' + err.message)
      setActiveModalDatasetId(null)
    } finally {
      setModalLoading(false)
    }
  }

  function handleMappingChange(indicatorCode, actualCol) {
    const updated = { ...userMapping }
    if (actualCol === '') {
      delete updated[indicatorCode]
    } else {
      updated[indicatorCode] = actualCol
    }
    setUserMapping(updated)
    // Clear previous validation so user re-validates
    setValidationResult(null)
  }

  async function handleValidateMapping() {
    if (!activeModalDatasetId) return
    setValidating(true)
    try {
      const res = await datasetsAPI.validateMapping(activeModalDatasetId, userMapping)
      setValidationResult(res.data)
    } catch (err) {
      alert('Validation error: ' + err.message)
    } finally {
      setValidating(false)
    }
  }

  async function handleSaveMapping() {
    if (!activeModalDatasetId) return
    setSavingMapping(true)
    try {
      const res = await datasetsAPI.updateMapping(activeModalDatasetId, userMapping)
      setValidationResult(res.data.validation)
      await refresh()
      alert('Column mapping saved successfully.')
    } catch (err) {
      alert('Failed to save mapping: ' + err.message)
    } finally {
      setSavingMapping(false)
    }
  }

  async function handleProcessWithMapping() {
    if (!activeModalDatasetId) return
    setProcessingId(activeModalDatasetId)
    try {
      await datasetsAPI.process(activeModalDatasetId, userMapping)
      await refresh()
      setActiveModalDatasetId(null)
      alert('Spark processing job queued successfully. Check the table or dashboard for live progress!')
    } catch (err) {
      alert('Cannot start processing: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dataset Management</h2>
        <p className="page-subtitle">
          Upload government scheme datasets (CSV / Excel), inspect actual columns, map indicators, and run Spark SQL processing
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Upload form card */}
        <div className="card">
          <h3 className="section-title">Upload New Dataset</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>
                Government Scheme *
              </label>
              <select
                value={form.scheme_id}
                onChange={e => setForm(f => ({ ...f, scheme_id: e.target.value }))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}
              >
                {schemes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id.toUpperCase()})</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>
                Reporting Financial Year *
              </label>
              <input
                type="text"
                value={form.reporting_year}
                placeholder="e.g. 2023-24"
                onChange={e => setForm(f => ({ ...f, reporting_year: e.target.value }))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>
                Data Source / Department
              </label>
              <input
                type="text"
                value={form.source}
                placeholder="e.g. data.gov.in, MoRD MGNREGA Portal"
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>
                Dataset File (CSV or Excel) *
              </label>
              <div style={{
                border: '1.5px dashed var(--color-border)',
                borderRadius: 8,
                padding: '1rem',
                textAlign: 'center',
                background: '#f8fafc',
              }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                  Supports government CSV, XLS, and XLSX formats with different column headers
                </p>
              </div>
            </div>

            {uploadError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.8rem', display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{uploadError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={uploading} style={{ justifyContent: 'center' }}>
              <Upload size={16} />
              {uploading ? 'Uploading & Inspecting...' : 'Upload & Configure Mapping'}
            </button>
          </form>
        </div>

        {/* Datasets list card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Uploaded Government Datasets</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Review, configure column mappings, and run Apache Spark SQL jobs
              </p>
            </div>
            <button onClick={refresh} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {!datasets.length ? (
            <EmptyState
              title="No datasets uploaded yet"
              message="Upload a government CSV or Excel file using the form to start."
            />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>File Name</th>
                    <th>Scheme</th>
                    <th>FY</th>
                    <th>Records</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>#{d.id}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.file_name}>
                        <div style={{ fontWeight: 500 }}>{d.file_name}</div>
                        {d.source && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Source: {d.source}</div>}
                      </td>
                      <td>
                        <span className="chip chip-blue">{d.scheme_id?.toUpperCase()}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{d.reporting_year || '—'}</td>
                      <td>{d.total_records ? d.total_records.toLocaleString() : '—'}</td>
                      <td>
                        <span style={{
                          ...STATUS_STYLES[d.status],
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 999,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openMappingModal(d.id)}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            title="Preview file rows and configure column mapping"
                          >
                            <Settings2 size={13} /> Map & Preview
                          </button>

                          {(d.status === 'uploaded' || d.status === 'failed') && (
                            <button
                              onClick={() => openMappingModal(d.id)}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                              title="Review mapping and start Spark processing"
                            >
                              <Play size={12} /> Process
                            </button>
                          )}

                          {d.status === 'processing' && (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={13} /> Processing...
                            </span>
                          )}

                          {d.status === 'processed' && (
                            <Link
                              to="/analytics"
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#065f46', borderColor: '#10b981' }}
                            >
                              View Analytics <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Interactive Column Mapping & 10-Row Preview Modal                          */}
      {/* ========================================================================= */}
      {activeModalDatasetId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: '100%',
            maxWidth: 1050,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                    Dataset Schema Mapping & Data Preview
                  </h3>
                  <span className="chip chip-blue">{previewData?.scheme_id?.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  File: <strong>{previewData?.file_name}</strong> | Detected Columns: <strong>{previewData?.detected_columns?.length || 0}</strong>
                </p>
              </div>

              <button
                onClick={() => setActiveModalDatasetId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              padding: '0 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'white',
            }}>
              <button
                onClick={() => setActiveTab('mapping')}
                style={{
                  padding: '0.75rem 0.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'mapping' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                  fontWeight: activeTab === 'mapping' ? 700 : 500,
                  color: activeTab === 'mapping' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Settings2 size={16} /> Indicator Column Mapping
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '0.75rem 0.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'preview' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                  fontWeight: activeTab === 'preview' ? 700 : 500,
                  color: activeTab === 'preview' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Table size={16} /> First 10 Rows Raw Preview ({previewData?.total_preview_rows || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {modalLoading ? (
                <LoadingSpinner message="Reading dataset structure and generating preview..." />
              ) : (
                <>
                  {/* TAB 1: COLUMN MAPPING */}
                  {activeTab === 'mapping' && (
                    <div>
                      {/* Validation Summary Alert Box */}
                      {validationResult && (
                        <div style={{
                          marginBottom: '1.5rem',
                          padding: '1rem',
                          borderRadius: 8,
                          background: validationResult.is_valid ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${validationResult.is_valid ? '#bbf7d0' : '#fecaca'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                            {validationResult.is_valid ? (
                              <>
                                <CheckCircle size={18} color="#16a34a" />
                                <strong style={{ color: '#166534', fontSize: '0.875rem' }}>
                                  Schema Validation Passed! Mandatory columns are correctly mapped.
                                </strong>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={18} color="#dc2626" />
                                <strong style={{ color: '#991b1b', fontSize: '0.875rem' }}>
                                  Schema Validation Failed — Please resolve the following errors:
                                </strong>
                              </>
                            )}
                          </div>

                          {validationResult.errors?.length > 0 && (
                            <ul style={{ margin: '0.5rem 0 0 1.5rem', color: '#991b1b', fontSize: '0.8rem' }}>
                              {validationResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                          )}

                          {validationResult.warnings?.length > 0 && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fed7aa' }}>
                              <p style={{ color: '#9a3412', fontSize: '0.75rem', fontWeight: 600, margin: '0 0 4px' }}>
                                Optional Indicators Notice:
                              </p>
                              <ul style={{ margin: '0 0 0 1.5rem', color: '#c2410c', fontSize: '0.75rem' }}>
                                {validationResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions */}
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                        Map your uploaded dataset columns to the scheme's canonical indicators.
                        Mandatory columns are required to identify geographical boundaries; optional indicators enable specific performance metrics.
                      </p>

                      {/* 1. MANDATORY INDICATORS */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}>
                            Mandatory Indicators (Required)
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Must be mapped to valid columns in your dataset
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {previewData?.required_columns?.map(code => {
                            const meta = previewData?.indicators?.[code] || {}
                            const selectedCol = userMapping[code] || ''
                            const isMissing = !selectedCol

                            return (
                              <div
                                key={code}
                                style={{
                                  border: `1.5px solid ${isMissing ? '#f87171' : 'var(--color-border)'}`,
                                  borderRadius: 8,
                                  padding: '0.85rem',
                                  background: isMissing ? '#fff5f5' : '#f8fafc',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                    {meta.label || code} <span style={{ color: '#ef4444' }}>*</span>
                                  </label>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Type: {meta.type}</span>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                  {meta.description}
                                </p>

                                <select
                                  value={selectedCol}
                                  onChange={e => handleMappingChange(code, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.6rem',
                                    borderRadius: 6,
                                    border: `1px solid ${isMissing ? '#ef4444' : 'var(--color-border)'}`,
                                    fontSize: '0.82rem',
                                    background: 'white',
                                    fontWeight: selectedCol ? 600 : 400,
                                  }}
                                >
                                  <option value="">-- Select Dataset Column (Required) --</option>
                                  {previewData?.detected_columns?.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* 2. OPTIONAL SCHEME INDICATORS */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}>
                            Optional Scheme Indicators
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Map whichever indicators exist in this reporting period
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {previewData?.optional_columns?.map(code => {
                            const meta = previewData?.indicators?.[code] || {}
                            const selectedCol = userMapping[code] || ''

                            return (
                              <div
                                key={code}
                                style={{
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 8,
                                  padding: '0.85rem',
                                  background: 'white',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                    {meta.label || code}
                                  </label>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Type: {meta.type}</span>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                  {meta.description}
                                </p>

                                <select
                                  value={selectedCol}
                                  onChange={e => handleMappingChange(code, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.6rem',
                                    borderRadius: 6,
                                    border: '1px solid var(--color-border)',
                                    fontSize: '0.82rem',
                                    background: selectedCol ? '#f0fdf4' : 'white',
                                    fontWeight: selectedCol ? 600 : 400,
                                  }}
                                >
                                  <option value="">-- Not Mapped (Unavailable in this file) --</option>
                                  {previewData?.detected_columns?.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RAW FIRST 10 ROWS PREVIEW */}
                  {activeTab === 'preview' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          Detected Columns in File ({previewData?.detected_columns?.length || 0}):
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                        {previewData?.detected_columns?.map(c => (
                          <span key={c} className="chip chip-gray" style={{ fontSize: '0.75rem' }}>
                            {c}
                          </span>
                        ))}
                      </div>

                      <div className="table-container" style={{ border: '1px solid var(--color-border)', borderRadius: 8 }}>
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>#</th>
                              {previewData?.detected_columns?.map(c => (
                                <th key={c} style={{ whiteSpace: 'nowrap' }}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData?.preview_rows?.map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                {previewData?.detected_columns?.map(c => (
                                  <td key={c} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                    {row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '' ? (
                                      String(row[c])
                                    ) : (
                                      <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>null</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handleValidateMapping}
                  className="btn-secondary"
                  disabled={validating || modalLoading}
                  style={{ fontSize: '0.82rem' }}
                >
                  <Check size={14} /> {validating ? 'Validating...' : 'Validate Mapping'}
                </button>

                <button
                  onClick={handleSaveMapping}
                  className="btn-secondary"
                  disabled={savingMapping || modalLoading}
                  style={{ fontSize: '0.82rem' }}
                >
                  Save Mapping
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setActiveModalDatasetId(null)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'white',
                    color: 'var(--color-text)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleProcessWithMapping}
                  className="btn-primary"
                  disabled={processingId !== null || modalLoading || (validationResult && !validationResult.is_valid)}
                  style={{
                    fontSize: '0.85rem',
                    opacity: (validationResult && !validationResult.is_valid) ? 0.5 : 1,
                    cursor: (validationResult && !validationResult.is_valid) ? 'not-allowed' : 'pointer',
                  }}
                  title={validationResult && !validationResult.is_valid ? 'Resolve mapping errors before processing' : 'Run Apache Spark SQL processing'}
                >
                  <Play size={14} />
                  {processingId ? 'Queuing Spark...' : 'Start Spark Processing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
