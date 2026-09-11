import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

// UX CONVENIENCE ONLY: this guard performs a pre-render check against
// GET /api/me purely to avoid flashing protected dashboard markup before
// redirecting an unauthenticated visitor to /login. It is NOT the real
// authorization boundary. GET /api/dashboard (the actual backend endpoint)
// enforces its own session check server-side, and that remains the true
// access control regardless of what this component decides. Even if this
// guard is bypassed, misconfigured, or removed, the backend must still
// reject unauthenticated requests to /api/dashboard.
export default function DashboardGuard({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'authorized' | 'unauthorized'

  useEffect(() => {
    let cancelled = false

    fetch('/api/me', { credentials: 'include' })
      .then((response) => {
        if (cancelled) return
        setStatus(response.ok ? 'authorized' : 'unauthorized')
      })
      .catch(() => {
        // Fail closed: any network/fetch error is treated the same as an
        // unauthenticated session, matching the legacy AngularJS
        // DashboardCtrl behavior of redirecting to /login on any failure.
        if (cancelled) return
        setStatus('unauthorized')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return null
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace />
  }

  return children
}
