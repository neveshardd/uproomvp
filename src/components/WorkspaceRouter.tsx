import React from 'react'
import { useSubdomain } from '@/hooks/useSubdomain'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Building2, AlertTriangle, Home } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WorkspaceRouterProps {
  children: React.ReactNode
}

const WorkspaceRouter: React.FC<WorkspaceRouterProps> = ({ children }) => {
  const { subdomain, company, isLoading, error, isValidWorkspace, redirectToMainDomain } = useSubdomain()
  const { user } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading workspace...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No subdomain - render main application
  if (!subdomain) {
    return <>{children}</>
  }

  // Error state - invalid subdomain or company not found
  if (error || !isValidWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Workspace Not Found</CardTitle>
            <CardDescription>
              The workspace "{subdomain}" could not be found or is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || 'This workspace does not exist or has been deactivated.'}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button onClick={redirectToMainDomain} className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to Main Site
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid workspace found - render workspace-specific content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Workspace Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {company?.logo_url ? (
                  <img 
                    className="h-8 w-8 rounded-full" 
                    src={company.logo_url} 
                    alt={company.name}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {company?.name}
                </h1>
                <p className="text-xs text-gray-500">
                  {subdomain}.uproom.com
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    {user.email}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={() => window.location.href = '/login'}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          // User is authenticated - show workspace content
          <WorkspaceContent company={company} />
        ) : (
          // User not authenticated - show login prompt
          <WorkspaceLoginPrompt company={company} />
        )}
      </div>
    </div>
  )
}

const WorkspaceContent: React.FC<{ company: any }> = ({ company }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to {company.name}</CardTitle>
          <CardDescription>
            {company.description || 'Company workspace dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This is the workspace for {company.name}. The full workspace features are coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const WorkspaceLoginPrompt: React.FC<{ company: any }> = ({ company }) => {
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Sign in to {company.name}</CardTitle>
          <CardDescription>
            You need to sign in to access this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            onClick={() => window.location.href = '/login'}
          >
            Sign In
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/register'}
          >
            Create Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkspaceRouter