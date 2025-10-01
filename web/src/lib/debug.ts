// Debug utility for subdomain detection
export const debugSubdomain = () => {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  
  console.log('🔍 Subdomain Debug Info:')
  console.log('Hostname:', hostname)
  console.log('Parts:', parts)
  console.log('Parts length:', parts.length)
  console.log('Is Vercel:', hostname.includes('vercel.app'))
  console.log('Is localhost:', hostname.includes('localhost'))
  
  if (hostname.includes('vercel.app')) {
    const subdomain = parts[0]
    const baseDomain = parts.slice(-2).join('.')
    console.log('Subdomain:', subdomain)
    console.log('Base domain:', baseDomain)
    console.log('Is main domain:', subdomain === 'uproomvp')
  }
  
  return {
    hostname,
    parts,
    isVercel: hostname.includes('vercel.app'),
    isLocalhost: hostname.includes('localhost'),
    subdomain: parts[0],
    baseDomain: parts.slice(-2).join('.')
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).debugSubdomain = debugSubdomain
}
