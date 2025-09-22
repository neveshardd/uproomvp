import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AuthCallback = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from URL parameters
        const code = searchParams.get('code')
        const error_code = searchParams.get('error_code')
        const error_description = searchParams.get('error_description')

        if (error_code) {
          setError(error_description || 'Authentication failed')
          setLoading(false)
          return
        }

        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            setError(error.message)
          } else {
            console.log('Successfully authenticated:', data)
            setSuccess(true)
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/', { replace: true })
            }, 2000)
          }
        } else {
          setError('No authentication code found')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <CardTitle>Verifying your account...</CardTitle>
            <CardDescription>
              Please wait while we confirm your email address.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-600" />
            <CardTitle className="text-green-600">Email Verified!</CardTitle>
            <CardDescription>
              Your account has been successfully verified. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return null
}

export default AuthCallback