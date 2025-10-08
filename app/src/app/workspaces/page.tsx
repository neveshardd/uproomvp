'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  ArrowRight,
  Users
} from "lucide-react";
import Navbar from "@/components/main/Navbar";
import WorkspaceRouter from "@/components/workspace/WorkspaceRouter";

const WorkspacesPage = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { userCompanies, isLoading } = useCompany();
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [filter, setFilter] = useState<'all' | 'owner' | 'member'>('all');

  const handleCreateCompany = () => {
    setIsCreatingCompany(true);
    router.push('/create-company');
  };

  const handleGoToWorkspace = (subdomain: string) => {
    const workspaceUrl = process.env.NODE_ENV === 'development' 
      ? `http://${subdomain}.localhost:3000`
      : `https://${subdomain}.${process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN || 'uproom.com'}`;
    
    window.location.href = workspaceUrl;
  };

  // Filtrar workspaces baseado no filtro selecionado
  const filteredCompanies = userCompanies.filter(company => {
    if (filter === 'all') return true;
    if (filter === 'owner') return company.isOwner || company.userRole === 'OWNER';
    if (filter === 'member') return !company.isOwner && company.userRole !== 'OWNER';
    return true;
  });

  // Loading states
  if (loading || isLoading) {
    return (
      <WorkspaceRouter>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </WorkspaceRouter>
    );
  }

  // Redirect to main domain login if not authenticated
  if (!user) {
    const mainDomain = process.env.NEXT_PUBLIC_DEV_DOMAIN || 'localhost:3000';
    const protocol = window.location.protocol;
    const currentPath = window.location.pathname;
    const returnUrl = encodeURIComponent(`${protocol}//${window.location.host}${currentPath}`);
    window.location.href = `${protocol}//${mainDomain}/login?returnUrl=${returnUrl}`;
    return null;
  }

  return (
    <WorkspaceRouter>
      <div className="min-h-screen bg-background">
        {/* Show navbar only when user has workspaces */}
        {userCompanies.length > 0 && <Navbar />}
        
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Your Workspaces
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Choose a workspace to get started
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleCreateCompany} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isCreatingCompany}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreatingCompany ? 'Preparing...' : 'Create Workspace'}
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isCreatingCompany ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-6">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Creating Your Workspace</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  We're setting up your workspace and preparing everything for your team.
                </p>
                <Button 
                  disabled
                  className="bg-primary/50 text-primary-foreground cursor-not-allowed"
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Workspace...
                </Button>
              </div>
            </div>
          ) : userCompanies.length === 0 ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">No Workspaces Yet</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Create your first workspace to start collaborating with your team and organizing your projects.
              </p>
              <Button 
                onClick={handleCreateCompany}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isCreatingCompany}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreatingCompany ? 'Preparing...' : 'Create Your First Workspace'}
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Filtros */}
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  Todos ({userCompanies.length})
                </Button>
                <Button
                  variant={filter === 'owner' ? 'default' : 'outline'}
                  onClick={() => setFilter('owner')}
                  size="sm"
                >
                  Dono ({userCompanies.filter(c => c.isOwner || c.userRole === 'OWNER').length})
                </Button>
                <Button
                  variant={filter === 'member' ? 'default' : 'outline'}
                  onClick={() => setFilter('member')}
                  size="sm"
                >
                  Membro ({userCompanies.filter(c => !c.isOwner && c.userRole !== 'OWNER').length})
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company) => (
                  <Card key={company.id} className="bg-card/50 border-border/40 hover:bg-card/70 transition-colors group">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4">
                        {company.logo ? (
                          <img 
                            src={company.logo} 
                            alt={`${company.name} logo`}
                            className="h-16 w-16 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CardTitle className="text-lg text-foreground">{company.name}</CardTitle>
                        {company.isOwner || company.userRole === 'OWNER' ? (
                          <Badge className="bg-purple-600 text-white">
                            Owner
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Member
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-muted-foreground">
                        {company.description || `${company.subdomain}.${process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN || 'uproom.com'}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          0 members
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button 
                          onClick={() => handleGoToWorkspace(company.subdomain)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:bg-primary/80"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Go to Workspace
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </WorkspaceRouter>
  );
};

export default WorkspacesPage;
