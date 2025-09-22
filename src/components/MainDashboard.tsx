import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCompany } from '../contexts/CompanyContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { 
  Search, 
  Plus, 
  Settings, 
  Bell, 
  ChevronDown,
  MessageSquare,
  Users,
  Filter,
  SortAsc,
  MoreVertical,
  Minus,
  X,
  Pin,
  Send
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import { supabase } from '../lib/supabase'
import StatusSelector from './StatusSelector'
import UserPresenceIndicator from './UserPresenceIndicator'
import { usePresence } from '../hooks/usePresence'
import ChatInterface from './ChatInterface'

interface MainDashboardProps {
  companyId?: string
  company?: {
    id: string
    name: string
    subdomain: string
    description: string | null
    owner_id: string
    created_at: string
  }
  userRole?: {
    role: string
    status: string
    joined_at: string
  }
}

interface TeamMember {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url?: string
  role: string
  status: string
  last_activity_at: string
}

interface DirectConversation {
  id: string
  participant_id: string
  participant_name: string
  participant_avatar?: string
  last_message?: string
  last_message_at?: string
  unread_count: number
}

interface GroupConversation {
  id: string
  name: string
  description?: string
  member_count: number
  last_message?: string
  last_message_at?: string
  unread_count: number
}

const MainDashboard: React.FC<MainDashboardProps> = ({ companyId, company, userRole }) => {
  const { user } = useAuth()
  const { currentCompany } = useCompany()
  
  // Use passed company data or fallback to context
  const activeCompany = company || currentCompany
  const activeCompanyId = companyId || activeCompany?.id
  const { onlineUsers, getUserStatus } = usePresence(activeCompanyId)
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [directConversations, setDirectConversations] = useState<DirectConversation[]>([])
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [isMessageMinimized, setIsMessageMinimized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'activity'>('name')
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(true)
  const [isGroupsOpen, setIsGroupsOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeCompanyId) {
      fetchTeamMembers()
      fetchConversations()
    }
  }, [activeCompanyId])

  const fetchTeamMembers = async () => {
    if (!activeCompany) return
    
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          id,
          user_id,
          role,
          status,
          joined_at,
          users!inner (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('company_id', activeCompany.id)
        .eq('status', 'active')

      if (error) throw error

      const members = data.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        full_name: member.users?.full_name || member.users?.email?.split('@')[0] || 'Unknown',
        email: member.users?.email || '',
        avatar_url: member.users?.avatar_url,
        role: member.role,
        status: member.status,
        last_activity_at: new Date().toISOString()
      }))

      setTeamMembers(members.filter(m => m.user_id !== user?.id))
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async () => {
    // Mock data for now - will be implemented with real data later
    setDirectConversations([
      {
        id: '1',
        participant_id: 'user1',
        participant_name: 'John Doe',
        participant_avatar: undefined,
        last_message: 'Hey, how are you?',
        last_message_at: new Date().toISOString(),
        unread_count: 2
      }
    ])

    setGroupConversations([
      {
        id: 'group1',
        name: 'Team Alpha',
        description: 'Main project team',
        member_count: 5,
        last_message: 'Meeting at 3 PM',
        last_message_at: new Date().toISOString(),
        unread_count: 1
      }
    ])
  }

  const handleSendMessage = (userId: string) => {
    setSelectedConversation(userId)
    setIsMessageMinimized(false)
  }

  const handleCloseConversation = () => {
    setSelectedConversation(null)
    setIsMessageMinimized(false)
  }

  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.full_name.localeCompare(b.full_name)
      case 'status':
        const statusA = getUserStatus(a.user_id)
        const statusB = getUserStatus(b.user_id)
        return statusA.localeCompare(statusB)
      case 'activity':
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
      default:
        return 0
    }
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - 300px */}
      <div className="w-[300px] bg-card border-r border-border flex flex-col">
        {/* User Profile Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {getInitials(user?.user_metadata?.full_name || user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Direct Messages */}
            <Collapsible open={isDirectMessagesOpen} onOpenChange={setIsDirectMessagesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-foreground hover:bg-accent rounded">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Direct Messages</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDirectMessagesOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {directConversations.map(conv => (
                  <div
                    key={conv.id}
                    className="flex items-center space-x-3 p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conv.participant_avatar} />
                        <AvatarFallback>{getInitials(conv.participant_name)}</AvatarFallback>
                      </Avatar>
                      <UserPresenceIndicator
                        status={getUserStatus(conv.participant_id)}
                        size="sm"
                        className="absolute -bottom-1 -right-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.participant_name}
                      </p>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Groups */}
            <Collapsible open={isGroupsOpen} onOpenChange={setIsGroupsOpen} className="mt-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-foreground hover:bg-accent rounded">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Groups</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isGroupsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {groupConversations.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center space-x-3 p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => setSelectedConversation(group.id)}
                  >
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                        <span className="text-xs text-muted-foreground">({group.member_count})</span>
                      </div>
                      {group.last_message && (
                        <p className="text-xs text-muted-foreground truncate">{group.last_message}</p>
                      )}
                    </div>
                    {group.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {group.unread_count}
                      </Badge>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Status Selector */}
        <div className="p-4 border-t border-border">
          <StatusSelector companyId={activeCompanyId} />
        </div>
      </div>

      {/* Main Area - Flexible */}
      <div className={`${selectedConversation && !isMessageMinimized ? 'w-[400px]' : 'flex-1'} flex flex-col`}>
        {/* Header */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SortAsc className="h-4 w-4 mr-2" />
                    Sort by {sortBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('status')}>Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('activity')}>Activity</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>

        {/* User Cards Grid */}
        <ScrollArea className="flex-1 p-6">
          <div className={`grid gap-4 ${selectedConversation && !isMessageMinimized ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {sortedMembers.map(member => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                        </Avatar>
                        <UserPresenceIndicator
                          status={getUserStatus(member.user_id)}
                          size="md"
                          className="absolute -bottom-1 -right-1"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{member.full_name}</CardTitle>
                        <CardDescription className="truncate">{member.email}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSendMessage(member.user_id)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                    <UserPresenceIndicator
                      status={getUserStatus(member.user_id)}
                      showText
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Conditional Chat Column */}
      {selectedConversation && (
        <div className={`${isMessageMinimized ? 'w-[300px]' : 'flex-1 min-w-0'} border-l border-border flex flex-col h-full overflow-hidden`}>
          {/* Chat Header */}
          <div className="bg-card border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">John Doe</h3>
                  <p className="text-sm text-muted-foreground">Available</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMessageMinimized(!isMessageMinimized)}
                  title={isMessageMinimized ? "Expand" : "Minimize"}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseConversation}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {!isMessageMinimized && (
            <>
              {/* Pinned Messages */}
              <div className="bg-yellow-50 border-b border-yellow-200 p-2">
                <div className="flex items-center space-x-2 text-sm text-yellow-800">
                  <Pin className="h-4 w-4" />
                  <span>2 pinned messages</span>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-accent rounded-lg p-3">
                        <p className="text-sm">Hey, how are you doing?</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">2:30 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="flex-1 text-right">
                      <div className="bg-blue-600 text-white rounded-lg p-3 inline-block">
                        <p className="text-sm">I'm doing great! Thanks for asking.</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">2:32 PM</p>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitials(user?.user_metadata?.full_name || user?.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="bg-card border-t border-border p-4">
                <div className="flex items-center space-x-2">
                  <Input placeholder="Type a message..." className="flex-1" />
                  <Button size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default MainDashboard