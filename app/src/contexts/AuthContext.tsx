'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/lib/types';
import { SessionSync } from '@/lib/auth/session-sync';
import { SessionManager, Session } from '@/lib/auth/session-manager';
import { CrossDomainAuth } from '@/lib/auth/cross-domain-auth';
import { API_URL } from '@/lib/api-config';

interface AuthContextType {
  user: User | null;
  profile: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; requiresConfirmation?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth called outside of AuthProvider - this might be due to hot reload');
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
      } as AuthContextType;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial session - independent authentication per domain
    const getInitialSession = async () => {
      try {
        // Small delay to ensure localStorage is ready
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Check for local session first
        const sharedSession = SessionSync.checkSharedSession()
        if (sharedSession) {
          const userWithDefaults = {
            ...sharedSession.user,
            fullName: sharedSession.user.fullName || null,
            avatar: sharedSession.user.avatar || null,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          setUser(userWithDefaults)
          setProfile(userWithDefaults)
          setSession(sharedSession)
          setLoading(false)
          return
        }

        // No local session found - check for cross-domain session
        const crossDomainToken = CrossDomainAuth.getAuthToken()
        if (crossDomainToken) {
          const validatedSession = await SessionSync.validateToken(crossDomainToken)
          if (validatedSession) {
            const userWithDefaults = {
              ...validatedSession.user,
              fullName: validatedSession.user.fullName || null,
              avatar: validatedSession.user.avatar || null,
              lastLoginAt: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
            setUser(userWithDefaults)
            setProfile(userWithDefaults)
            setSession(validatedSession)
            setLoading(false)
            return
          }
        }
        
        // No valid session found anywhere
        if (SessionSync.isOnSubdomain()) {
          const currentPath = window.location.pathname
          if (!currentPath.includes('/login') && !currentPath.includes('/register') && currentPath !== '/' && currentPath !== '') {
            SessionSync.redirectToMainForAuth()
            return
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error)
        SessionSync.clearAllSessions()
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

      // Store session locally and in cross-domain auth
      SessionSync.syncSession(data.session)
      CrossDomainAuth.setAuthToken(data.session.access_token)
      setUser(data.user)
      setProfile(data.user)
      setSession(data.session)

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

      // If user was created and session exists, store session locally and cross-domain
      if (data.user && data.session) {
        SessionSync.syncSession(data.session)
        CrossDomainAuth.setAuthToken(data.session.access_token)
        setUser(data.user)
        setProfile(data.user)
        setSession(data.session)
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
      const token = CrossDomainAuth.getAuthToken()
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
      console.error('Erro no logout:', error)
    } finally {
      SessionSync.clearAllSessions()
      setUser(null)
      setProfile(null)
      setSession(null)
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
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Falha ao enviar email de recuperação' };
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: 'Falha na conexão' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const token = SessionManager.getToken()
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
