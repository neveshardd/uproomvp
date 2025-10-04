'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Company, CompanyMember, UserRole } from '@/lib/types';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  currentCompany: Company | null;
  userCompanies: Company[];
  userRole: UserRole | null;
  companyMembers: CompanyMember[];
  isLoading: boolean;
  
  createCompany: (data: { name: string; subdomain: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  switchCompany: (companyId: string) => Promise<void>;
  updateCompany: (data: { name?: string; description?: string; logo_url?: string; website_url?: string }) => Promise<{ success: boolean; error?: string }>;
  inviteUser: (role: UserRole) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  refreshCompanyData: () => Promise<void>;
  checkSubdomainAvailability: (subdomain: string) => Promise<{ available: boolean; error?: string }>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: React.ReactNode;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUserCompanies = useCallback(async () => {
    console.log('🔍 CompanyContext: loadUserCompanies called');
    
    // Check if we're in a workspace (subdomain)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      console.log('🔍 CompanyContext: hostname:', hostname);
      
      const isSubdomain = hostname.includes('.') && !hostname.includes('localhost') || 
                         (hostname.includes('localhost') && hostname.split('.').length > 2);
      
      console.log('🔍 CompanyContext: isSubdomain:', isSubdomain);
      
      if (isSubdomain) {
        console.log('🔍 CompanyContext: Em workspace, não carregando empresas');
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔍 CompanyContext: Token encontrado:', !!token);
      
      if (!token) {
        console.log('❌ CompanyContext: Nenhum token encontrado');
        return;
      }

      console.log('🔍 CompanyContext: Fazendo requisição para:', `${API_URL}/companies/user/${user?.id}`);
      const response = await fetch(`${API_URL}/companies/user/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔍 CompanyContext: Resposta do servidor:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 CompanyContext: Setting userCompanies to:', data.companies);
        setUserCompanies(data.companies);
        
        if (data.companies.length > 0 && !currentCompany) {
          console.log('🔍 CompanyContext: Setting first company as current:', data.companies[0].id);
          setCurrentCompany(data.companies[0]);
          await loadCompanyData(data.companies[0].id);
        }
      } else if (response.status === 401) {
        console.log('❌ CompanyContext: Token inválido (401), limpando localStorage');
        localStorage.removeItem('auth_token');
        setUserCompanies([]);
        setCurrentCompany(null);
      } else {
        console.log('❌ CompanyContext: Erro na requisição:', response.status);
      }
    } catch (error) {
      console.error('❌ CompanyContext: Erro inesperado:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentCompany]);

  useEffect(() => {
    console.log('🔍 CompanyContext: useEffect triggered, user:', user?.id);
    if (user) {
      console.log('🔍 CompanyContext: User exists, calling loadUserCompanies');
      loadUserCompanies();
    } else {
      console.log('🔍 CompanyContext: No user, clearing state');
      setCurrentCompany(null);
      setUserCompanies([]);
      setUserRole(null);
      setCompanyMembers([]);
    }
  }, [user, loadUserCompanies]);

  useEffect(() => {
    if (userCompanies.length > 0 && !currentCompany) {
      setCurrentCompany(userCompanies[0]);
      loadCompanyData(userCompanies[0].id);
    }
  }, [userCompanies, currentCompany]);

  const loadCompanyData = async (companyId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const [roleResponse, membersResponse] = await Promise.all([
        fetch(`${API_URL}/companies/${companyId}/user-role`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/companies/${companyId}/members`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setUserRole(roleData.role);
      } else if (roleResponse.status === 404) {
        console.log('🔍 CompanyContext: User not a member of this company, skipping role load');
        // Don't set userRole to null, keep existing value
      }

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setCompanyMembers(membersData.members);
      } else if (membersResponse.status === 404) {
        console.log('🔍 CompanyContext: User not a member of this company, skipping members load');
        // Don't set companyMembers to empty, keep existing value
      }
    } catch (error) {
      console.error('Unexpected error loading company data:', error);
    }
  };

  const createCompany = async (data: { name: string; subdomain: string; description?: string }) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, error: 'Not authenticated' };

      const response = await fetch(`${API_URL}/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setUserCompanies(prev => [...prev, result.company]);
        setCurrentCompany(result.company);
        await loadCompanyData(result.company.id);
        await loadUserCompanies();
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to create company' };
    } catch (error) {
      console.error('Unexpected error creating company:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    const company = userCompanies.find(c => c.id === companyId);
    if (!company) return;

    setCurrentCompany(company);
    await loadCompanyData(companyId);
  };

  const updateCompany = async (data: { name?: string; description?: string; logo_url?: string; website_url?: string }) => {
    if (!currentCompany) {
      return { success: false, error: 'No company selected' };
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, error: 'Not authenticated' };

      const response = await fetch(`${API_URL}/companies/${currentCompany.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setCurrentCompany(result.company);
        setUserCompanies(prev => 
          prev.map(c => c.id === result.company.id ? result.company : c)
        );
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to update company' };
    } catch (error) {
      console.error('Unexpected error updating company:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const inviteUser = async (role: UserRole) => {
    if (!currentCompany) {
      return { success: false, error: 'No company selected' };
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, error: 'Not authenticated' };

      console.log('🔍 Gerando link de convite:', {
        role,
        companyId: currentCompany.id,
        companyName: currentCompany.name
      });

      const response = await fetch(`${API_URL}/invitations/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          companyId: currentCompany.id
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Convite enviado com sucesso:', result);
        return { success: true, data: result };
      }

      console.error('❌ Erro ao enviar convite:', {
        status: response.status,
        statusText: response.statusText,
        result
      });

      return { 
        success: false, 
        error: result.error || result.message || `Failed to invite user (${response.status})` 
      };
    } catch (error) {
      console.error('Unexpected error inviting user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updateMemberRole = async (memberId: string, role: UserRole) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, error: 'Not authenticated' };

      const response = await fetch(`${API_URL}/companies/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      const result = await response.json();

      if (response.ok) {
        setCompanyMembers(prev =>
          prev.map(m => m.id === memberId ? { ...m, role: result.member.role } : m)
        );
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to update member role' };
    } catch (error) {
      console.error('Unexpected error updating member role:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, error: 'Not authenticated' };

      const response = await fetch(`${API_URL}/companies/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCompanyMembers(prev => prev.filter(m => m.id !== memberId));
        return { success: true };
      }

      const result = await response.json();
      return { success: false, error: result.error || 'Failed to remove member' };
    } catch (error) {
      console.error('Unexpected error removing member:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const refreshCompanyData = async () => {
    if (currentCompany) {
      await loadCompanyData(currentCompany.id);
    }
    await loadUserCompanies();
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    try {
      const response = await fetch(`${API_URL}/companies/check-subdomain/${subdomain}`);
      const result = await response.json();

      if (response.ok) {
        return { available: result.available };
      }

      return { available: false, error: result.error || 'Failed to check subdomain' };
    } catch (error) {
      console.error('Unexpected error checking subdomain:', error);
      return { available: false, error: 'An unexpected error occurred' };
    }
  };

  const value: CompanyContextType = {
    currentCompany,
    userCompanies,
    userRole,
    companyMembers,
    isLoading,
    createCompany,
    switchCompany,
    updateCompany,
    inviteUser,
    updateMemberRole,
    removeMember,
    refreshCompanyData,
    checkSubdomainAvailability,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};
