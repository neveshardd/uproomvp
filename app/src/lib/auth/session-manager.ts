// Session Manager - Gerencia sessões de autenticação
// Este módulo substitui o Supabase Auth por um sistema baseado em JWT

export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
    fullName?: string
    avatar?: string
  }
}

export interface User {
  id: string
  email: string
  fullName?: string
  avatar?: string
}

export class SessionManager {
  private static readonly SESSION_KEY = 'auth_session'
  private static readonly TOKEN_KEY = 'auth_token'

  /**
   * Salvar sessão no localStorage
   */
  static saveSession(session: Session): void {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      localStorage.setItem(this.TOKEN_KEY, session.access_token)
      
      const saved = localStorage.getItem(this.SESSION_KEY)
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
    }
  }

  /**
   * Obter sessão do localStorage
   */
  static getSession(): Session | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session: Session = JSON.parse(sessionData)
      
      if (session.expires_at && Date.now() > session.expires_at) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error('Erro ao obter sessão:', error)
      this.clearSession()
      return null
    }
  }

  /**
   * Obter token de acesso
   */
  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY)
    } catch (error) {
      console.error('Erro ao obter token:', error)
      return null
    }
  }

  /**
   * Verificar se o usuário está autenticado
   */
  static isAuthenticated(): boolean {
    const session = this.getSession()
    return session !== null && session.access_token !== null
  }

  /**
   * Obter usuário atual
   */
  static getCurrentUser(): User | null {
    const session = this.getSession()
    return session?.user || null
  }

  /**
   * Limpar sessão
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY)
      localStorage.removeItem(this.TOKEN_KEY)
    } catch (error) {
      console.error('Erro ao limpar sessão:', error)
    }
  }

  /**
   * Renovar sessão com novo token
   */
  static refreshSession(newToken: string): void {
    const session = this.getSession()
    if (session) {
      session.access_token = newToken
      session.expires_at = Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dias
      this.saveSession(session)
      console.log('Sessão renovada')
    }
  }

  /**
   * Verificar se a sessão está próxima do vencimento
   */
  static isSessionExpiringSoon(): boolean {
    const session = this.getSession()
    if (!session) return false

    const timeUntilExpiry = session.expires_at - Date.now()
    const oneHour = 60 * 60 * 1000 // 1 hora em millisegundos

    return timeUntilExpiry < oneHour
  }

  /**
   * Obter tempo restante da sessão em minutos
   */
  static getSessionTimeRemaining(): number {
    const session = this.getSession()
    if (!session) return 0

    const timeUntilExpiry = session.expires_at - Date.now()
    return Math.max(0, Math.floor(timeUntilExpiry / (60 * 1000))) // minutos
  }
}
