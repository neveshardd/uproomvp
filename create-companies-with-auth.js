import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCompaniesWithAuth() {
  console.log('🏢 Creating companies with authenticated user...');
  
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

    console.log('✅ Signed in successfully as:', signInData.user.id);

    // Define the companies to create
    const companiesToCreate = [
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

    console.log('\n➕ Creating companies as authenticated user...');
    
    for (const companyData of companiesToCreate) {
      console.log(`\n🏢 Creating company: ${companyData.name}`);
      
      // Use the CompanyService approach - create company and automatically add user as owner
      const { data: createdCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          subdomain: companyData.subdomain,
          description: companyData.description,
          avatar_url: null,
          settings: {},
          status_policies: {}
        })
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating ${companyData.name}:`, createError);
        continue;
      }

      console.log(`✅ Created company: ${createdCompany.name} (ID: ${createdCompany.id})`);

      // Add the user as owner of this company
      console.log(`🔗 Adding user as owner of ${createdCompany.name}...`);
      const { data: membership, error: membershipError } = await supabase
        .from('company_members')
        .insert({
          user_id: signInData.user.id,
          company_id: createdCompany.id,
          role: 'owner',
          is_active: true
        })
        .select()
        .single();

      if (membershipError) {
        console.error(`❌ Error creating membership for ${createdCompany.name}:`, membershipError);
      } else {
        console.log(`✅ Added user as owner of ${createdCompany.name}`);
      }
    }

    // Verify companies were created
    console.log('\n✅ Verifying companies...');
    const { data: allCompanies, error: verifyError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error verifying companies:', verifyError);
    } else {
      console.log(`🎉 Total companies in database: ${allCompanies.length}`);
      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.subdomain}) - ID: ${company.id}`);
      });
    }

    // Test the acme subdomain lookup specifically
    console.log('\n🎯 Testing "acme" subdomain lookup...');
    const { data: acmeTest, error: acmeTestError } = await supabase
      .from('companies')
      .select('*')
      .eq('subdomain', 'acme')
      .single();

    if (acmeTestError) {
      console.error('❌ Acme lookup still failing:', acmeTestError);
    } else {
      console.log('✅ Acme lookup successful:', acmeTest);
    }

    // Verify company memberships
    console.log('\n👥 Verifying company memberships...');
    const { data: memberships, error: membershipsError } = await supabase
      .from('company_members')
      .select(`
        *,
        companies (name, subdomain)
      `);

    if (membershipsError) {
      console.error('❌ Error getting memberships:', membershipsError);
    } else {
      console.log(`📊 Total memberships: ${memberships.length}`);
      memberships.forEach((membership, index) => {
        console.log(`${index + 1}. User ${membership.user_id} is ${membership.role} of ${membership.companies.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createCompaniesWithAuth();