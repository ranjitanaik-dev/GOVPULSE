import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DatasetManagement from './pages/DatasetManagement.jsx'
import SchemeExplorer from './pages/SchemeExplorer.jsx'
import PerformanceAnalytics from './pages/PerformanceAnalytics.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="datasets" element={<DatasetManagement />} />
          <Route path="schemes" element={<SchemeExplorer />} />
          <Route path="analytics" element={<PerformanceAnalytics />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
