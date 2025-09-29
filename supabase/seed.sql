-- Seed data for local development
-- This file will be executed after migrations to populate the database with test data

-- Insert test user profile
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@test.com',
  '$2a$10$8K1p/a0dhrxSUK1y3.jwtO.H/SJL4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4',
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  false,
  NOW(),
  NOW(),
  null,
  null,
  '',
  '',
  NOW(),
  '',
  0,
  null,
  '',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert profile for test user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@test.com',
  'Test User',
  null,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert test companies
INSERT INTO public.companies (
  id,
  name,
  subdomain,
  description,
  avatar_url,
  settings,
  status_policies,
  created_at,
  updated_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'Empresa Teste 1',
  'empresa1',
  'Primeira empresa de teste',
  null,
  '{}',
  '{}',
  NOW(),
  NOW()
),
(
  '22222222-2222-2222-2222-222222222222',
  'Empresa Teste 2',
  'empresa2',
  'Segunda empresa de teste',
  null,
  '{}',
  '{}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert company memberships for test user
INSERT INTO public.company_members (
  id,
  user_id,
  company_id,
  role,
  invited_by,
  invited_at,
  joined_at,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440000',
  '11111111-1111-1111-1111-111111111111',
  'owner',
  '550e8400-e29b-41d4-a716-446655440000',
  NOW(),
  NOW(),
  true,
  NOW(),
  NOW()
),
(
  '44444444-4444-4444-4444-444444444444',
  '550e8400-e29b-41d4-a716-446655440000',
  '22222222-2222-2222-2222-222222222222',
  'admin',
  '550e8400-e29b-41d4-a716-446655440000',
  NOW(),
  NOW(),
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;