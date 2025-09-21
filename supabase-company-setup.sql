-- Company Workspace Setup for Mindful Communication Platform
-- This script creates the necessary tables for company workspaces and user management

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(30) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT companies_subdomain_format CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
    CONSTRAINT companies_subdomain_length CHECK (char_length(subdomain) >= 3 AND char_length(subdomain) <= 63)
);

-- 2. Create user roles enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create company_members table (junction table for users and companies)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, company_id)
);

-- 4. Update profiles table to include company reference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "desktop": true}';

-- 5. Create company_invitations table
CREATE TABLE IF NOT EXISTS public.company_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, email),
    CONSTRAINT invitations_expires_future CHECK (expires_at > created_at)
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies and create new ones for companies
DROP POLICY IF EXISTS "Users can view companies they are members of" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can check subdomain availability" ON public.companies;
DROP POLICY IF EXISTS "Company owners and admins can update company details" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

-- Allow subdomain checking for all authenticated users (needed for availability check)
CREATE POLICY "Authenticated users can check subdomain availability" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Company owners and admins can update company details" ON public.companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM public.company_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

CREATE POLICY "Authenticated users can create companies" ON public.companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. Drop existing policies and create new ones for company_members
DROP POLICY IF EXISTS "Users can view members of their companies" ON public.company_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.company_members;
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;
DROP POLICY IF EXISTS "Company owners and admins can manage members" ON public.company_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.company_members;

-- Simple policy: users can view their own memberships
CREATE POLICY "Users can view their own memberships" ON public.company_members
    FOR SELECT USING (user_id = auth.uid());

-- Users can view members of companies they belong to
CREATE POLICY "Users can view company members" ON public.company_members
    FOR SELECT USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() AND cm.is_active = true
        )
    );

-- Company owners and admins can manage members (insert, update, delete)
CREATE POLICY "Company owners and admins can manage members" ON public.company_members
    FOR ALL USING (
        user_id = auth.uid() OR -- Users can manage their own membership
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin') 
            AND cm.is_active = true
        )
    );

-- 9. Drop existing policies and create new ones for company_invitations
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.company_invitations;

CREATE POLICY "Company admins can manage invitations" ON public.company_invitations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.company_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- 10. Create functions for company management

-- Function to create a company and make the creator an owner
CREATE OR REPLACE FUNCTION create_company_with_owner(
    company_name TEXT,
    company_subdomain TEXT,
    company_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_company_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Create the company
    INSERT INTO public.companies (name, subdomain, description)
    VALUES (company_name, company_subdomain, company_description)
    RETURNING id INTO new_company_id;
    
    -- Add the creator as owner
    INSERT INTO public.company_members (user_id, company_id, role, joined_at)
    VALUES (current_user_id, new_company_id, 'owner', NOW());
    
    -- Update user's current company
    UPDATE public.profiles 
    SET current_company_id = new_company_id, updated_at = NOW()
    WHERE id = current_user_id;
    
    RETURN new_company_id;
END;
$$;

-- Function to accept company invitation
CREATE OR REPLACE FUNCTION accept_company_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.company_invitations
    WHERE token = invitation_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user email matches invitation
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = current_user_id 
        AND email = invitation_record.email
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Add user to company
    INSERT INTO public.company_members (user_id, company_id, role, invited_by, joined_at)
    VALUES (
        current_user_id, 
        invitation_record.company_id, 
        invitation_record.role, 
        invitation_record.invited_by, 
        NOW()
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = invitation_record.role,
        is_active = true,
        joined_at = NOW(),
        updated_at = NOW();
    
    -- Mark invitation as accepted
    UPDATE public.company_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Update user's current company if they don't have one
    UPDATE public.profiles 
    SET current_company_id = COALESCE(current_company_id, invitation_record.company_id),
        updated_at = NOW()
    WHERE id = current_user_id;
    
    RETURN TRUE;
END;
$$;

-- 11. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only if they don't exist
DO $$ BEGIN
    CREATE TRIGGER update_companies_updated_at 
        BEFORE UPDATE ON public.companies 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_company_members_updated_at 
        BEFORE UPDATE ON public.company_members 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON public.companies(subdomain);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_active ON public.company_members(company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_profiles_current_company ON public.profiles(current_company_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_members TO authenticated;
GRANT ALL ON public.company_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION create_company_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION accept_company_invitation TO authenticated;