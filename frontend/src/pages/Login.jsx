import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VALIDATION_MESSAGE = 'Username and password are required.'
const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password'
const SERVER_ERROR_MESSAGE = 'Server error, please try again later'
const NETWORK_ERROR_MESSAGE = 'Network error - check your connection and try again'
const UNEXPECTED_ERROR_MESSAGE = 'Unexpected error, please try again'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError(VALIDATION_MESSAGE)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (response.status === 401) {
        setError(INVALID_CREDENTIALS_MESSAGE)
        return
      }

      if (response.status >= 500) {
        setError(SERVER_ERROR_MESSAGE)
        return
      }

      let body = null
      try {
        body = await response.json()
      } catch (parseErr) {
        body = null
      }

      if (response.ok && body && body.ok === true) {
        navigate('/dashboard')
        return
      }

      if (!response.ok) {
        setError(INVALID_CREDENTIALS_MESSAGE)
        return
      }

      setError(UNEXPECTED_ERROR_MESSAGE)
    } catch (networkErr) {
      setError(NETWORK_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoFocus
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}
