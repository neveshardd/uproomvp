import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Shield, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const Home = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Mindful Communication</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link to="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Transform Your Team
            <span className="text-blue-600"> Communication</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Build stronger relationships, improve collaboration, and create a more mindful workplace with our comprehensive communication platform.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            {!user && (
              <div className="space-y-3 sm:space-y-0 sm:space-x-3 sm:flex">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <CardTitle>Smart Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Intelligent messaging system that promotes thoughtful communication and reduces noise.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-green-600" />
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Foster better teamwork with structured conversations and collaborative tools.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-purple-600" />
                <CardTitle>Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Enterprise-grade security with end-to-end encryption and privacy controls.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-yellow-600" />
                <CardTitle>Productivity Boost</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Reduce meeting fatigue and email overload with focused, purposeful communication.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Ready to get started?</h2>
            <p className="mt-4 text-lg text-gray-600">
              Join thousands of teams already using Mindful Communication to transform their workplace.
            </p>
            <div className="mt-8">
              <Link to="/register">
                <Button size="lg">
                  Create Your Account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 Mindful Communication. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home