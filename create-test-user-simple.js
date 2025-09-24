import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
  console.log('🔧 Creating test user and company memberships...');
  
  try {
    // Create a unique test user
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    const testPassword = 'password123';
    
    console.log(`👤 Creating user: ${testEmail}`);
    
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Error creating user:', signUpError);
      return;
    }

    console.log('✅ User created:', authData.user?.id);

    // Wait a moment for the user to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('❌ Error signing in:', signInError);
      return;
    }

    console.log('✅ User signed in successfully');

    // Get existing companies
    console.log('\n🏢 Getting existing companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');

    if (companiesError) {
      console.error('❌ Error getting companies:', companiesError);
      return;
    }

    console.log(`✅ Found ${companies.length} companies`);

    // Create memberships for the test companies
    const testCompanyNames = ['Acme Corporation', 'Tech Innovations Inc', 'Digital Solutions Ltd'];
    const testCompanies = companies.filter(c => testCompanyNames.includes(c.name));
    
    console.log(`\n➕ Creating memberships for ${testCompanies.length} test companies...`);

    for (const company of testCompanies) {
      console.log(`\n🔗 Creating membership for: ${company.name}`);
      
      const { data: membership, error: createError } = await supabase
        .from('company_members')
        .insert({
          user_id: authData.user.id,
          company_id: company.id,
          role: 'owner',
          is_active: true
        })
        .select();

      if (createError) {
        console.error(`❌ Error creating membership for ${company.name}:`, createError);
      } else {
        console.log(`✅ Created membership for ${company.name}`);
      }
    }

    // Verify the memberships were created
    console.log('\n✅ Verifying memberships...');
    const { data: finalMemberships, error: finalError } = await supabase
      .from('company_members')
      .select(`
        *,
        companies (
          id,
          name,
          subdomain,
          description
        )
      `)
      .eq('user_id', authData.user.id);

    if (finalError) {
      console.error('❌ Error verifying memberships:', finalError);
    } else {
      console.log(`🎉 Final memberships count: ${finalMemberships.length}`);
      console.log('📋 Memberships:', JSON.stringify(finalMemberships, null, 2));
    }

    console.log('\n🎯 Test user created successfully!');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);
    console.log(`🆔 User ID: ${authData.user.id}`);
    console.log(`🌐 Dashboard: http://localhost:8080/dashboard`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();