import React, { createContext, useContext, useEffect, useState } from 'react'
import { CrossDomainAuth } from '@/lib/cross-domain-auth'

interface User {
  id: string
  email: string
  fullName?: string
  avatar?: string
}

interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

interface AuthContextType {
  user: User | null
  profile: any | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; requiresConfirmation?: boolean; message?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // In development, this might happen during hot reload
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth called outside of AuthProvider - this might be due to hot reload')
      // Return a default context to prevent crashes
      return {
        user: null,
        profile: null,
        session: null,
        loading: true,
        signIn: async () => ({ error: 'Not authenticated' }),
        signUp: async () => ({ error: 'Not authenticated' }),
        signOut: async () => {},
        resetPassword: async () => ({ error: 'Not authenticated' }),
        updatePassword: async () => ({ error: 'Not authenticated' }),
      } as AuthContextType
    }
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session using cross-domain auth
    const getInitialSession = async () => {
      try {
        const token = CrossDomainAuth.getAuthToken()
        if (token) {
          const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
            setProfile(data.user)
            
            // Reconstruct session from token
            const sessionData = {
              access_token: token,
              refresh_token: '', // We'll handle this if needed
              expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
              user: data.user
            }
            setSession(sessionData)
          } else {
            // Token is invalid, check if we're on a subdomain
            if (CrossDomainAuth.isSubdomain()) {
              // Check if we're already on an auth page to prevent loops
              const currentPath = window.location.pathname
              if (currentPath.includes('/login') || currentPath.includes('/register')) {
                console.warn('Already on auth page, skipping redirect to prevent loop')
                CrossDomainAuth.clearAuthToken()
                return
              }
              // On subdomain without valid token, redirect to main domain for auth
              CrossDomainAuth.redirectToMainDomainForAuth()
              return
            } else {
              // On main domain, just remove invalid token
              CrossDomainAuth.clearAuthToken()
            }
          }
        } else {
          // No token, check if we're on a subdomain
          if (CrossDomainAuth.isSubdomain()) {
            // Check if we're already on an auth page to prevent loops
            const currentPath = window.location.pathname
            if (currentPath.includes('/login') || currentPath.includes('/register')) {
              console.warn('Already on auth page, skipping redirect to prevent loop')
              return
            }
            // On subdomain without token, redirect to main domain for auth
            CrossDomainAuth.redirectToMainDomainForAuth()
            return
          }
        }
      } catch (error) {
        console.error('Error getting session:', error)
        CrossDomainAuth.clearAuthToken()
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Falha no login' }
      }

      // Store token and update state using cross-domain auth with sync
      CrossDomainAuth.syncLogin(data.session.access_token)
      setUser(data.user)
      setProfile(data.user)
      setSession({
        ...data.session,
        user: data.user
      })

      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: 'Falha na conexão' }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Falha no registro' }
      }

      // If user was created and session exists, store token
      if (data.user && data.session) {
        CrossDomainAuth.syncLogin(data.session.access_token)
        setUser(data.user)
        setProfile(data.user)
        setSession({
          ...data.session,
          user: data.user
        })
      }

      return { 
        error: null, 
        requiresConfirmation: data.requiresConfirmation || false,
        message: data.message || 'Conta criada com sucesso'
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'Falha na conexão' }
    }
  }

  const signOut = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        await fetch(`${API_URL}/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      CrossDomainAuth.syncLogout()
      setUser(null)
      setSession(null)
      setProfile(null)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Falha ao enviar email de recuperação' }
      }

      return { error: null }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error: 'Falha na conexão' }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { error: 'Usuário não logado' }
      }

      const response = await fetch(`${API_URL}/auth/update-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Falha ao atualizar senha' }
      }

      return { error: null }
    } catch (error) {
      console.error('Update password error:', error)
      return { error: 'Falha na conexão' }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}