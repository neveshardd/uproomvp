import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createRemoteTestData() {
  console.log('🚀 Creating test data in remote database...');
  
  try {
    // Step 1: Create a test user with a different email
    console.log('\n👤 Creating test user...');
    const testEmail = `test${Date.now()}@example.com`;
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'password123',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (authError) {
      console.error('❌ Error creating user:', authError);
      return;
    }
    
    console.log('✅ Test user created successfully');
    console.log('📧 Email:', testEmail);

    const userId = authUser.user.id;
    console.log('User ID:', userId);

    // Step 2: Create or update user profile
    console.log('\n📝 Creating/updating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: testEmail,
        full_name: 'Test User',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }
    console.log('✅ Profile created/updated successfully');

    // Step 3: Create test companies
    console.log('\n🏢 Creating test companies...');
    const companies = [
      {
        name: 'Acme Corporation',
        subdomain: 'acme',
        description: 'A leading technology company'
      },
      {
        name: 'Tech Innovations Inc',
        subdomain: 'techinnovations',
        description: 'Innovative solutions for modern businesses'
      },
      {
        name: 'Digital Solutions Ltd',
        subdomain: 'digitalsolutions',
        description: 'Digital transformation experts'
      }
    ];

    const createdCompanies = [];
    for (const companyData of companies) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (companyError) {
        console.error(`❌ Error creating company ${companyData.name}:`, companyError);
        continue;
      }
      
      console.log(`✅ Created company: ${company.name}`);
      createdCompanies.push(company);
    }

    // Step 4: Link user to companies as owner
    console.log('\n🔗 Linking user to companies...');
    for (const company of createdCompanies) {
      const { data: membership, error: membershipError } = await supabase
        .from('company_members')
        .insert({
          user_id: userId,
          company_id: company.id,
          role: 'owner'
        })
        .select()
        .single();

      if (membershipError) {
        console.error(`❌ Error creating membership for ${company.name}:`, membershipError);
        continue;
      }
      
      console.log(`✅ User linked to ${company.name} as owner`);
    }

    // Step 5: Verify the setup
    console.log('\n✅ Verification...');
    const { data: finalCompanies } = await supabase
      .from('companies')
      .select('*');
    
    const { data: finalMembers } = await supabase
      .from('company_members')
      .select(`
        *,
        companies (name)
      `);

    console.log(`📊 Final state:`);
    console.log(`  - Companies: ${finalCompanies?.length || 0}`);
    console.log(`  - Memberships: ${finalMembers?.length || 0}`);
    
    if (finalMembers) {
      finalMembers.forEach(member => {
        console.log(`    - User ${member.user_id} is ${member.role} of ${member.companies.name}`);
      });
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('\n📋 Login credentials:');
    console.log(`  Email: ${testEmail}`);
    console.log('  Password: password123');
    console.log('\n🌐 You can now test the dashboard at: http://localhost:8080/dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createRemoteTestData();