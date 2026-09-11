import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DashboardGuard from './DashboardGuard.jsx'

describe('DashboardGuard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function renderWithRouter() {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <DashboardGuard>
                <div data-testid="protected">secret</div>
              </DashboardGuard>
            }
          />
          <Route path="/login" element={<div>login page marker</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('redirects to /login on a 401 from GET /api/me, without ever mounting children', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401 })

    renderWithRouter()

    // While the fetch is pending, protected content must not be present.
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('login page marker')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/me', { credentials: 'include' })
  })

  it('renders children once GET /api/me resolves with 200', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ username: 'alice' }) })

    renderWithRouter()

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('protected')).toBeInTheDocument()
    })

    expect(screen.queryByText('login page marker')).not.toBeInTheDocument()
  })

  it('fails closed and redirects to /login when the fetch itself rejects (network error)', async () => {
    fetch.mockRejectedValueOnce(new Error('network down'))

    renderWithRouter()

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('login page marker')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
  })
})
