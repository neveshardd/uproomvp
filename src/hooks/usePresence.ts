import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface UserPresence {
  user_id: string
  user_name: string
  user_avatar?: string
  status: 'available' | 'focus' | 'meeting' | 'away' | 'break' | 'emergency' | 'offline'
  last_seen: string
}

export interface PresenceState {
  [key: string]: UserPresence[]
}

export const usePresence = (companyId?: string) => {
  const { user } = useAuth()
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [isTracking, setIsTracking] = useState(false)

  // Update user's presence status
  const updatePresence = useCallback(async (status: UserPresence['status']) => {
    if (!user || !companyId) return

    try {
      const channel = supabase.channel(`presence-${companyId}`)
      
      await channel.track({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        user_avatar: user.user_metadata?.avatar_url,
        status,
        last_seen: new Date().toISOString()
      } as UserPresence)
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [user, companyId])

  // Start tracking presence
  const startTracking = useCallback(async () => {
    if (!user || !companyId || isTracking) return

    try {
      const channel = supabase.channel(`presence-${companyId}`, {
        config: {
          presence: {
            key: user.id
          }
        }
      })

      // Subscribe to presence changes
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          
          // Convert Supabase presence state to our format
          const convertedState: PresenceState = {}
          Object.entries(state).forEach(([key, presences]) => {
            convertedState[key] = presences.map((presence: any) => ({
              user_id: presence.user_id || key,
              user_name: presence.user_name || 'Unknown',
              user_avatar: presence.user_avatar,
              status: presence.status || 'offline',
              last_seen: presence.last_seen || new Date().toISOString()
            }))
          })
          
          setPresenceState(convertedState)
          
          // Extract online users
          const users: UserPresence[] = []
          Object.values(convertedState).forEach((presences) => {
            presences.forEach((presence) => {
              users.push(presence)
            })
          })
          setOnlineUsers(users)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences)
        })

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user as available
          await updatePresence('available')
          setIsTracking(true)
        }
      })

      return channel
    } catch (error) {
      console.error('Error starting presence tracking:', error)
      return null
    }
  }, [user, companyId, isTracking, updatePresence])

  // Stop tracking presence
  const stopTracking = useCallback(async () => {
    if (!companyId) return

    try {
      const channel = supabase.channel(`presence-${companyId}`)
      await channel.unsubscribe()
      setIsTracking(false)
      setPresenceState({})
      setOnlineUsers([])
    } catch (error) {
      console.error('Error stopping presence tracking:', error)
    }
  }, [companyId])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away')
      } else {
        updatePresence('available')
      }
    }

    const handleBeforeUnload = () => {
      updatePresence('offline')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [updatePresence])

  // Auto-start tracking when user and company are available
  useEffect(() => {
    if (user && companyId && !isTracking) {
      startTracking()
    }

    return () => {
      if (isTracking) {
        stopTracking()
      }
    }
  }, [user, companyId, isTracking, startTracking, stopTracking])

  // Get user status by ID
  const getUserStatus = useCallback((userId: string): UserPresence['status'] => {
    const userPresence = onlineUsers.find(u => u.user_id === userId)
    return userPresence?.status || 'offline'
  }, [onlineUsers])

  // Check if user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    const status = getUserStatus(userId)
    return status === 'available' || status === 'focus' || status === 'meeting' || status === 'away' || status === 'break' || status === 'emergency'
  }, [getUserStatus])

  // Get online user count (all statuses except offline)
  const onlineCount = onlineUsers.filter(u => u.status !== 'offline').length

  return {
    presenceState,
    onlineUsers,
    onlineCount,
    isTracking,
    updatePresence,
    startTracking,
    stopTracking,
    getUserStatus,
    isUserOnline
  }
}