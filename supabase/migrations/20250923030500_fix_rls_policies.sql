-- Fix RLS Infinite Recursion in company_members table
-- This migration creates security definer functions and updates RLS policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Company owners and admins can manage members" ON public.company_members;
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;

-- Create security definer functions to check permissions without triggering RLS
CREATE OR REPLACE FUNCTION public.user_is_company_admin(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM company_members cm
    WHERE cm.user_id = auth.uid() 
      AND cm.company_id = company_uuid
      AND cm.role IN ('owner', 'admin')
      AND cm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_company_member(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM company_members cm
    WHERE cm.user_id = auth.uid() 
      AND cm.company_id = company_uuid
      AND cm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.company_id
  FROM company_members cm
  WHERE cm.user_id = auth.uid() 
    AND cm.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_companies()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.company_id
  FROM company_members cm
  WHERE cm.user_id = auth.uid() 
    AND cm.role IN ('owner', 'admin')
    AND cm.is_active = true;
$$;

-- Recreate the policies using the security definer functions
CREATE POLICY "Company owners and admins can manage members"
ON public.company_members
AS PERMISSIVE
FOR ALL
TO public
USING (
  (user_id = auth.uid()) OR 
  (company_id IN (SELECT get_user_admin_companies()))
);

CREATE POLICY "Users can view company members"
ON public.company_members
AS PERMISSIVE
FOR SELECT
TO public
USING (
  company_id IN (SELECT get_user_companies())
);

-- Grant execute permissions on the functions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_company_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_companies() TO authenticated;

-- Also fix the companies table policy that has the same issue
DROP POLICY IF EXISTS "Company owners and admins can update company details" ON public.companies;

CREATE POLICY "Company owners and admins can update company details"
ON public.companies
AS PERMISSIVE
FOR UPDATE
TO public
USING (
  id IN (SELECT get_user_admin_companies())
);

-- Fix the company_invitations policy as well
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.company_invitations;

CREATE POLICY "Company admins can manage invitations"
ON public.company_invitations
AS PERMISSIVE
FOR ALL
TO public
USING (
  company_id IN (SELECT get_user_admin_companies())
);