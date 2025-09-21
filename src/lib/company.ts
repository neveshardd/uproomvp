import { supabase } from './supabase'
import { SubdomainService } from './subdomain'
import type { 
  Company, 
  CompanyMember, 
  CompanyInvitation, 
  CreateCompanyData, 
  InviteUserData, 
  UpdateCompanyData,
  UpdateMemberRoleData,
  UserRole 
} from '@/types/company'

export class CompanyService {
  /**
   * Create a new company with subdomain validation
   */
  static async createCompany(data: {
    name: string
    description?: string
    subdomain?: string
  }): Promise<{ company: Company | null; error: string | null }> {
    try {
      // Generate subdomain if not provided
      let subdomain = data.subdomain || SubdomainService.generateSubdomain(data.name)
      
      // Validate subdomain
      const validation = await SubdomainService.validateSubdomain(subdomain)
      if (!validation.isValid || !validation.isAvailable) {
        // Try to generate alternatives
        const alternatives = await SubdomainService.generateAlternatives(subdomain, 3)
        if (alternatives.length > 0) {
          subdomain = alternatives[0]
        } else {
          return { company: null, error: validation.message }
        }
      }

      const { data: company, error } = await supabase
        .rpc('create_company_with_owner', {
          company_name: data.name,
          company_subdomain: subdomain,
          company_description: data.description || null
        })

      if (error) {
        console.error('Error creating company:', error)
        return { company: null, error: error.message }
      }

      return { company, error: null }
    } catch (error) {
      console.error('Error creating company:', error)
      return { company: null, error: 'Failed to create company' }
    }
  }

  // Get user's companies
  static async getUserCompanies(): Promise<{ companies: Company[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { companies: [], error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('company_members')
        .select(`
          role,
          is_active,
          companies (
            id,
            name,
            subdomain,
            description,
            logo_url,
            website_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching user companies:', error)
        return { companies: [], error: error.message }
      }

      // Transform the data to match the expected Company type
      const companies = data?.map(item => item.companies).filter(Boolean) || []
      return { companies, error: null }
    } catch (error) {
      console.error('Unexpected error fetching companies:', error)
      return { companies: [], error: 'An unexpected error occurred' }
    }
  }

  // Get company by ID
  static async getCompany(companyId: string): Promise<{ company: Company | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) {
        console.error('Error fetching company:', error)
        return { company: null, error: error.message }
      }

      return { company: data, error: null }
    } catch (error) {
      console.error('Unexpected error fetching company:', error)
      return { company: null, error: 'An unexpected error occurred' }
    }
  }

  // Update company
  static async updateCompany(companyId: string, data: UpdateCompanyData): Promise<{ company: Company | null; error: string | null }> {
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select()
        .single()

      if (error) {
        console.error('Error updating company:', error)
        return { company: null, error: error.message }
      }

      return { company, error: null }
    } catch (error) {
      console.error('Unexpected error updating company:', error)
      return { company: null, error: 'An unexpected error occurred' }
    }
  }

  // Get company members
  static async getCompanyMembers(companyId: string): Promise<{ members: CompanyMember[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          *,
          user:profiles(
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching company members:', error)
        return { members: [], error: error.message }
      }

      return { members: data || [], error: null }
    } catch (error) {
      console.error('Unexpected error fetching members:', error)
      return { members: [], error: 'An unexpected error occurred' }
    }
  }

  // Invite user to company
  static async inviteUser(data: InviteUserData): Promise<{ invitation: CompanyInvitation | null; error: string | null }> {
    try {
      // Generate invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const { data: invitation, error } = await supabase
        .from('company_invitations')
        .insert({
          company_id: data.company_id,
          email: data.email,
          role: data.role,
          token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating invitation:', error)
        return { invitation: null, error: error.message }
      }

      return { invitation, error: null }
    } catch (error) {
      console.error('Unexpected error creating invitation:', error)
      return { invitation: null, error: 'An unexpected error occurred' }
    }
  }

  // Accept company invitation
  static async acceptInvitation(token: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('accept_company_invitation', {
        invitation_token: token
      })

      if (error) {
        console.error('Error accepting invitation:', error)
        return { success: false, error: error.message }
      }

      return { success: data, error: null }
    } catch (error) {
      console.error('Unexpected error accepting invitation:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Update member role
  static async updateMemberRole(data: UpdateMemberRoleData): Promise<{ member: CompanyMember | null; error: string | null }> {
    try {
      const { data: member, error } = await supabase
        .from('company_members')
        .update({
          role: data.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.member_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating member role:', error)
        return { member: null, error: error.message }
      }

      return { member, error: null }
    } catch (error) {
      console.error('Unexpected error updating member role:', error)
      return { member: null, error: 'An unexpected error occurred' }
    }
  }

  // Remove member from company
  static async removeMember(memberId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('company_members')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)

      if (error) {
        console.error('Error removing member:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Unexpected error removing member:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Get company invitations
  static async getCompanyInvitations(companyId: string): Promise<{ invitations: CompanyInvitation[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('company_invitations')
        .select(`
          *,
          inviter:profiles!invited_by(
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
        return { invitations: [], error: error.message }
      }

      return { invitations: data || [], error: null }
    } catch (error) {
      console.error('Unexpected error fetching invitations:', error)
      return { invitations: [], error: 'An unexpected error occurred' }
    }
  }

  // Check subdomain availability
  static async checkSubdomainAvailability(subdomain: string): Promise<{ available: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle()

      if (error) {
        console.error('Error checking subdomain:', error)
        return { available: false, error: error.message }
      }

      return { available: !data, error: null }
    } catch (error) {
      console.error('Unexpected error checking subdomain:', error)
      return { available: false, error: 'An unexpected error occurred' }
    }
  }

  // Get user's role in company
  static async getUserRole(companyId: string): Promise<{ role: UserRole | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        return { role: null, error: error.message }
      }

      return { role: data.role, error: null }
    } catch (error) {
      console.error('Unexpected error fetching user role:', error)
      return { role: null, error: 'An unexpected error occurred' }
    }
  }
}