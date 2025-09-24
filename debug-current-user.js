import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCurrentUser() {
  console.log('🔍 Debugging current user and company memberships...');
  
  try {
    // First, try to sign in as the test user
    const testEmail = 'testuser1758650490860@example.com';
    const testPassword = 'password123';
    
    console.log(`🔐 Signing in as: ${testEmail}`);
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('❌ Error signing in:', signInError);
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('👤 User ID:', signInData.user.id);
    console.log('📧 User Email:', signInData.user.email);

    // Check the current session
    const { data: session } = await supabase.auth.getSession();
    console.log('🎫 Current session user ID:', session.session?.user?.id);

    // Now test the exact query that CompanyService.getUserCompanies() uses
    console.log('\n🏢 Testing getUserCompanies query...');
    
    const { data: userCompanies, error: companiesError } = await supabase
      .from('company_members')
      .select(`
        role,
        is_active,
        companies (
          id,
          name,
          subdomain,
          description,
          avatar_url,
          settings,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', signInData.user.id)
      .eq('is_active', true);

    if (companiesError) {
      console.error('❌ Error getting user companies:', companiesError);
    } else {
      console.log(`✅ Found ${userCompanies.length} companies for user`);
      console.log('📋 User companies:', JSON.stringify(userCompanies, null, 2));
    }

    // Also check all company members to see what's in the table
    console.log('\n👥 Checking all company members...');
    const { data: allMembers, error: allMembersError } = await supabase
      .from('company_members')
      .select('*');

    if (allMembersError) {
      console.error('❌ Error getting all members:', allMembersError);
    } else {
      console.log(`📊 Total company members in database: ${allMembers.length}`);
      allMembers.forEach((member, index) => {
        console.log(`${index + 1}. User ID: ${member.user_id}, Company ID: ${member.company_id}, Role: ${member.role}, Active: ${member.is_active}`);
      });
    }

    // Check if there are any RLS policy issues by trying without RLS
    console.log('\n🔒 Testing RLS policies...');
    const { data: rlsTest, error: rlsError } = await supabase
      .rpc('get_user_companies', { user_id: signInData.user.id });

    if (rlsError) {
      console.log('❌ RLS function test failed:', rlsError);
    } else {
      console.log('✅ RLS function test result:', rlsTest);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugCurrentUser();