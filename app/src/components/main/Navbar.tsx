'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, Building2 } from 'lucide-react';
import { CrossDomainAuth } from '@/lib/auth/cross-domain-auth';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    
    // The signOut function in AuthContext already handles cross-domain logout
    // and redirection to main domain if on subdomain
    // If we're on main domain, just redirect to home
    if (!CrossDomainAuth.isSubdomain()) {
      router.push('/');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserDisplayName = () => {
    return user?.fullName || user?.email?.split('@')[0] || 'User';
  };

  const getUserAvatar = () => {
    return undefined;
  };

  return (
    <header className="relative z-20 border-b-2 border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-foreground hover:text-primary transition-colors">
              Uproom
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              // User is logged in - show avatar and dropdown
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getUserAvatar()} alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(getUserDisplayName())}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{getUserDisplayName()}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/workspaces')}>
                    <Building2 className="mr-2 h-4 w-4" />
                    My Workspaces
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // User is not logged in - show login button
              <Button 
                variant="secondary" 
                onClick={() => router.push('/login')}
                className="bg-transparent border-2 border-neutral-700 text-white rounded-md hover:bg-background"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;