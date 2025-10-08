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
  loadWorkspaceData: (company: Company) => Promise<void>;
  loadWorkspaceBySubdomain: (subdomain: string) => Promise<{ success: boolean; company?: Company; error?: string }>;
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

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const loadUserCompanies = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      const isSubdomain = (hostname.includes('.') && !hostname.includes('localhost')) || 
                         (hostname.includes('localhost') && hostname.split('.').length > 2);

      const isMainDomain = hostname === 'localhost' || 
                          hostname === '127.0.0.1' ||
                          hostname === 'starvibe.space' ||
                          hostname === 'www.starvibe.space' ||
                          hostname === 'uproom.com' ||
                          hostname === 'www.uproom.com' ||
                          hostname.includes('uproomvp.vercel.app');
      
      // Only skip loading if we're on a subdomain (workspace-specific domain)
      // On main domain, we should load user companies for the workspaces page
      if (isSubdomain) {
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        return;
      }

      const response = await fetch(`${API_URL}/companies/user/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserCompanies(data.companies);
        
        if (data.companies.length > 0 && !currentCompany) {
          const firstCompany = data.companies[0];
          setCurrentCompany(firstCompany);
          
          if (firstCompany.userRole) {
            setUserRole(firstCompany.userRole);
          }
          
          await loadCompanyData(firstCompany.id);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('auth_token');
        setUserCompanies([]);
        setCurrentCompany(null);
      } else {
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadUserCompanies();
    } else {
      setCurrentCompany(null);
      setUserCompanies([]);
      setUserRole(null);
      setCompanyMembers([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (userCompanies.length > 0 && !currentCompany) {
      setCurrentCompany(userCompanies[0]);
      loadCompanyData(userCompanies[0].id);
    }
  }, [userCompanies]);

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
        // Don't set userRole to null, keep existing value
      }

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setCompanyMembers(membersData.members);
      } else if (membersResponse.status === 404) {
        // Don't set companyMembers to empty, keep existing value
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar dados da empresa:', error);
    }
  };

  // Função para carregar dados da workspace quando estamos em um subdomínio
  const loadWorkspaceData = useCallback(async (company: Company) => {
    if (!user) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      return;
    }

    setIsLoading(true);
    try {
      setCurrentCompany(company);
      await loadCompanyData(company.id);
    } catch (error) {
      console.error('Erro inesperado ao carregar dados da workspace:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        // Recarregar a lista de empresas para garantir que os dados estejam atualizados
        await loadUserCompanies();
        
        // Buscar a empresa recém-criada e setar como current
        const companiesResponse = await fetch(`${API_URL}/companies/user/${user?.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          const newCompany = companiesData.companies.find((c: Company) => c.subdomain === data.subdomain);
          
          if (newCompany) {
            setCurrentCompany(newCompany);
            
            if (newCompany.userRole) {
              setUserRole(newCompany.userRole);
            }
            
            await loadCompanyData(newCompany.id);
          }
        }
        
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to create company' };
    } catch (error) {
      console.error('Erro inesperado ao criar empresa:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    const company = userCompanies.find(c => c.id === companyId);
    if (!company) return;

    setCurrentCompany(company);
    
    if (company.userRole) {
      setUserRole(company.userRole);
    }
    
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
      console.error('Erro inesperado ao atualizar empresa:', error);
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
        return { success: true, data: result };
      }

      console.error('Erro ao enviar convite:', {
        status: response.status,
        statusText: response.statusText,
        result,
      });

      return { 
        success: false, 
        error: result.error || result.message || `Failed to invite user (${response.status})` 
      };
    } catch (error) {
      console.error('Erro inesperado ao convidar usuário:', error);
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
      console.error('Erro inesperado ao atualizar papel do membro:', error);
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
      console.error('Erro inesperado ao remover membro:', error);
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
      console.error('Erro inesperado ao verificar disponibilidade do subdomínio:', error);
      return { available: false, error: 'An unexpected error occurred' };
    }
  };

  const loadWorkspaceBySubdomain = async (subdomain: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { success: false, error: 'Token de autenticação não encontrado' };
      }

      const response = await fetch(`${API_URL}/companies/by-subdomain/${subdomain}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const company = result.company;
        
        if (company) {
          setCurrentCompany(company);
          await loadCompanyData(company.id);
          return { success: true, company };
        } else {
          return { success: false, error: 'Workspace não encontrada' };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Erro ao carregar workspace' };
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar workspace por subdomain:', error);
      return { success: false, error: 'Erro inesperado ao carregar workspace' };
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
    loadWorkspaceData,
    loadWorkspaceBySubdomain,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};
