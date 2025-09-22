import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, Users, Search, Building } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Company {
  id: string
  name: string
  subdomain: string
  description: string | null
}

const JoinCompany: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [foundCompany, setFoundCompany] = useState<Company | null>(null)
  
  const { user } = useAuth()
  const navigate = useNavigate()

  const searchCompany = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a company name or subdomain')
      return
    }

    setSearching(true)
    setError('')
    setFoundCompany(null)

    try {
      // Search by subdomain first (exact match)
      let { data: company, error: searchError } = await supabase
        .from('companies')
        .select('id, name, subdomain, description')
        .eq('subdomain', searchTerm.toLowerCase().trim())
        .single()

      // If not found by subdomain, search by name (case insensitive)
      if (searchError && searchError.code === 'PGRST116') {
        const { data: companies, error: nameSearchError } = await supabase
          .from('companies')
          .select('id, name, subdomain, description')
          .ilike('name', `%${searchTerm.trim()}%`)
          .limit(1)

        if (nameSearchError) {
          throw nameSearchError
        }

        if (companies && companies.length > 0) {
          company = companies[0]
        }
      } else if (searchError) {
        throw searchError
      }

      if (!company) {
        setError('No company found with that name or subdomain')
        return
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('company_members')
        .select('id, role, status')
        .eq('company_id', company.id)
        .eq('user_id', user?.id)
        .single()

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError
      }

      if (existingMember) {
        if (existingMember.status === 'active') {
          setError('You are already a member of this company')
        } else if (existingMember.status === 'pending') {
          setError('You already have a pending request to join this company')
        } else if (existingMember.status === 'inactive') {
          setError('Your membership to this company is inactive. Please contact an administrator.')
        }
        return
      }

      setFoundCompany(company)
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching')
    } finally {
      setSearching(false)
    }
  }

  const requestToJoin = async () => {
    if (!foundCompany || !user) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create a pending membership request
      const { error: joinError } = await supabase
        .from('company_members')
        .insert({
          company_id: foundCompany.id,
          user_id: user.id,
          role: 'member',
          status: 'pending',
          joined_at: new Date().toISOString()
        })

      if (joinError) {
        throw joinError
      }

      // Create initial user profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          full_name: user.user_metadata?.full_name || null,
          job_title: user.user_metadata?.job_title || null
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't throw here as it's not critical
      }

      setSuccess(`Request sent! You've requested to join ${foundCompany.name}. An administrator will review your request.`)
      setFoundCompany(null)
      setSearchTerm('')
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting to join')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCompany()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Join a Workspace</CardTitle>
          <CardDescription className="text-center">
            Search for and request to join an existing company workspace
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="search">Company Name or Subdomain</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                  disabled={searching || loading}
                />
              </div>
              <Button 
                onClick={searchCompany}
                disabled={searching || loading || !searchTerm.trim()}
                variant="outline"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the company name or workspace URL (e.g., "acme" for acme.mindfulcomm.app)
            </p>
          </div>
          
          {foundCompany && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">{foundCompany.name}</h3>
                    <p className="text-sm text-green-700">{foundCompany.subdomain}.mindfulcomm.app</p>
                    {foundCompany.description && (
                      <p className="text-sm text-green-600 mt-1">{foundCompany.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          {foundCompany && (
            <Button 
              onClick={requestToJoin}
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending request...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Request to Join
                </>
              )}
            </Button>
          )}
          
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate('/dashboard')}
            disabled={loading}
          >
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default JoinCompany