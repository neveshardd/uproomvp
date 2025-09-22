import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Clock, 
  Coffee, 
  Home, 
  Briefcase, 
  Phone, 
  Calendar,
  Moon,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface StatusOption {
  type: string
  label: string
  icon: React.ReactNode
  color: string
  description: string
  defaultMessage: string
}

interface Company {
  id: string
  name: string
}

const statusOptions: StatusOption[] = [
  {
    type: 'available',
    label: 'Available',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'bg-green-500',
    description: 'Ready to work and collaborate',
    defaultMessage: 'Available for work'
  },
  {
    type: 'busy',
    label: 'Busy',
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-red-500',
    description: 'Focused work, minimal interruptions',
    defaultMessage: 'In deep work mode'
  },
  {
    type: 'in_meeting',
    label: 'In Meeting',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-blue-500',
    description: 'Currently in a meeting',
    defaultMessage: 'In a meeting'
  },
  {
    type: 'on_call',
    label: 'On Call',
    icon: <Phone className="h-4 w-4" />,
    color: 'bg-purple-500',
    description: 'Taking a phone call',
    defaultMessage: 'On a call'
  },
  {
    type: 'break',
    label: 'On Break',
    icon: <Coffee className="h-4 w-4" />,
    color: 'bg-orange-500',
    description: 'Taking a short break',
    defaultMessage: 'Taking a break'
  },
  {
    type: 'lunch',
    label: 'At Lunch',
    icon: <Coffee className="h-4 w-4" />,
    color: 'bg-yellow-500',
    description: 'Out for lunch',
    defaultMessage: 'Out for lunch'
  },
  {
    type: 'away',
    label: 'Away',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-gray-500',
    description: 'Temporarily away from desk',
    defaultMessage: 'Away from desk'
  },
  {
    type: 'wfh',
    label: 'Working from Home',
    icon: <Home className="h-4 w-4" />,
    color: 'bg-indigo-500',
    description: 'Working remotely today',
    defaultMessage: 'Working from home'
  },
  {
    type: 'offline',
    label: 'Offline',
    icon: <Moon className="h-4 w-4" />,
    color: 'bg-gray-400',
    description: 'Not available, finished for today',
    defaultMessage: 'Finished for today'
  }
]

interface StatusSelectorProps {
  companyId?: string
  onStatusUpdate?: () => void
  className?: string
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ 
  companyId, 
  onStatusUpdate,
  className = ""
}) => {
  const { user } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [customMessage, setCustomMessage] = useState('')
  const [autoExpiry, setAutoExpiry] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>(companyId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentStatus, setCurrentStatus] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchUserCompanies()
      if (companyId || selectedCompany) {
        fetchCurrentStatus()
      }
    }
  }, [user, companyId, selectedCompany])

  const fetchUserCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          companies (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')

      if (error) throw error

      const companiesData = data?.map((item: any) => ({
        id: item.companies?.id || '',
        name: item.companies?.name || ''
      })) || []

      setCompanies(companiesData)

      // Auto-select first company if no companyId provided
      if (!companyId && companiesData.length > 0) {
        setSelectedCompany(companiesData[0].id)
      }
    } catch (err: any) {
      console.error('Error fetching companies:', err)
    }
  }

  const fetchCurrentStatus = async () => {
    if (!selectedCompany || !user) return

    try {
      const { data, error } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setCurrentStatus(data)
        setSelectedStatus(data.status_type)
        setCustomMessage(data.status_message || '')
      }
    } catch (err: any) {
      console.error('Error fetching current status:', err)
    }
  }

  const handleStatusChange = (statusType: string) => {
    setSelectedStatus(statusType)
    const option = statusOptions.find(opt => opt.type === statusType)
    if (option && !customMessage) {
      setCustomMessage(option.defaultMessage)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !selectedCompany || !user) {
      setError('Please select a status and company')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const statusData = {
        user_id: user.id,
        company_id: selectedCompany,
        status_type: selectedStatus,
        status_message: customMessage || null,
        auto_set: false,
        expires_at: autoExpiry ? new Date(autoExpiry).toISOString() : null
      }

      const { error } = await supabase
        .from('user_status')
        .insert(statusData)

      if (error) throw error

      setSuccess('Status updated successfully!')
      
      // Refresh current status
      await fetchCurrentStatus()
      
      // Call callback if provided
      if (onStatusUpdate) {
        onStatusUpdate()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusOption = (type: string) => {
    return statusOptions.find(opt => opt.type === type)
  }

  const currentStatusOption = currentStatus ? getStatusOption(currentStatus.status_type) : null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Briefcase className="h-5 w-5 mr-2" />
          Status Manager
        </CardTitle>
        <CardDescription>
          Set your availability status for your team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Current Status Display */}
        {currentStatus && currentStatusOption && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Current Status</Label>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${currentStatusOption.color}`}></div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {currentStatusOption.icon}
                  <span className="font-medium">{currentStatusOption.label}</span>
                </div>
                {currentStatus.status_message && (
                  <p className="text-sm text-gray-600 mt-1">{currentStatus.status_message}</p>
                )}
              </div>
              {currentStatus.expires_at && (
                <Badge variant="outline" className="text-xs">
                  Expires: {new Date(currentStatus.expires_at).toLocaleString()}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Company Selection */}
        {companies.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="company">Workspace</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Selection */}
        <div className="space-y-3">
          <Label>Select Status</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.type}
                variant={selectedStatus === option.type ? "default" : "outline"}
                className="justify-start h-auto p-3"
                onClick={() => handleStatusChange(option.type)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Status Message</Label>
          <Textarea
            id="message"
            placeholder="Add a custom message (optional)"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Auto Expiry */}
        <div className="space-y-2">
          <Label htmlFor="expiry">Auto Expire (Optional)</Label>
          <Input
            id="expiry"
            type="datetime-local"
            value={autoExpiry}
            onChange={(e) => setAutoExpiry(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <p className="text-xs text-gray-500">
            Status will automatically revert to "Available" at this time
          </p>
        </div>

        {/* Update Button */}
        <Button 
          onClick={handleUpdateStatus} 
          className="w-full" 
          disabled={loading || !selectedStatus || !selectedCompany}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Status'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default StatusSelector