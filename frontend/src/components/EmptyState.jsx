import React from 'react'
import { Database } from 'lucide-react'

export default function EmptyState({ title = 'No data available', message, action }) {
  return (
    <div className="empty-state">
      <Database size={48} />
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', margin: '1rem 0 0.5rem' }}>
        {title}
      </h3>
      {message && <p style={{ fontSize: '0.875rem', maxWidth: 400 }}>{message}</p>}
      {action && <div style={{ marginTop: '1.5rem' }}>{action}</div>}
    </div>
  )
}
