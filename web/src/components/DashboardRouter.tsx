import React, { useEffect } from 'react'
import { useSubdomain } from '@/hooks/useSubdomain'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import ProtectedRoute from './ProtectedRoute'
import Dashboard from '@/pages/Dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home } from 'lucide-react'
import { SubdomainService } from '@/lib/subdomain'

const DashboardRouter: React.FC = () => {
  const { subdomain, company, isLoading, isValidWorkspace } = useSubdomain()
  const { user } = useAuth()
  const { currentCompany, userCompanies, isLoading: companyLoading } = useCompany()

  useEffect(() => {
    // If we're on a subdomain, allow access to /dashboard for authenticated users
    if (!isLoading && subdomain) {
      // If user is not authenticated, redirect to main domain
      if (!user) {
        const mainDomain = window.location.host.split('.').slice(-2).join('.')
        window.location.href = `${window.location.protocol}//${mainDomain}/maindashboard`
        return
      }
      // If user is authenticated, allow them to stay on subdomain /dashboard
      // No redirection needed - let them access the dashboard
    }

    // Removed automatic redirection to allow users to see their workspaces on main domain
    // Users can now choose which workspace to access from the main dashboard
  }, [isLoading, companyLoading, subdomain, isValidWorkspace, company, user, userCompanies, currentCompany])

  // Show loading while checking subdomain and company status
  if (isLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If we're on a subdomain, show the dashboard normally
  if (subdomain) {
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    )
  }

  // Only allow access to /dashboard from main domain (no subdomain)
  // Se não há empresas, redireciona para criação
  if (!currentCompany && userCompanies.length === 0) {
    window.location.href = '/create-company'
    return null
  }

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

export default DashboardRouter