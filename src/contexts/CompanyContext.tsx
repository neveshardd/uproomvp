import React, { createContext, useContext, useEffect, useState } from 'react'
import { CompanyService } from '@/lib/company'
import { useAuth } from './AuthContext'
import type { Company, CompanyMember, UserRole } from '@/types/company'

interface CompanyContextType {
  // State
  currentCompany: Company | null
  userCompanies: Company[]
  userRole: UserRole | null
  companyMembers: CompanyMember[]
  isLoading: boolean
  
  // Actions
  createCompany: (data: { name: string; subdomain: string; description?: string }) => Promise<{ success: boolean; error?: string }>
  switchCompany: (companyId: string) => Promise<void>
  updateCompany: (data: { name?: string; description?: string; logo_url?: string; website_url?: string }) => Promise<{ success: boolean; error?: string }>
  inviteUser: (email: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  updateMemberRole: (memberId: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>
  refreshCompanyData: () => Promise<void>
  checkSubdomainAvailability: (subdomain: string) => Promise<{ available: boolean; error?: string }>
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export const useCompany = () => {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

interface CompanyProviderProps {
  children: React.ReactNode
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user, profile } = useAuth()
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [userCompanies, setUserCompanies] = useState<Company[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load user companies when user changes
  useEffect(() => {
    if (user) {
      loadUserCompanies()
    } else {
      // Clear state when user logs out
      setCurrentCompany(null)
      setUserCompanies([])
      setUserRole(null)
      setCompanyMembers([])
    }
  }, [user])

  // Load current company when profile changes
  useEffect(() => {
    if (profile?.current_company_id && userCompanies.length > 0) {
      const company = userCompanies.find(c => c.id === profile.current_company_id)
      if (company) {
        setCurrentCompany(company)
        loadCompanyData(company.id)
      }
    }
  }, [profile?.current_company_id, userCompanies])

  const loadUserCompanies = async () => {
    setIsLoading(true)
    try {
      const { companies, error } = await CompanyService.getUserCompanies()
      if (error) {
        console.error('Error loading companies:', error)
      } else {
        setUserCompanies(companies)
        
        // If user has companies but no current company set, set the first one
        if (companies.length > 0 && !profile?.current_company_id) {
          await switchCompany(companies[0].id)
        }
      }
    } catch (error) {
      console.error('Unexpected error loading companies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompanyData = async (companyId: string) => {
    try {
      // Load user role
      const { role, error: roleError } = await CompanyService.getUserRole(companyId)
      if (roleError) {
        console.error('Error loading user role:', roleError)
      } else {
        setUserRole(role)
      }

      // Load company members
      const { members, error: membersError } = await CompanyService.getCompanyMembers(companyId)
      if (membersError) {
        console.error('Error loading company members:', membersError)
      } else {
        setCompanyMembers(members)
      }
    } catch (error) {
      console.error('Unexpected error loading company data:', error)
    }
  }

  const createCompany = async (data: { name: string; subdomain: string; description?: string }) => {
    setIsLoading(true)
    try {
      const { company, error } = await CompanyService.createCompany(data)
      if (error) {
        return { success: false, error }
      }

      if (company) {
        // Refresh companies list
        await loadUserCompanies()
        return { success: true }
      }

      return { success: false, error: 'Failed to create company' }
    } catch (error) {
      console.error('Unexpected error creating company:', error)
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      setIsLoading(false)
    }
  }

  const switchCompany = async (companyId: string) => {
    const company = userCompanies.find(c => c.id === companyId)
    if (!company) return

    setCurrentCompany(company)
    await loadCompanyData(companyId)

    // Update user's current company in profile
    // This would typically be done through a profile update API call
    // For now, we'll just update the local state
  }

  const updateCompany = async (data: { name?: string; description?: string; logo_url?: string; website_url?: string }) => {
    if (!currentCompany) {
      return { success: false, error: 'No company selected' }
    }

    setIsLoading(true)
    try {
      const { company, error } = await CompanyService.updateCompany(currentCompany.id, data)
      if (error) {
        return { success: false, error }
      }

      if (company) {
        setCurrentCompany(company)
        // Update in companies list
        setUserCompanies(prev => 
          prev.map(c => c.id === company.id ? company : c)
        )
        return { success: true }
      }

      return { success: false, error: 'Failed to update company' }
    } catch (error) {
      console.error('Unexpected error updating company:', error)
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      setIsLoading(false)
    }
  }

  const inviteUser = async (email: string, role: UserRole) => {
    if (!currentCompany) {
      return { success: false, error: 'No company selected' }
    }

    try {
      const { invitation, error } = await CompanyService.inviteUser({
        email,
        role,
        company_id: currentCompany.id
      })

      if (error) {
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      console.error('Unexpected error inviting user:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const updateMemberRole = async (memberId: string, role: UserRole) => {
    try {
      const { member, error } = await CompanyService.updateMemberRole({ member_id: memberId, role })
      if (error) {
        return { success: false, error }
      }

      if (member) {
        // Update in members list
        setCompanyMembers(prev =>
          prev.map(m => m.id === member.id ? { ...m, role: member.role } : m)
        )
        return { success: true }
      }

      return { success: false, error: 'Failed to update member role' }
    } catch (error) {
      console.error('Unexpected error updating member role:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const { success, error } = await CompanyService.removeMember(memberId)
      if (error) {
        return { success: false, error }
      }

      if (success) {
        // Remove from members list
        setCompanyMembers(prev => prev.filter(m => m.id !== memberId))
        return { success: true }
      }

      return { success: false, error: 'Failed to remove member' }
    } catch (error) {
      console.error('Unexpected error removing member:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const refreshCompanyData = async () => {
    if (currentCompany) {
      await loadCompanyData(currentCompany.id)
    }
    await loadUserCompanies()
  }

  const checkSubdomainAvailability = async (subdomain: string) => {
    try {
      const { available, error } = await CompanyService.checkSubdomainAvailability(subdomain)
      if (error) {
        return { available: false, error }
      }
      return { available }
    } catch (error) {
      console.error('Unexpected error checking subdomain:', error)
      return { available: false, error: 'An unexpected error occurred' }
    }
  }

  const value: CompanyContextType = {
    // State
    currentCompany,
    userCompanies,
    userRole,
    companyMembers,
    isLoading,
    
    // Actions
    createCompany,
    switchCompany,
    updateCompany,
    inviteUser,
    updateMemberRole,
    removeMember,
    refreshCompanyData,
    checkSubdomainAvailability,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export default CompanyProvider