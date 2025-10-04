'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { Shield, User } from 'lucide-react';

export const UserRoleBadge: React.FC = () => {
  const { userRole } = useCompany();

  if (!userRole) return null;

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  return (
    <Badge 
      variant={isAdmin ? 'default' : 'secondary'}
      className={`flex items-center space-x-1 ${
        isAdmin 
          ? 'bg-blue-600 text-white hover:bg-blue-700' 
          : 'bg-gray-600 text-white hover:bg-gray-700'
      }`}
    >
      {isAdmin ? (
        <Shield className="w-3 h-3" />
      ) : (
        <User className="w-3 h-3" />
      )}
      <span className="text-xs font-medium">
        {userRole === 'OWNER' ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
      </span>
    </Badge>
  );
};
