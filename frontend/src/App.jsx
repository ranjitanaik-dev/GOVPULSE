import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import OfficerLogin from './pages/OfficerLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DatasetManagement from './pages/DatasetManagement.jsx'
import SchemeExplorer from './pages/SchemeExplorer.jsx'
import PerformanceAnalytics from './pages/PerformanceAnalytics.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Portal Experience */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<OfficerLogin />} />

          {/* Protected Administrative Officer Workspace */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/datasets" element={<DatasetManagement />} />
            <Route path="/schemes" element={<SchemeExplorer />} />
            <Route path="/analytics" element={<PerformanceAnalytics />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
