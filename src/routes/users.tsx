import React, { useState, useEffect, useContext } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthContext } from './__root'

export const Route = createFileRoute('/users')({
  component: UsersComponent,
})

interface UserRecord {
  id: string
  username: string
  role: 'admin' | 'user'
  created_at: string
}

function UsersComponent() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  
  const [usersList, setUsersList] = useState<UserRecord[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('user')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null)
  const [newPasswordVal, setNewPasswordVal] = useState('')

  const handleUpdatePassword = async (userId: string) => {
    if (!newPasswordVal.trim()) {
      alert('Password a thlawn thei lo')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          password: newPasswordVal.trim()
        })
      })

      if (res.ok) {
        setMessage('Password thlak a ni ta!')
        setEditingPasswordUserId(null)
        setNewPasswordVal('')
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Password thlak a hlawhchham')
      }
    } catch (err) {
      console.error(err)
      setError('Connection error changing password')
    } finally {
      setLoading(false)
    }
  }

  // Redirect if not admin
  useEffect(() => {
    if (auth && !auth.isLoading) {
      if (!auth.user) {
        navigate({ to: '/login' })
      } else if (auth.user.role !== 'admin') {
        navigate({ to: '/' })
      }
    }
  }, [auth, navigate])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users')
      if (res.ok) {
        const data = await res.json()
        setUsersList(data)
      } else {
        const err = await res.json()
        setError(err.error || 'Users load na a hlawhchham')
      }
    } catch (err) {
      console.error(err)
      setError('Connection error fetching users')
    }
  }

  useEffect(() => {
    if (auth?.user?.role === 'admin') {
      fetchUsers()
    }
  }, [auth])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!username.trim() || !password.trim()) {
      setError('Form hi thun kim rawh le')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          role
        })
      })

      if (res.ok) {
        setMessage('User thar siam a ni ta!')
        setUsername('')
        setPassword('')
        setRole('user')
        fetchUsers() // Refresh list
      } else {
        const data = await res.json()
        setError(data.error || 'User siam a hlawhchham')
      }
    } catch (err) {
      console.error(err)
      setError('Connection failed. Database server biak theih a ni lo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (targetId: string, targetName: string) => {
    if (auth?.user?.id === targetId) {
      alert('I mahni account i in delete thei lo!')
      return
    }

    if (!confirm(`'${targetName}' hi i delete duh tak tak em?`)) {
      return
    }

    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/auth/users?id=${targetId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setMessage('Account chu delete a ni ta!')
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Account delete a hlawhchham')
      }
    } catch (err) {
      console.error(err)
      setError('Connection failed deleting user')
    }
  }

  if (auth?.isLoading || auth?.user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-soft)' }}>
        Loading credentials...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
      
      {/* Creation form (left side) */}
      <div style={{
        flex: '1 0 350px', background: 'white', border: '1px solid var(--rule)',
        borderRadius: '8px', boxShadow: 'var(--shadow-md)', padding: '25px', height: 'fit-content'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#673ab7', fontSize: '20px', borderBottom: '1px solid var(--rule)', paddingBottom: '10px' }}>
          🛡️ Create User Account
        </h3>

        {error && <div style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px', fontWeight: 'bold' }}>{error}</div>}
        {message && <div style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px', fontWeight: 'bold' }}>{message}</div>}

        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="input-box" style={{ marginBottom: 0 }}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. staff1"
              disabled={loading}
            />
          </div>

          <div className="input-box" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="input-box" style={{ marginBottom: 0 }}>
            <label>Access Role</label>
            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} disabled={loading}>
              <option value="user">User (Regular Staff - isolated files)</option>
              <option value="admin">Admin (Full administrative access)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px', background: '#673ab7', borderColor: '#673ab7',
              color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px',
              fontWeight: 'bold', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', marginTop: '5px'
            }}
          >
            {loading ? 'Creating...' : '➕ CREATE ACCOUNT'}
          </button>
        </form>
      </div>

      {/* User list table (right side) */}
      <div style={{
        flex: '2 0 500px', background: 'white', border: '1px solid var(--rule)',
        borderRadius: '8px', boxShadow: 'var(--shadow-md)', padding: '25px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--ink)', fontSize: '20px', borderBottom: '1px solid var(--rule)', paddingBottom: '10px' }}>
          👥 Registered Accounts
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--rule)', color: 'var(--ink-soft)' }}>
              <th style={{ padding: '12px 8px', fontWeight: '600' }}>Username</th>
              <th style={{ padding: '12px 8px', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '12px 8px', fontWeight: '600' }}>Created At</th>
              <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{u.username}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                    background: u.role === 'admin' ? '#ede7f6' : '#eceff1',
                    color: u.role === 'admin' ? '#5e35b1' : '#455a64'
                  }}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--ink-soft)' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  {editingPasswordUserId === u.id ? (
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPasswordVal}
                        onChange={e => setNewPasswordVal(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--rule)', borderRadius: '3px', width: '110px' }}
                      />
                      <button
                        onClick={() => handleUpdatePassword(u.id)}
                        style={{ background: '#2e7d32', color: 'white', border: 'none', borderRadius: '3px', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingPasswordUserId(null); setNewPasswordVal(''); }}
                        style={{ background: '#757575', color: 'white', border: 'none', borderRadius: '3px', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setEditingPasswordUserId(u.id); setNewPasswordVal(''); }}
                        style={{
                          background: 'transparent', color: '#673ab7', border: '1px solid #673ab7',
                          borderRadius: '3px', padding: '3px 8px', fontSize: '12px', fontWeight: 'bold',
                          cursor: 'pointer', transition: '0.2s'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#673ab7'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#673ab7'
                        }}
                      >
                        Change Password
                      </button>

                      {u.id === auth.user?.id ? (
                        <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontStyle: 'italic', alignSelf: 'center', marginLeft: '5px' }}>Current User</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          style={{
                            background: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f',
                            borderRadius: '3px', padding: '3px 8px', fontSize: '12px', fontWeight: 'bold',
                            cursor: 'pointer', transition: '0.2s'
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#d32f2f'
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#d32f2f'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
