import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the CompanyService.getUserCompanies() method
async function getUserCompanies() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError);
      return { companies: [], error: userError.message };
    }

    if (!user) {
      console.log('❌ No authenticated user');
      return { companies: [], error: 'No authenticated user' };
    }

    console.log('✅ Authenticated user:', user.id);

    // Query company_members with companies join
    const { data, error } = await supabase
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
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Database query error:', error);
      return { companies: [], error: error.message };
    }

    console.log('✅ Raw query result:', JSON.stringify(data, null, 2));

    // Transform the data to match Company type
    const companies = data
      .filter(item => item.companies) // Filter out null companies
      .map(item => ({
        ...item.companies,
        userRole: item.role
      }));

    console.log('✅ Transformed companies:', JSON.stringify(companies, null, 2));

    return { companies, error: null };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { companies: [], error: error.message };
  }
}

async function debugCompanyContext() {
  console.log('🔍 Debugging CompanyService.getUserCompanies()...');
  
  try {
    // First, sign in as the test user
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

    // Test the getUserCompanies method
    console.log('\n🏢 Testing getUserCompanies method...');
    const result = await getUserCompanies();
    
    console.log('\n📊 Final result:');
    console.log('Companies count:', result.companies.length);
    console.log('Error:', result.error);
    console.log('Companies:', JSON.stringify(result.companies, null, 2));

    // Also check if there are any console errors that might be happening in the browser
    console.log('\n🔍 Additional debugging info:');
    console.log('- Make sure to check browser console for any errors');
    console.log('- Verify that the CompanyContext is properly wrapped around the Dashboard component');
    console.log('- Check if there are any React strict mode issues causing double renders');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugCompanyContext();