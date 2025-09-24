import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCompanyLoading() {
  console.log('🔍 Debugging company loading...');
  
  try {
    // Step 1: Try to sign in with the test user
    console.log('\n🔐 Signing in with test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test1758649898328@example.com',
      password: 'password123'
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    console.log('✅ Successfully signed in');
    console.log('User ID:', authData.user.id);

    // Step 2: Check user profile
    console.log('\n👤 Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
    } else {
      console.log('✅ Profile found:', profile);
    }

    // Step 3: Check company memberships (raw query)
    console.log('\n🏢 Checking company memberships (raw)...');
    const { data: memberships, error: membershipError } = await supabase
      .from('company_members')
      .select('*')
      .eq('user_id', authData.user.id);

    if (membershipError) {
      console.error('❌ Membership error:', membershipError);
    } else {
      console.log('✅ Raw memberships:', memberships);
    }

    // Step 4: Check company memberships with company data (like the app does)
    console.log('\n🏢 Checking company memberships with company data...');
    const { data: companiesData, error: companiesError } = await supabase
      .from('company_members')
      .select(`
        role,
        is_active,
        companies (
          id,
          name,
          subdomain,
          description,
          logo_url,
          website_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', authData.user.id)
      .eq('is_active', true);

    if (companiesError) {
      console.error('❌ Companies query error:', companiesError);
    } else {
      console.log('✅ Companies data:', JSON.stringify(companiesData, null, 2));
      
      // Transform like the app does
      const companies = companiesData?.map((item) => item.companies).filter(Boolean) || [];
      console.log('📋 Transformed companies:', companies);
    }

    // Step 5: Check all companies in database
    console.log('\n📊 Checking all companies in database...');
    const { data: allCompanies, error: allCompaniesError } = await supabase
      .from('companies')
      .select('*');

    if (allCompaniesError) {
      console.error('❌ All companies error:', allCompaniesError);
    } else {
      console.log('✅ All companies:', allCompanies);
    }

    // Step 6: Check all company members
    console.log('\n👥 Checking all company members...');
    const { data: allMembers, error: allMembersError } = await supabase
      .from('company_members')
      .select(`
        *,
        profiles (email, full_name),
        companies (name, subdomain)
      `);

    if (allMembersError) {
      console.error('❌ All members error:', allMembersError);
    } else {
      console.log('✅ All members:', JSON.stringify(allMembers, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugCompanyLoading();