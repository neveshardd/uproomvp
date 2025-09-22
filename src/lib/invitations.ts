import { supabase } from './supabase'
import { MailgunService } from './mailgun'
import { SubdomainService } from './subdomain'
import { UserRole, CompanyInvitation, InviteUserData } from '@/types/company'

export interface InvitationResult {
  success: boolean
  message: string
  invitation?: CompanyInvitation
}

export class InvitationService {
  /**
   * Validate invitation token without accepting it
   */
  static async validateInvitation(token: string): Promise<InvitationResult> {
    try {
      // Find invitation by token
      const { data: invitation, error: invitationError } = await supabase
        .from('company_invitations')
        .select(`
          *,
          company:companies(*),
          inviter:profiles!company_invitations_invited_by_fkey(
            id,
            email,
            full_name
          )
        `)
        .eq('token', token)
        .single()

      if (invitationError || !invitation) {
        return {
          success: false,
          message: 'Invalid invitation token'
        }
      }

      // Check if invitation has expired
      const expiresAt = new Date(invitation.expires_at)
      if (expiresAt <= new Date()) {
        return {
          success: false,
          message: 'Invitation has expired'
        }
      }

      // Check if already accepted
      if (invitation.accepted_at) {
        return {
          success: false,
          message: 'Invitation has already been accepted'
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          message: 'Authentication required'
        }
      }

      // Check if user email matches invitation
      if (user.email !== invitation.email) {
        return {
          success: false,
          message: 'This invitation is for a different email address'
        }
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', invitation.company_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        return {
          success: false,
          message: 'You are already a member of this company'
        }
      }

      return {
        success: true,
        message: 'Invitation is valid',
        invitation
      }

    } catch (error) {
      console.error('Error validating invitation:', error)
      return {
        success: false,
        message: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Generate a secure invitation token
   */
  private static generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Create and send invitation
   */
  static async inviteUser(data: InviteUserData): Promise<InvitationResult> {
    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', data.company_id)
        .eq('user_id', (await supabase.from('profiles').select('id').eq('email', data.email).single())?.data?.id)
        .single()

      if (existingMember) {
        return {
          success: false,
          message: 'User is already a member of this company'
        }
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('company_invitations')
        .select('id, expires_at')
        .eq('company_id', data.company_id)
        .eq('email', data.email)
        .single()

      if (existingInvitation) {
        const expiresAt = new Date(existingInvitation.expires_at)
        if (expiresAt > new Date()) {
          return {
            success: false,
            message: 'An active invitation already exists for this email'
          }
        }
        
        // Delete expired invitation
        await supabase
          .from('company_invitations')
          .delete()
          .eq('id', existingInvitation.id)
      }

      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', data.company_id)
        .single()

      if (companyError || !company) {
        return {
          success: false,
          message: 'Company not found'
        }
      }

      // Get inviter details
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          message: 'Authentication required'
        }
      }

      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      // Generate invitation token and expiry
      const token = this.generateToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

      // Create invitation record
      const { data: invitation, error: invitationError } = await supabase
        .from('company_invitations')
        .insert({
          company_id: data.company_id,
          email: data.email,
          role: data.role,
          invited_by: user.id,
          token,
          expires_at: expiresAt.toISOString()
        })
        .select('*')
        .single()

      if (invitationError) {
        console.error('Error creating invitation:', invitationError)
        return {
          success: false,
          message: 'Failed to create invitation'
        }
      }

      // Generate invitation URL
      const invitationUrl = this.generateInvitationUrl(token, company.subdomain)

      // Send invitation email
      const emailSent = await MailgunService.sendInvitationEmail({
        recipientEmail: data.email,
        companyName: company.name,
        inviterName: inviterProfile?.full_name || inviterProfile?.email || user.email || 'Team member',
        inviterEmail: inviterProfile?.email || user.email || '',
        invitationToken: token,
        invitationUrl,
        role: data.role
      })

      if (!emailSent) {
        // Delete the invitation if email failed
        await supabase
          .from('company_invitations')
          .delete()
          .eq('id', invitation.id)

        return {
          success: false,
          message: 'Failed to send invitation email'
        }
      }

      return {
        success: true,
        message: 'Invitation sent successfully',
        invitation
      }

    } catch (error) {
      console.error('Error inviting user:', error)
      return {
        success: false,
        message: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(token: string): Promise<InvitationResult> {
    try {
      // Find invitation by token
      const { data: invitation, error: invitationError } = await supabase
        .from('company_invitations')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('token', token)
        .single()

      if (invitationError || !invitation) {
        return {
          success: false,
          message: 'Invalid invitation token'
        }
      }

      // Check if invitation has expired
      const expiresAt = new Date(invitation.expires_at)
      if (expiresAt <= new Date()) {
        return {
          success: false,
          message: 'Invitation has expired'
        }
      }

      // Check if already accepted
      if (invitation.accepted_at) {
        return {
          success: false,
          message: 'Invitation has already been accepted'
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          message: 'Authentication required'
        }
      }

      // Check if user email matches invitation
      if (user.email !== invitation.email) {
        return {
          success: false,
          message: 'This invitation is for a different email address'
        }
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', invitation.company_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        // Mark invitation as accepted and return success
        await supabase
          .from('company_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id)

        return {
          success: true,
          message: 'You are already a member of this company',
          invitation
        }
      }

      // Add user to company
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          user_id: user.id,
          company_id: invitation.company_id,
          role: invitation.role,
          invited_by: invitation.invited_by,
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding company member:', memberError)
        return {
          success: false,
          message: 'Failed to join company'
        }
      }

      // Mark invitation as accepted
      await supabase
        .from('company_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return {
        success: true,
        message: 'Successfully joined the company!',
        invitation
      }

    } catch (error) {
      console.error('Error accepting invitation:', error)
      return {
        success: false,
        message: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get pending invitations for a company
   */
  static async getCompanyInvitations(companyId: string): Promise<CompanyInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('company_invitations')
        .select(`
          *,
          inviter:profiles!company_invitations_invited_by_fkey(
            id,
            email,
            full_name
          )
        `)
        .eq('company_id', companyId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invitations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching invitations:', error)
      return []
    }
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId)

      return !error
    } catch (error) {
      console.error('Error canceling invitation:', error)
      return false
    }
  }

  /**
   * Generate invitation URL
   */
  private static generateInvitationUrl(token: string, subdomain: string): string {
    const baseUrl = SubdomainService.getWorkspaceUrl(subdomain)
    return `${baseUrl}/invite/${token}`
  }

  /**
   * Resend invitation
   */
  static async resendInvitation(invitationId: string): Promise<InvitationResult> {
    try {
      const { data: invitation, error } = await supabase
        .from('company_invitations')
        .select(`
          *,
          company:companies(*),
          inviter:profiles!company_invitations_invited_by_fkey(*)
        `)
        .eq('id', invitationId)
        .single()

      if (error || !invitation) {
        return {
          success: false,
          message: 'Invitation not found'
        }
      }

      // Check if invitation has expired
      const expiresAt = new Date(invitation.expires_at)
      if (expiresAt <= new Date()) {
        return {
          success: false,
          message: 'Cannot resend expired invitation'
        }
      }

      // Generate new invitation URL
      const invitationUrl = this.generateInvitationUrl(invitation.token, invitation.company.subdomain)

      // Resend email
      const emailSent = await MailgunService.sendInvitationEmail({
        recipientEmail: invitation.email,
        companyName: invitation.company.name,
        inviterName: invitation.inviter?.full_name || invitation.inviter?.email || 'Team member',
        inviterEmail: invitation.inviter?.email || '',
        invitationToken: invitation.token,
        invitationUrl,
        role: invitation.role
      })

      if (!emailSent) {
        return {
          success: false,
          message: 'Failed to resend invitation email'
        }
      }

      return {
        success: true,
        message: 'Invitation resent successfully'
      }

    } catch (error) {
      console.error('Error resending invitation:', error)
      return {
        success: false,
        message: 'An unexpected error occurred'
      }
    }
  }
}