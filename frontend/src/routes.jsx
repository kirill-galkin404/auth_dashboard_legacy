import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DashboardGuard from './routes/DashboardGuard.jsx'

// Mirrors the legacy AngularJS routing table:
//   .when('/login', {...LoginCtrl})
//   .when('/dashboard', {...DashboardCtrl})
//   .otherwise({redirectTo: '/login'})
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <DashboardGuard>
            <Dashboard />
          </DashboardGuard>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
