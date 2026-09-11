import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DASHBOARD_LOAD_ERROR = 'Could not load dashboard data, please try again.'
const LOGOUT_ERROR = 'Log out failed, please try again.'

export default function Dashboard() {
  const [username, setUsername] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/dashboard', { credentials: 'include' })

      // GET /api/dashboard is the REAL authorization boundary (per the plan's
      // decision) - DashboardGuard's /api/me pre-check is UX-only. If the
      // session has expired since the guard last checked, this endpoint will
      // return 401 and we must fail closed by redirecting to /login here too.
      if (response.status === 401) {
        navigate('/login', { replace: true })
        return
      }

      if (!response.ok) {
        setError(DASHBOARD_LOAD_ERROR)
        return
      }

      const body = await response.json()
      setData(body)
    } catch (networkErr) {
      setError(DASHBOARD_LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (body && body.username) {
          setUsername(body.username)
        }
      })
      .catch(() => {
        // Non-fatal: the header greeting is a nice-to-have, not the
        // authorization check. loadDashboard() below is what enforces access.
      })

    // Initial load only. No polling, no setInterval/setTimeout, no
    // refetch-on-focus - data only reloads on mount or an explicit
    // "Refresh" button click (see handleRefresh), matching legacy behavior.
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRefresh() {
    loadDashboard()
  }

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // Clear client-held session/dashboard state before navigating away.
        setData(null)
        setUsername('')
        navigate('/login')
        return
      }

      // Failure: stay on the dashboard with existing data/session state
      // intact, but (unlike legacy) surface a small error message.
      setLogoutError(LOGOUT_ERROR)
    } catch (networkErr) {
      setLogoutError(LOGOUT_ERROR)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard{username ? ` - ${username}` : ''}</h1>
        <div className="actions">
          <button type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </header>

      {logoutError && <p className="error">{logoutError}</p>}
      {error && <p className="error">{error}</p>}

      {loading && !data && <p>Loading dashboard...</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{data.kpis.revenue}</div>
              <div className="kpi-label">Revenue</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{data.kpis.users}</div>
              <div className="kpi-label">Users</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{data.kpis.orders}</div>
              <div className="kpi-label">Orders</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{data.kpis.conversion}</div>
              <div className="kpi-label">Conversion</div>
            </div>
          </div>

          <div className="txns-table-wrap">
            <table className="txns-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.customer}</td>
                    <td>{t.amount}</td>
                    <td>
                      <span className={'status-badge ' + t.status}>{t.status}</span>
                    </td>
                    <td>{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
