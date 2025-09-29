import { supabase } from './supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Types for real-time events
export interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string
  message_type: 'text' | 'system' | 'file'
  reply_to_id?: string
  edited_at?: string
  deleted_at?: string
  created_at: string
}

export interface UserStatus {
  id: string
  user_id: string
  company_id: string
  status: 'available' | 'focus' | 'meeting' | 'away' | 'break' | 'emergency' | 'offline'
  custom_message?: string
  is_online: boolean
  last_activity_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  company_id: string
  type: 'direct' | 'group'
  name?: string
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
  last_message_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  left_at?: string
  is_active: boolean
  last_read_at: string
}

// Event types for real-time subscriptions
export type MessageEvent = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Message
}

export type StatusEvent = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: UserStatus
}

export type ConversationEvent = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Conversation
}

export type PresenceEvent = {
  type: 'JOIN' | 'LEAVE' | 'SYNC'
  payload: {
    user_id: string
    company_id: string
    online_at: string
  }
}

// Callback types
export type MessageCallback = (event: MessageEvent) => void
export type StatusCallback = (event: StatusEvent) => void
export type ConversationCallback = (event: ConversationEvent) => void
export type PresenceCallback = (event: PresenceEvent) => void

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private messageCallbacks: Set<MessageCallback> = new Set()
  private statusCallbacks: Set<StatusCallback> = new Set()
  private conversationCallbacks: Set<ConversationCallback> = new Set()
  private presenceCallbacks: Set<PresenceCallback> = new Set()
  private currentUserId: string | null = null
  private currentCompanyId: string | null = null

  constructor() {
    this.initializeAuth()
  }

  private async initializeAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      this.currentUserId = session.user.id
      await this.loadUserCompany()
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUserId = session.user.id
        await this.loadUserCompany()
      } else if (event === 'SIGNED_OUT') {
        this.currentUserId = null
        this.currentCompanyId = null
        this.disconnectAll()
      }
    })
  }

  private async loadUserCompany() {
    if (!this.currentUserId) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_company_id')
      .eq('id', this.currentUserId)
      .single()

    if (profile?.current_company_id) {
      this.currentCompanyId = profile.current_company_id
    }
  }

  // Subscribe to messages in a specific conversation
  subscribeToConversation(conversationId: string): RealtimeChannel {
    const channelName = `conversation:${conversationId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          this.handleMessageChange(payload)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to status updates for company members
  subscribeToCompanyStatus(companyId?: string): RealtimeChannel {
    const channelName = `user_status_updates`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        (payload: RealtimePostgresChangesPayload<UserStatus>) => {
          this.handleStatusChange(payload)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to conversation updates for a company
  subscribeToCompanyConversations(companyId?: string): RealtimeChannel {
    const targetCompanyId = companyId || this.currentCompanyId
    if (!targetCompanyId) {
      throw new Error('No company ID available for conversation subscription')
    }

    const channelName = `company_conversations:${targetCompanyId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `company_id=eq.${targetCompanyId}`
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          this.handleConversationChange(payload)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to presence (online/offline status)
  subscribeToPresence(companyId?: string): RealtimeChannel {
    const targetCompanyId = companyId || this.currentCompanyId
    if (!targetCompanyId) {
      throw new Error('No company ID available for presence subscription')
    }

    const channelName = `presence:${targetCompanyId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        this.handlePresenceSync(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePresenceJoin(key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePresenceLeave(key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && this.currentUserId) {
          // Track user presence
          await channel.track({
            user_id: this.currentUserId,
            company_id: targetCompanyId,
            online_at: new Date().toISOString()
          })
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Event handlers
  private handleMessageChange(payload: RealtimePostgresChangesPayload<Message>) {
    const event: MessageEvent = {
      type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      payload: payload.new as Message || payload.old as Message
    }
    
    this.messageCallbacks.forEach(callback => callback(event))
  }

  private handleStatusChange(payload: RealtimePostgresChangesPayload<UserStatus>) {
    const event: StatusEvent = {
      type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      payload: payload.new as UserStatus || payload.old as UserStatus
    }
    
    this.statusCallbacks.forEach(callback => callback(event))
  }

  private handleConversationChange(payload: RealtimePostgresChangesPayload<Conversation>) {
    const event: ConversationEvent = {
      type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      payload: payload.new as Conversation || payload.old as Conversation
    }
    
    this.conversationCallbacks.forEach(callback => callback(event))
  }

  private handlePresenceSync(state: any) {
    const users = Object.keys(state).map(key => state[key][0])
    this.presenceCallbacks.forEach(callback => 
      callback({
        type: 'SYNC',
        payload: { user_id: '', company_id: '', online_at: '' } // Will be replaced with actual sync data
      })
    )
  }

  private handlePresenceJoin(key: string, newPresences: any[]) {
    newPresences.forEach(presence => {
      this.presenceCallbacks.forEach(callback =>
        callback({
          type: 'JOIN',
          payload: presence
        })
      )
    })
  }

  private handlePresenceLeave(key: string, leftPresences: any[]) {
    leftPresences.forEach(presence => {
      this.presenceCallbacks.forEach(callback =>
        callback({
          type: 'LEAVE',
          payload: presence
        })
      )
    })
  }

  // Callback management
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback)
    return () => this.messageCallbacks.delete(callback)
  }

  onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback)
    return () => this.statusCallbacks.delete(callback)
  }

  onConversation(callback: ConversationCallback): () => void {
    this.conversationCallbacks.add(callback)
    return () => this.conversationCallbacks.delete(callback)
  }

  onPresence(callback: PresenceCallback): () => void {
    this.presenceCallbacks.add(callback)
    return () => this.presenceCallbacks.delete(callback)
  }

  // Utility methods
  unsubscribeFromConversation(conversationId: string) {
    const channelName = `conversation:${conversationId}`
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  unsubscribeFromCompanyStatus(companyId?: string) {
    const targetCompanyId = companyId || this.currentCompanyId
    const channelName = `company_status:${targetCompanyId}`
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  disconnectAll() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  // Update user online status
  async updateOnlineStatus(isOnline: boolean) {
    if (!this.currentUserId) return

    // This function can be used for presence tracking
    // For now, we'll just update the user status to reflect online/offline
    if (!isOnline) {
      await this.updateUserStatus('offline', 'User went offline')
    }
  }

  // Send a message
  async sendMessage(conversationId: string, content: string, messageType: 'text' | 'system' | 'file' = 'text') {
    if (!this.currentUserId) {
      throw new Error('User must be authenticated to send messages')
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: this.currentUserId,
        content: content.trim(),
        message_type: messageType
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`)
    }

    return data
  }

  // Update user status
  async updateUserStatus(status: UserStatus['status'], customMessage?: string) {
    if (!this.currentUserId) {
      throw new Error('User must be authenticated to update status')
    }

    const { data, error } = await supabase
      .from('user_status')
      .insert({
        user_id: this.currentUserId,
        status,
        custom_message: customMessage,
        is_latest: true
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`)
    }

    return data
  }

  // Create or get direct conversation
  async createDirectConversation(participantUserId: string) {
    if (!this.currentUserId || !this.currentCompanyId) {
      throw new Error('User must be authenticated and have a company')
    }

    const { data, error } = await supabase.rpc('create_direct_conversation', {
      participant1_id: this.currentUserId,
      participant2_id: participantUserId,
      company_id: this.currentCompanyId
    })

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return data
  }

  // Get current user and company IDs
  getCurrentUserId(): string | null {
    return this.currentUserId
  }

  getCurrentCompanyId(): string | null {
    return this.currentCompanyId
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()