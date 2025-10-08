import { useCompany } from '@/contexts/CompanyContext';

interface Permission {
  canAccessSettings: boolean;
  canInviteUsers: boolean;
  canManageMembers: boolean;
  canDeleteCompany: boolean;
  canCreateGroups: boolean;
  canManageGroups: boolean;
}

export const usePermissions = (): Permission => {
  const { userRole } = useCompany();

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
  const isMember = userRole === 'MEMBER';

  return {
    canAccessSettings: isAdmin,
    
    canInviteUsers: isAdmin,
    
    canManageMembers: isAdmin,
    
    canDeleteCompany: isAdmin,
    
    canCreateGroups: isAdmin || isMember,
    
    canManageGroups: isAdmin,
  };
};

export const usePermission = (permission: keyof Permission): boolean => {
  const permissions = usePermissions();
  return permissions[permission];
};

export const useIsAdmin = (): boolean => {
  const { userRole } = useCompany();
  return userRole === 'ADMIN' || userRole === 'OWNER';
};

export const useIsMember = (): boolean => {
  const { userRole } = useCompany();
  return userRole === 'MEMBER';
};
