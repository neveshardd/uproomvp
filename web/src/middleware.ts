import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  // Skip middleware for API routes and static assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/assets/')) {
    return NextResponse.next()
  }

  // Handle subdomain routing
  const subdomain = getSubdomain(hostname)
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    // This is a workspace subdomain
    // Let the React app handle the routing
    return NextResponse.next()
  }

  // Main domain - serve the landing page
  return NextResponse.next()
}

function getSubdomain(hostname: string): string | null {
  const parts = hostname.split('.')
  
  // For localhost development
  if (hostname.includes('localhost')) {
    if (parts.length >= 2 && parts[1] === 'localhost') {
      return parts[0]
    }
    return null
  }
  
  // For production domains
  if (parts.length >= 3) {
    return parts[0]
  }
  
  return null
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
