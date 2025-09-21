import { supabase } from './supabase'
import type { CompanyInvitation, UserRole } from '@/types/company'

export interface InviteUserData {
  email: string
  role: UserRole
  companyId: string
}

export interface InvitationWithCompany extends CompanyInvitation {
  company: {
    name: string
    subdomain: string
  }
}

export class InvitationService {
  /**
   * Send invitation to user
   */
  static async inviteUser(data: InviteUserData): Promise<{ 
    invitation: CompanyInvitation | null
    error: string | null 
  }> {
    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', data.companyId)
        .eq('user_id', (
          await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.email)
            .single()
        ).data?.id)
        .single()

      if (existingMember) {
        return { invitation: null, error: 'User is already a member of this company' }
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('company_invitations')
        .select('id, status')
        .eq('company_id', data.companyId)
        .eq('email', data.email)
        .single()

      if (existingInvitation) {
        if (existingInvitation.status === 'pending') {
          return { invitation: null, error: 'Invitation already sent to this email' }
        }
        
        // Update existing invitation if it was declined or expired
        const { data: updatedInvitation, error: updateError } = await supabase
          .from('company_invitations')
          .update({
            role: data.role,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInvitation.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating invitation:', updateError)
          return { invitation: null, error: updateError.message }
        }

        return { invitation: updatedInvitation, error: null }
      }

      // Create new invitation
      const { data: invitation, error } = await supabase
        .from('company_invitations')
        .insert({
          company_id: data.companyId,
          email: data.email,
          role: data.role,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          invited_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating invitation:', error)
        return { invitation: null, error: error.message }
      }

      // Send invitation email (this would typically be handled by a backend service)
      await this.sendInvitationEmail(invitation, data.email)

      return { invitation, error: null }
    } catch (error) {
      console.error('Error inviting user:', error)
      return { invitation: null, error: 'Failed to send invitation' }
    }
  }

  /**
   * Get pending invitations for a company
   */
  static async getCompanyInvitations(companyId: string): Promise<{
    invitations: CompanyInvitation[]
    error: string | null
  }> {
    try {
      const { data: invitations, error } = await supabase
        .from('company_invitations')
        .select(`
          *,
          invited_by_profile:profiles!company_invitations_invited_by_fkey(
            full_name,
            email
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invitations:', error)
        return { invitations: [], error: error.message }
      }

      return { invitations: invitations || [], error: null }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      return { invitations: [], error: 'Failed to fetch invitations' }
    }
  }

  /**
   * Get invitations for a user (by email)
   */
  static async getUserInvitations(email: string): Promise<{
    invitations: InvitationWithCompany[]
    error: string | null
  }> {
    try {
      const { data: invitations, error } = await supabase
        .from('company_invitations')
        .select(`
          *,
          company:companies(
            name,
            subdomain
          )
        `)
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user invitations:', error)
        return { invitations: [], error: error.message }
      }

      return { invitations: invitations || [], error: null }
    } catch (error) {
      console.error('Error fetching user invitations:', error)
      return { invitations: [], error: 'Failed to fetch invitations' }
    }
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(invitationId: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { error } = await supabase.rpc('accept_company_invitation', {
        invitation_id: invitationId
      })

      if (error) {
        console.error('Error accepting invitation:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      return { success: false, error: 'Failed to accept invitation' }
    }
  }

  /**
   * Decline invitation
   */
  static async declineInvitation(invitationId: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { error } = await supabase
        .from('company_invitations')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (error) {
        console.error('Error declining invitation:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error declining invitation:', error)
      return { success: false, error: 'Failed to decline invitation' }
    }
  }

  /**
   * Cancel invitation (for company owners/admins)
   */
  static async cancelInvitation(invitationId: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { error } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) {
        console.error('Error canceling invitation:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error canceling invitation:', error)
      return { success: false, error: 'Failed to cancel invitation' }
    }
  }

  /**
   * Send invitation email (placeholder - would be implemented with email service)
   */
  private static async sendInvitationEmail(
    invitation: CompanyInvitation, 
    email: string
  ): Promise<void> {
    // In a real application, this would send an email using a service like:
    // - Supabase Auth (with custom email templates)
    // - SendGrid, Mailgun, etc.
    // - Custom email service
    
    console.log(`Invitation email would be sent to ${email}`, {
      invitationId: invitation.id,
      companyId: invitation.company_id,
      role: invitation.role
    })

    // For now, we'll just log the invitation details
    // In production, you would integrate with your email service here
  }

  /**
   * Resend invitation
   */
  static async resendInvitation(invitationId: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      // Update expiry date
      const { error: updateError } = await supabase
        .from('company_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
        return { success: false, error: updateError.message }
      }

      // Resend email
      await this.sendInvitationEmail(invitation, invitation.email)

      return { success: true, error: null }
    } catch (error) {
      console.error('Error resending invitation:', error)
      return { success: false, error: 'Failed to resend invitation' }
    }
  }
}