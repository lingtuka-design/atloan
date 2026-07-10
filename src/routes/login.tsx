import React, { useState, useContext } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthContext } from './__root'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Username leh password chhu rawh le')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      })

      if (res.ok) {
        if (auth) {
          await auth.checkSession()
        }
        navigate({ to: '/' })
      } else {
        const data = await res.json()
        setError(data.error || 'Login a hlawhchham')
      }
    } catch (err) {
      console.error(err)
      setError('Connection failed. Database a nung em?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--paper)',
      backgroundSize: '24px 24px',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'white',
        border: '1px solid var(--rule)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        padding: '35px 30px',
        boxSizing: 'border-box'
      }}>
        {/* Header Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
          <svg viewBox="0 0 100 100" style={{ width: '60px', height: '60px', marginBottom: '12px' }}>
            <circle cx="50" cy="50" r="47" fill="none" stroke="#a4802e" strokeWidth="2.5"/>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#a4802e" strokeWidth="1.2"/>
            <text x="50" y="59" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="30" fill="#241f16">L&amp;M</text>
          </svg>
          <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--ink)', fontWeight: 'bold' }}>L&amp;M Section Portal</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Accounts &amp; Treasuries Department
          </p>
        </div>

        {error && (
          <div style={{
            background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2',
            padding: '10px 12px', borderRadius: '4px', fontSize: '14px',
            marginBottom: '20px', fontWeight: 'bold', textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="input-box" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--ink-soft)' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="I username chhut tur"
              disabled={loading}
              autoFocus
              style={{ padding: '10px', fontSize: '15px' }}
            />
          </div>

          <div className="input-box" style={{ marginBottom: 0 }}>
            <label style={{ color: 'var(--ink-soft)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="I password chhut tur"
              disabled={loading}
              style={{ padding: '10px', fontSize: '15px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-calc"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '15px',
              fontWeight: 'bold',
              background: 'var(--gold)',
              borderColor: 'var(--gold)',
              color: 'white',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '4px',
              marginTop: '10px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '25px', textAlign: 'center', fontSize: '11px',
          color: 'var(--ink-soft)', borderTop: '1px solid #eee', paddingTop: '15px'
        }}>
          <div>Default Admin Username: <strong style={{ color: 'var(--ink)' }}>mala</strong></div>
          <div style={{ marginTop: '2px' }}>Default Password: <strong style={{ color: 'var(--ink)' }}>12345</strong></div>
        </div>
      </div>
    </div>
  )
}
