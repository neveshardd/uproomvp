'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const { signUp } = useAuth();
  const { toast } = useToast();

  // Handle returnUrl from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrlParam = urlParams.get('returnUrl');
    if (returnUrlParam) {
      setReturnUrl(returnUrlParam);
    }
  }, []);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      const result = await signUp(data.email, data.password, data.fullName);
      
      if (result.error) {
        toast({
          title: 'Registration Failed',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        if (result.requiresConfirmation) {
          toast({
            title: 'Account Created',
            description: 'Please check your email to confirm your account.',
          });
        } else {
          toast({
            title: 'Welcome!',
            description: result.message || 'Your account has been created successfully.',
          });
          
          // Handle redirect after successful registration
          if (returnUrl) {
            // If there's a returnUrl, redirect to it (e.g., back to subdomain)
            try {
              const decodedUrl = decodeURIComponent(returnUrl);
              const url = new URL(decodedUrl);
              
              // Validate that the return URL is from a trusted domain
              const currentHost = window.location.hostname;
              const returnHost = url.hostname;
              
              const isTrustedDomain = returnHost === currentHost || 
                                     returnHost.endsWith('.localhost') ||
                                     returnHost.includes('localhost');
              
              if (isTrustedDomain) {
                setTimeout(() => {
                  window.location.href = decodedUrl;
                }, 2000);
              } else {
                console.warn('Untrusted return URL:', decodedUrl);
                setTimeout(() => {
                  window.location.href = '/';
                }, 2000);
              }
            } catch (error) {
              console.error('Invalid return URL:', returnUrl, error);
              setTimeout(() => {
                window.location.href = '/';
              }, 2000);
            }
          } else {
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors">
            <span className="text-xl font-semibold">Uproom</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/40 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join your workspace and start collaborating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="Enter your full name"
                            className="pl-10 bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a password"
                            className="pl-10 pr-10 bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary"
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
