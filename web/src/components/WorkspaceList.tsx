import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  Plus, 
  ArrowRight,
  Settings,
  MessageSquare,
  Calendar,
  BarChart3
} from 'lucide-react'
import { SubdomainService } from '@/lib/subdomain'
import Navbar from '@/components/Navbar'

const WorkspaceList: React.FC = () => {
  const { user } = useAuth()
  const { userCompanies, isLoading } = useCompany()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading your workspaces...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access your workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userCompanies.length === 0) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Your Workspaces
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create your first workspace to get started
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">No Workspaces Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first workspace to start collaborating with your team and organizing your projects.
            </p>
            <Button 
              onClick={() => window.location.href = '/create-company'}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workspace
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Your Workspaces
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose a workspace to get started
                </p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/create-company'} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center w-full">
            <h2 className="text-2xl font-bold text-foreground text-left">Your Workspaces</h2>
          </div>
          
          {/* Workspace Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCompanies.map((company) => (
              <Card key={company.id} className="bg-card/50 border-border/40 hover:bg-card/70 transition-colors group">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    {company.logoUrl ? (
                      <img 
                        src={company.logoUrl} 
                        alt={`${company.name} logo`}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg text-foreground">{company.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {company.description || `${company.subdomain}.uproom.com`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      0 members
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        window.location.href = SubdomainService.getWorkspaceUrl(company.subdomain)
                      }}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:bg-primary/80"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Go to Workspace
                    </Button>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          window.location.href = SubdomainService.getWorkspaceUrl(company.subdomain, '/settings')
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          window.location.href = SubdomainService.getWorkspaceUrl(company.subdomain, '/dashboard')
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Dashboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default WorkspaceList
