import React, { useState, useEffect, createContext, useContext } from 'react'
import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'

interface User {
  id: string
  username: string
  role: 'admin' | 'user'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  checkSession: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dakCount, setDakCount] = useState(0)
  const navigate = useNavigate()

  const fetchDakCount = async () => {
    if (!user || user.role === 'admin') return
    try {
      const res = await fetch('/api/dak/count')
      if (res.ok) {
        const data = await res.json()
        setDakCount(data.new_cases || 0)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDakCount()
      const handleRead = () => fetchDakCount()
      window.addEventListener('dak-read', handleRead)
      return () => window.removeEventListener('dak-read', handleRead)
    }
  }, [user])

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      }
    } catch (err) {
      console.error('Error fetching session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      navigate({ to: '/login' })
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const path = window.location.pathname
      if (!user && path !== '/login') {
        navigate({ to: '/login' })
      } else if (user && path === '/login') {
        navigate({ to: '/' })
      }
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center',
        alignItems: 'center', background: 'var(--paper)', fontFamily: 'sans-serif', gap: '15px'
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px', border: '4px solid var(--rule)',
          borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: 'var(--ink-soft)', fontWeight: 'bold' }}>Loading portal...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Login page layout without header
  if (!user && window.location.pathname === '/login') {
    return (
      <AuthContext.Provider value={{ user, isLoading, checkSession, logout }}>
        <div className="app-container">
          <Outlet />
        </div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, checkSession, logout }}>
      <div className="app-container">
        {/* Letterhead header (hidden on print) */}
        {user && (
          <>
            <div className="letterhead no-print" style={{
              backgroundColor: 'var(--paper-panel)',
              padding: '14px 28px 0 28px',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div className="letterhead-inner" style={{
                maxWidth: '1100px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                flexWrap: 'wrap',
                paddingBottom: '12px'
              }}>
                <svg className="seal" viewBox="0 0 100 100" role="img" aria-label="L and M Section seal" style={{
                  width: '46px',
                  height: '46px',
                  flexShrink: 0
                }}>
                  <circle cx="50" cy="50" r="47" fill="none" stroke="#a4802e" strokeWidth="2"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#a4802e" strokeWidth="1"/>
                  <text x="50" y="59" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontWeight="700" fontSize="30" fill="#241f16">L&amp;M</text>
                </svg>
                <div className="brand-block" style={{ marginRight: 'auto' }}>
                  <p className="brand-title" style={{
                    fontSize: '25px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    lineHeight: 1.1,
                    margin: 0,
                    color: 'var(--ink)'
                  }}>L&amp;M Section</p>
                  <p className="brand-sub" style={{
                    fontSize: '11px',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                    margin: '2px 0 0 0'
                  }}>Certificate &amp; Documentation Desk</p>
                </div>
                
                <div className="tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link
                    to="/"
                    className="tool-tab"
                    activeProps={{ className: 'tool-tab active' }}
                    activeOptions={{ exact: true }}
                    style={{ textDecoration: 'none' }}
                  >
                    Home
                  </Link>
                  <Link
                    to="/dak"
                    className="tool-tab"
                    activeProps={{ className: 'tool-tab active' }}
                    style={{ textDecoration: 'none', position: 'relative' }}
                  >
                    Dak
                    {dakCount > 0 && (
                      <span style={{
                        background: '#d32f2f', color: 'white', fontSize: '10px', fontWeight: 'bold',
                        padding: '2px 6px', borderRadius: '10px', marginLeft: '5px'
                      }}>
                        New Case received {dakCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/ndc"
                    className="tool-tab"
                    activeProps={{ className: 'tool-tab active' }}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className="dot" style={{ backgroundColor: 'var(--ndc-color)' }}></span> No Demand Certificate
                  </Link>
                  <Link
                    to="/dc"
                    className="tool-tab"
                    activeProps={{ className: 'tool-tab active' }}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className="dot" style={{ backgroundColor: 'var(--dc-color)' }}></span> Demand Certificate
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/users"
                      className="tool-tab"
                      activeProps={{ className: 'tool-tab active' }}
                      style={{ textDecoration: 'none' }}
                    >
                      🛡️ User Management
                    </Link>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '15px', paddingLeft: '15px', borderLeft: '1px solid var(--rule)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                      Logged in as: <strong style={{ color: 'var(--ink)' }}>{user.username}</strong> ({user.role})
                    </span>
                    <button onClick={logout} className="tool-tab logout-btn" style={{
                      padding: '5px 10px',
                      background: '#d32f2f',
                      color: 'white',
                      borderColor: '#d32f2f',
                      fontSize: '12px'
                    }}>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="rule-double no-print" style={{
              maxWidth: '1100px',
              margin: '0 auto',
              borderTop: '2px solid var(--ink)',
              borderBottom: '1px solid var(--ink)',
              height: '3px',
              width: '100%'
            }}></div>
          </>
        )}

        {/* Main Content Area */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        <style>{`
          .tool-tab {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 8px 15px;
            border-radius: 3px;
            border: 1px solid var(--rule);
            background: transparent;
            color: var(--ink-soft);
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.01em;
            cursor: pointer;
            transition: var(--transition);
            user-select: none;
          }
          .tool-tab:hover {
            background: rgba(164,128,46,0.08);
            color: var(--ink);
          }
          .tool-tab .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .tool-tab.active {
            background: var(--ink);
            border-color: var(--ink);
            color: #fff;
          }
          .tool-tab.active[href="/"] {
            background: var(--gold);
            border-color: var(--gold);
          }
          .tool-tab.active[href="/ndc"] {
            background: var(--ndc-color);
            border-color: var(--ndc-color);
          }
          .tool-tab.active[href="/dc"] {
            background: var(--dc-color);
            border-color: var(--dc-color);
          }
          .tool-tab.active[href="/users"] {
            background: #673ab7;
            border-color: #673ab7;
          }
          .logout-btn:hover {
            background: #b71c1c !important;
            border-color: #b71c1c !important;
            color: white !important;
          }
        `}</style>
      </div>
    </AuthContext.Provider>
  )
}
export { useContext }
