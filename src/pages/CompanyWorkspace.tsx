import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCompany } from '../contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Building,
  Activity,
  AlertCircle,
  Crown,
  Shield,
  User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import MainDashboard from '@/components/MainDashboard'

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

const CompanyWorkspace: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return <MainDashboard companyId={companyId} company={company} userRole={userRole} />
}

export default CompanyWorkspace