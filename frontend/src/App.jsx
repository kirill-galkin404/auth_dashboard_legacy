import React from 'react'
import AppRoutes from './routes.jsx'

// Thin app shell, mirroring legacy AngularJS `<div ng-view>`.
// Route configuration itself lives in routes.jsx.
export default function App() {
  return <AppRoutes />
}
