import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || err.message || 'Network error'
    console.error('[GovPulse API Error]', msg)
    return Promise.reject(new Error(msg))
  }
)

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
}

export const datasetsAPI = {
  upload: (formData) => api.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  list: (schemeId) => api.get('/datasets', { params: schemeId ? { scheme_id: schemeId } : {} }),
  get: (id) => api.get(`/datasets/${id}`),
  process: (id) => api.post(`/datasets/${id}/process`),
}

export const jobsAPI = {
  get: (id) => api.get(`/jobs/${id}`),
  list: () => api.get('/jobs'),
}

export const schemesAPI = {
  list: () => api.get('/schemes'),
  get: (id) => api.get(`/schemes/${id}`),
}

export const analyticsAPI = {
  scheme: (schemeId, year) => api.get(`/analytics/scheme/${schemeId}`, { params: year ? { reporting_year: year } : {} }),
  states: (schemeId) => api.get('/analytics/states', { params: schemeId ? { scheme_id: schemeId } : {} }),
  districts: (schemeId, state) => api.get('/analytics/districts', { params: { scheme_id: schemeId, state } }),
  trends: (schemeId) => api.get('/analytics/trends', { params: schemeId ? { scheme_id: schemeId } : {} }),
  rankings: (schemeId) => api.get('/analytics/rankings', { params: schemeId ? { scheme_id: schemeId } : {} }),
  alerts: (schemeId) => api.get('/analytics/alerts', { params: schemeId ? { scheme_id: schemeId } : {} }),
}

export const reportsAPI = {
  exportCsv: (schemeId, resultType) =>
    `/api/reports/export?scheme_id=${schemeId}&result_type=${resultType || 'state_performance'}`,
}

export default api
