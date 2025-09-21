import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Settings, Plus, LogOut, BarChart3 } from 'lucide-react'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { currentCompany, userCompanies, userRole, isLoading } = useCompany()

  const handleSignOut = async () => {
    await signOut()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentCompany?.name || 'Mindful Communication'}
                </h1>
                {currentCompany && (
                  <p className="text-sm text-gray-500">
                    {currentCompany.subdomain}.mindfulcomm.com
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                {userRole && (
                  <Badge variant="secondary" className="text-xs">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentCompany ? (
          // No Company State
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Mindful Communication</h2>
            <p className="text-gray-600 mb-8">
              Get started by creating your company workspace or joining an existing one.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button onClick={() => navigate('/create-company')} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create Company
              </Button>
              <Button variant="outline" size="lg">
                Join Company
              </Button>
            </div>
          </div>
        ) : (
          // Company Dashboard
          <div className="space-y-8">
            {/* Welcome Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back to {currentCompany.name}
              </h2>
              <p className="text-gray-600">
                Here's what's happening in your workspace today.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyMembers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active members in your workspace
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Messages sent this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{userRole}</div>
                  <p className="text-xs text-muted-foreground">
                    Your access level
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  People in your {currentCompany.name} workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.user?.full_name || member.user?.email}
                          </p>
                          <p className="text-xs text-gray-500">{member.user?.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and settings for your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button variant="outline" className="justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Company Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard