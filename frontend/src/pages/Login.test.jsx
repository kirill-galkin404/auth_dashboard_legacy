import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login.jsx'

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

async function fillAndSubmit(username = 'admin', password = 'wrongpass') {
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: username } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /log in|signing in/i }))
}

describe('Login', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks submission and shows a validation message when fields are empty', async () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/required/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('shows a distinct message for bad credentials (401)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, error: 'bad credentials' }),
    })

    renderLogin()
    await fillAndSubmit()

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument()
  })

  it('shows a distinct message for a server error (5xx)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: 'internal error' }),
    })

    renderLogin()
    await fillAndSubmit()

    expect(await screen.findByText('Server error, please try again later')).toBeInTheDocument()
  })

  it('shows a distinct message for a network failure', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    renderLogin()
    await fillAndSubmit()

    expect(
      await screen.findByText('Network error - check your connection and try again')
    ).toBeInTheDocument()
  })

  it('renders three distinct error messages for the three failure causes', async () => {
    const messages = new Set()

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, error: 'bad credentials' }),
    })
    const { unmount: unmount1 } = renderLogin()
    await fillAndSubmit()
    messages.add((await screen.findByText(/./, { selector: '.error' })).textContent)
    unmount1()

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ ok: false }),
    })
    const { unmount: unmount2 } = renderLogin()
    await fillAndSubmit()
    messages.add((await screen.findByText(/./, { selector: '.error' })).textContent)
    unmount2()

    global.fetch.mockRejectedValueOnce(new TypeError('network down'))
    renderLogin()
    await fillAndSubmit()
    messages.add((await screen.findByText(/./, { selector: '.error' })).textContent)

    expect(messages.size).toBe(3)
  })

  it('does not navigate on a non-ok/non-json body even if the promise resolves', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: false }),
    })

    renderLogin()
    await fillAndSubmit('admin', 'admin123')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument()
  })

  it('does not render the admin/admin123 credential hint', () => {
    renderLogin()
    expect(screen.queryByText(/admin123/i)).not.toBeInTheDocument()
  })

  it('disables the submit button while the request is in flight', async () => {
    let resolveFetch
    global.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    renderLogin()
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })

    resolveFetch({ ok: true, status: 200, json: async () => ({ ok: true, username: 'admin' }) })
  })
})
