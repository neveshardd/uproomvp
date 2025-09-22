import React, { useEffect } from 'react'
import { useSubdomain } from '@/hooks/useSubdomain'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import ProtectedRoute from './ProtectedRoute'
import Dashboard from '@/pages/Dashboard'

const DashboardRouter: React.FC = () => {
  const { subdomain, company, isLoading, isValidWorkspace } = useSubdomain()
  const { user } = useAuth()
  const { currentCompany, userCompanies, isLoading: companyLoading } = useCompany()

  useEffect(() => {
    // If we're on a company subdomain and user has access to that company, redirect to workspace
    if (!isLoading && !companyLoading && subdomain && isValidWorkspace && company && user) {
      // Check if user is a member of this company
      const isMemberOfThisCompany = userCompanies?.some(uc => uc.id === company.id)
      
      if (isMemberOfThisCompany) {
        // Redirect to the company workspace root (which shows MainDashboard)
        window.location.href = `${window.location.protocol}//${subdomain}.${window.location.host}`
        return
      }
    }

    // If user has a current company but is on main domain, redirect to their company subdomain
    if (!isLoading && !companyLoading && !subdomain && currentCompany && user) {
      window.location.href = `${window.location.protocol}//${currentCompany.subdomain}.${window.location.host}`
      return
    }
  }, [isLoading, companyLoading, subdomain, isValidWorkspace, company, user, userCompanies, currentCompany])

  // Show loading while checking subdomain and company status
  if (isLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If we're on a subdomain but user doesn't have access, or other edge cases, 
  // fall back to regular dashboard
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

export default DashboardRouter