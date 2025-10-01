import React, { useEffect } from 'react'
import { CrossDomainAuth } from '@/lib/cross-domain-auth'

const AuthClear: React.FC = () => {
  useEffect(() => {
    // Clear authentication on this domain
    CrossDomainAuth.clearAuthToken()
    
    // Close the popup window
    window.close()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Clearing authentication...</p>
      </div>
    </div>
  )
}

export default AuthClear
