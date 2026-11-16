import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_BASE = 'http://127.0.0.1:8000'

export function AuthProvider({ children }) {
  const [officer, setOfficer] = useState(null)
  const [token, setToken] = useState(() => sessionStorage.getItem('govpulse_officer_token') || null)
  const [isLoading, setIsLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setOfficer(data)
        } else {
          // Token expired or invalid
          sessionStorage.removeItem('govpulse_officer_token')
          setToken(null)
          setOfficer(null)
        }
      } catch (err) {
        console.error('Session verification network error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    verifySession()
  }, [token])

  async function login(officerId, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officer_id: officerId, password }),
    })

    if (!res.ok) {
      let errorMsg = 'Authentication failed. Please verify your Officer ID and password.'
      try {
        const errData = await res.json()
        if (errData.detail) {
          errorMsg = typeof errData.detail === 'string' ? errData.detail : errorMsg
        }
      } catch (_) {}
      throw new Error(errorMsg)
    }

    const data = await res.json()
    sessionStorage.setItem('govpulse_officer_token', data.access_token)
    setToken(data.access_token)
    setOfficer(data.officer)
    return data.officer
  }

  async function logout() {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (e) {
        // Continue local cleanup even if network fails
      }
    }
    sessionStorage.removeItem('govpulse_officer_token')
    setToken(null)
    setOfficer(null)
  }

  return (
    <AuthContext.Provider
      value={{
        officer,
        token,
        isAuthenticated: !!officer,
        isLoading,
        loading: isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
