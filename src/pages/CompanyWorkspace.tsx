import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Building,
  Settings,
  Users,
  Bell,
  Activity,
  AlertCircle,
  Crown,
  Shield,
  User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StatusSelector from '@/components/StatusSelector'
import TeamStatusBoard from '@/components/TeamStatusBoard'
import MessageInput from '@/components/MessageInput'
import MessageList from '@/components/MessageList'

interface Company {
  id: string
  name: string
  subdomain: string
  description: string | null
  owner_id: string
  created_at: string
}

interface UserRole {
  role: string
  status: string
  joined_at: string
}

interface Message {
  id: string
  content: string
  user_id: string
  user_name: string
  user_avatar?: string
  created_at: string
  attachments?: any[]
  is_system?: boolean
}

const CompanyWorkspace: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (companyId && user) {
      fetchCompanyData()
    }
  }, [companyId, user])

  const fetchCompanyData = async () => {
    if (!companyId || !user) return

    setLoading(true)
    setError('')

    try {
      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) {
        if (companyError.code === 'PGRST116') {
          setError('Company not found')
        } else {
          throw companyError
        }
        return
      }

      // Check if user is a member of this company
      const { data: memberData, error: memberError } = await supabase
        .from('company_members')
        .select('role, status, joined_at')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .single()

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          setError('You are not a member of this company')
        } else {
          throw memberError
        }
        return
      }

      if (memberData.status !== 'active') {
        setError('Your membership is not active')
        return
      }

      setCompany(companyData)
      setUserRole(memberData)
    } catch (err: any) {
      setError(err.message || 'Failed to load company data')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = () => {
    // Trigger refresh of team status board
    setRefreshKey(prev => prev + 1)
  }

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!user || !companyId) return

    try {
      // For now, just add a mock message to demonstrate the UI
      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || 'Unknown User',
        user_avatar: user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
        attachments: attachments ? attachments.map(file => ({
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: '#' // Placeholder URL
        })) : undefined
      }

      setMessages(prev => [...prev, newMessage])

      // TODO: Implement actual message sending to Supabase
      // This would involve:
      // 1. Uploading attachments to Supabase Storage
      // 2. Inserting message record to messages table
      // 3. Real-time subscription for new messages
    } catch (err: any) {
      console.error('Failed to send message:', err)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'member':
        return <User className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      case 'member':
        return 'outline'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!company || !userRole) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <div className="flex items-center space-x-3">
                  <Building className="h-6 w-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  <Badge variant={getRoleBadgeVariant(userRole.role)}>
                    {getRoleIcon(userRole.role)}
                    <span className="ml-1">{userRole.role}</span>
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {company.subdomain}.mindfulcomm.app
                  {company.description && ` • ${company.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" disabled>
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Selector - Left Column */}
          <div className="lg:col-span-1">
            <StatusSelector 
              companyId={companyId} 
              onStatusUpdate={handleStatusUpdate}
              className="sticky top-8"
            />
          </div>

          {/* Team Status Board - Right Columns */}
          <div className="lg:col-span-2">
            <TeamStatusBoard 
              key={refreshKey}
              companyId={companyId} 
            />
          </div>
        </div>

        {/* Company Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Workspace Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{company.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">URL:</span>
                    <span className="font-medium">{company.subdomain}.mindfulcomm.app</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {company.description && (
                    <div>
                      <span className="text-gray-600">Description:</span>
                      <p className="mt-1 text-gray-900">{company.description}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Your Membership</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <Badge variant={getRoleBadgeVariant(userRole.role)}>
                      {getRoleIcon(userRole.role)}
                      <span className="ml-1">{userRole.role}</span>
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="outline">{userRole.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Joined:</span>
                    <span className="font-medium">
                      {new Date(userRole.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚧 Development Status</CardTitle>
            <CardDescription>
              Current workspace features and upcoming enhancements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-700 mb-2">✅ Available Features</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Status management with 9 status types</li>
                  <li>• Real-time team status board</li>
                  <li>• Custom status messages</li>
                  <li>• Auto-expiring statuses</li>
                  <li>• Role-based access control</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">🚧 Coming Soon</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Direct messaging system</li>
                  <li>• Push notifications</li>
                  <li>• Status history and analytics</li>
                  <li>• Team scheduling features</li>
                  <li>• Mobile app support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CompanyWorkspace