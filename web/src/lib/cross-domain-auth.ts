// Cross-domain authentication service
// This handles authentication sharing between main domain and subdomains

export class CrossDomainAuth {
  private static readonly AUTH_COOKIE_NAME = 'auth_token'
  private static readonly AUTH_COOKIE_DOMAIN = process.env.NODE_ENV === 'production' 
    ? process.env.VITE_DOMAIN || 'uproom.com'
    : 'localhost'

  /**
   * Set authentication token in a cookie that can be shared across subdomains
   */
  static setAuthToken(token: string) {
    // Set in localStorage for current domain
    localStorage.setItem('auth_token', token)
    
    // Also set in cookie for cross-domain sharing
    const expires = new Date()
    expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 days
    
    document.cookie = `${this.AUTH_COOKIE_NAME}=${token}; expires=${expires.toUTCString()}; domain=.${this.AUTH_COOKIE_DOMAIN}; path=/; secure=${window.location.protocol === 'https:'}; samesite=lax`
  }

  /**
   * Get authentication token from localStorage or cookie
   */
  static getAuthToken(): string | null {
    // First try localStorage
    const localToken = localStorage.getItem('auth_token')
    if (localToken) {
      return localToken
    }

    // If not in localStorage, try to get from cookie
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === this.AUTH_COOKIE_NAME) {
        // Set in localStorage for future use
        localStorage.setItem('auth_token', value)
        return value
      }
    }

    return null
  }

  /**
   * Clear authentication token from both localStorage and cookie
   */
  static clearAuthToken() {
    localStorage.removeItem('auth_token')
    document.cookie = `${this.AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${this.AUTH_COOKIE_DOMAIN}; path=/;`
  }

  /**
   * Sync logout across all domains
   */
  static syncLogout() {
    // Clear local storage and cookies
    this.clearAuthToken()
    
    // If we're on a subdomain, also clear the main domain
    if (this.isSubdomain()) {
      const mainDomain = this.getMainDomain()
      const protocol = window.location.protocol
      
      // Use a hidden iframe to clear the main domain's auth
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = `${protocol}//${mainDomain}/auth/clear`
      document.body.appendChild(iframe)
      
      // Remove iframe after a short delay
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 1000)
    }
  }

  /**
   * Sync login across domains
   */
  static syncLogin(token: string) {
    // Set token in current domain
    this.setAuthToken(token)
    
    // If we're on main domain, also set for subdomains via cookie
    if (!this.isSubdomain()) {
      // The cookie will be available to all subdomains
      this.setAuthToken(token)
    }
  }

  /**
   * Check if we're on a subdomain
   */
  static isSubdomain(): boolean {
    const hostname = window.location.hostname
    return hostname.includes('.') && !hostname.includes('localhost')
  }

  /**
   * Get main domain from current hostname
   */
  static getMainDomain(): string {
    const hostname = window.location.hostname
    
    // For Vercel deployment
    if (hostname.includes('vercel.app')) {
      return import.meta.env.VITE_VERCEL_DOMAIN || 'uproomvp.vercel.app'
    }
    
    // For localhost development
    if (hostname.includes('localhost')) {
      return import.meta.env.VITE_DEV_DOMAIN || 'localhost:8080'
    }
    
    // For production with custom domain
    return import.meta.env.VITE_MAIN_DOMAIN || import.meta.env.VITE_DOMAIN || 'starvibe.space'
  }

  /**
   * Redirect to main domain for authentication
   */
  static redirectToMainDomainForAuth() {
    const mainDomain = this.getMainDomain()
    const protocol = window.location.protocol
    const currentPath = window.location.pathname
    const currentHost = window.location.host
    
    // Validate the current host to avoid malformed URLs
    if (!currentHost || currentHost.length < 3) {
      console.error('Invalid host detected:', currentHost)
      // Fallback to main domain without return URL
      window.location.href = `${protocol}//${mainDomain}/login`
      return
    }
    
    const returnUrl = encodeURIComponent(`${protocol}//${currentHost}${currentPath}`)
    
    // Validate the return URL before using it
    try {
      new URL(decodeURIComponent(returnUrl))
      window.location.href = `${protocol}//${mainDomain}/login?returnUrl=${returnUrl}`
    } catch (error) {
      console.error('Invalid return URL:', returnUrl, error)
      // Fallback to main domain without return URL
      window.location.href = `${protocol}//${mainDomain}/login`
    }
  }

  /**
   * Handle authentication redirect after login
   */
  static handleAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search)
    const returnUrl = urlParams.get('returnUrl')
    
    if (returnUrl) {
      try {
        // Decode and validate the return URL
        const decodedUrl = decodeURIComponent(returnUrl)
        const url = new URL(decodedUrl)
        
        // Validate that the return URL is from a trusted domain
        const currentHost = window.location.hostname
        const returnHost = url.hostname
        
        // Allow redirects to subdomains of the same base domain
        const isTrustedDomain = returnHost === currentHost || 
                               returnHost.endsWith('.starvibe.space') ||
                               returnHost.endsWith('.uproom.com') ||
                               returnHost.includes('localhost')
        
        if (isTrustedDomain) {
          window.location.href = decodedUrl
        } else {
          console.warn('Untrusted return URL:', decodedUrl)
          window.location.href = '/maindashboard'
        }
      } catch (error) {
        console.error('Invalid return URL:', returnUrl, error)
        window.location.href = '/maindashboard'
      }
    } else {
      // Default redirect to main dashboard
      window.location.href = '/maindashboard'
    }
  }
}
