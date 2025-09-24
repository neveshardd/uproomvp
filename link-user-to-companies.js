import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkUserToCompanies() {
  console.log('🔗 Linking user to existing companies...');
  
  try {
    // Get the test user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError);
      return;
    }
    
    const testUser = users.users.find(user => user.email === 'test@example.com');
    
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log('✅ Found test user:', testUser.email);
    
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');
    
    if (companiesError) {
      console.error('❌ Error getting companies:', companiesError);
      return;
    }
    
    console.log(`✅ Found ${companies.length} companies:`);
    companies.forEach(company => {
      console.log(`  - ${company.name} (${company.subdomain})`);
    });
    
    // Check existing memberships
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('company_members')
      .select('*')
      .eq('user_id', testUser.id);
    
    if (membershipError) {
      console.error('❌ Error checking memberships:', membershipError);
      return;
    }
    
    console.log(`📊 User has ${existingMemberships.length} existing memberships`);
    
    // Create memberships for companies the user isn't already a member of
    const existingCompanyIds = existingMemberships.map(m => m.company_id);
    const newMemberships = companies
      .filter(company => !existingCompanyIds.includes(company.id))
      .map(company => ({
        user_id: testUser.id,
        company_id: company.id,
        role: 'owner'
      }));
    
    if (newMemberships.length === 0) {
      console.log('✅ User is already a member of all companies');
      return;
    }
    
    console.log(`👥 Creating ${newMemberships.length} new memberships...`);
    
    const { error: insertError } = await supabase
      .from('company_members')
      .insert(newMemberships);
    
    if (insertError) {
      console.error('❌ Error creating memberships:', insertError);
      return;
    }
    
    console.log('✅ Successfully linked user to companies!');
    
    // Verify the memberships
    const { data: finalMemberships, error: finalError } = await supabase
      .from('company_members')
      .select(`
        *,
        companies (name, subdomain)
      `)
      .eq('user_id', testUser.id);
    
    if (finalError) {
      console.error('❌ Error verifying memberships:', finalError);
      return;
    }
    
    console.log('\n🎉 Final user memberships:');
    finalMemberships.forEach(membership => {
      console.log(`  - ${membership.companies.name} (${membership.companies.subdomain}) - Role: ${membership.role}`);
    });
    
    console.log('\n📧 Test user credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('\n🌐 You can now login and see the companies in your dashboard');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

linkUserToCompanies();