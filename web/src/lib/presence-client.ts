import api from './api'

export interface UserPresence {
  id: string
  userId: string
  companyId: string
  status: 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE'
  message?: string
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    email: string
    name: string
    avatar?: string
  }
}

export interface UpdatePresenceData {
  status: 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE'
  message?: string
  isOnline?: boolean
}

export class PresenceService {
  private static readonly API_BASE = '/presence'

  /**
   * Get user presence for a company
   */
  static async getUserPresence(companyId: string): Promise<{ presence?: UserPresence; error?: string }> {
    try {
      const response = await api.get(`${this.API_BASE}/${companyId}`)
      return response.data
    } catch (error) {
      console.error('Error getting user presence:', error)
      return { error: 'Failed to load presence' }
    }
  }

  /**
   * Update user presence
   */
  static async updatePresence(companyId: string, data: UpdatePresenceData): Promise<{ presence?: UserPresence; error?: string }> {
    try {
      const response = await api.put(`${this.API_BASE}/${companyId}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating presence:', error)
      return { error: 'Failed to update presence' }
    }
  }

  /**
   * Get all company members presence
   */
  static async getCompanyPresences(companyId: string): Promise<{ presences: UserPresence[]; error?: string }> {
    try {
      const response = await api.get(`${this.API_BASE}/${companyId}/members`)
      return response.data
    } catch (error) {
      console.error('Error getting company presences:', error)
      return { presences: [], error: 'Failed to load presences' }
    }
  }
}
