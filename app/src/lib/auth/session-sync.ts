// Session Sync - Sincroniza sessões entre domínios
// Este módulo garante que a autenticação funcione entre domínio principal e subdomínios

import { SessionManager, Session } from './session-manager'
import { CrossDomainAuth } from './cross-domain-auth'

export class SessionSync {
  /**
   * Sincronizar sessão localmente apenas (sem cross-domain)
   */
  static syncSession(session: Session) {
    // Salvar apenas na SessionManager (sem cross-domain sync)
    SessionManager.saveSession(session)
  }

  /**
   * Verificar se há sessão local apenas
   */
  static checkSharedSession(): Session | null {
    
    // Verificar apenas SessionManager (sem cross-domain)
    const localSession = SessionManager.getSession()
    if (localSession) {
      return localSession
    }

    return null
  }

  /**
   * Validar token com backend
   */
  static async validateToken(token: string): Promise<Session | null> {
    try {
      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '')
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        // Criar sessão
        const session: Session = {
          access_token: token,
          refresh_token: '',
          expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 dias
          user: data.user
        }
        
        // Salvar sessão
        SessionManager.saveSession(session)
        
        return session
      } else {
        CrossDomainAuth.clearAuthToken()
        SessionManager.clearSession()
        return null
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Limpar sessão local apenas
   */
  static clearAllSessions() {
    // Clear session manager
    SessionManager.clearSession()
    
    // Clear localStorage completely
    localStorage.removeItem('auth_token')
    localStorage.removeItem('session_data')
    localStorage.removeItem('user_data')
    
    // Clear sessionStorage
    sessionStorage.clear()
    
  }

  /**
   * Verificar se estamos em um subdomínio
   */
  static isOnSubdomain(): boolean {
    return CrossDomainAuth.isSubdomain()
  }

  /**
   * Obter domínio principal
   */
  static getMainDomain(): string {
    return CrossDomainAuth.getMainDomain()
  }

  /**
   * Redirecionar para domínio principal para autenticação
   */
  static redirectToMainForAuth() {
    CrossDomainAuth.redirectToMainDomainForAuth()
  }

  /**
   * Lidar com redirecionamento após autenticação
   */
  static handleAuthRedirect() {
    CrossDomainAuth.handleAuthRedirect()
  }

  /**
   * Verificar se a sessão está próxima do vencimento
   */
  static isSessionExpiringSoon(): boolean {
    return SessionManager.isSessionExpiringSoon()
  }

  /**
   * Renovar sessão se necessário
   */
  static async refreshSessionIfNeeded(): Promise<boolean> {
    if (this.isSessionExpiringSoon()) {
      
      const token = SessionManager.getToken()
      if (!token) return false

      try {
        const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '')
        const response = await fetch(`${API_URL}/auth/session`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          SessionManager.refreshSession(data.session.access_token)
          return true
        }
      } catch (error) {
        console.error('Erro ao renovar sessão:', error)
      }
    }

    return false
  }
}
