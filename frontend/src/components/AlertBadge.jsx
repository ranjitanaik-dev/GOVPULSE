import React from 'react'

export default function AlertBadge({ band }) {
  const map = {
    'On Track': 'badge-on-track',
    'Needs Attention': 'badge-needs-attention',
    'Low Achievement': 'badge-low-achievement',
  }
  return <span className={map[band] || 'chip chip-gray'}>{band}</span>
}
