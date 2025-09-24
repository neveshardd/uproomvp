import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixCompanyMemberships() {
  console.log('🔧 Fixing company memberships...');
  
  try {
    // First, get the test user
    const testEmail = 'test1758649898328@example.com';
    console.log(`👤 Looking for user: ${testEmail}`);
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail);

    if (profileError) {
      console.error('❌ Error finding user profile:', profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ User not found in profiles table');
      return;
    }

    const user = profiles[0];
    console.log('✅ Found user:', user);

    // Get all companies
    console.log('\n🏢 Getting all companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');

    if (companiesError) {
      console.error('❌ Error getting companies:', companiesError);
      return;
    }

    console.log(`✅ Found ${companies.length} companies`);

    // Check existing memberships
    console.log('\n🔍 Checking existing memberships...');
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('company_members')
      .select('*')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('❌ Error checking memberships:', membershipError);
    } else {
      console.log(`📊 Existing memberships: ${existingMemberships.length}`);
    }

    // Create memberships for the test companies we created
    const testCompanyNames = ['Acme Corporation', 'Tech Innovations Inc', 'Digital Solutions Ltd'];
    const testCompanies = companies.filter(c => testCompanyNames.includes(c.name));
    
    console.log(`\n➕ Creating memberships for ${testCompanies.length} test companies...`);

    for (const company of testCompanies) {
      console.log(`\n🔗 Creating membership for: ${company.name}`);
      
      const { data: membership, error: createError } = await supabase
        .from('company_members')
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: 'owner',
          is_active: true
        })
        .select();

      if (createError) {
        console.error(`❌ Error creating membership for ${company.name}:`, createError);
      } else {
        console.log(`✅ Created membership for ${company.name}:`, membership);
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
      .eq('user_id', user.id);

    if (finalError) {
      console.error('❌ Error verifying memberships:', finalError);
    } else {
      console.log(`🎉 Final memberships count: ${finalMemberships.length}`);
      console.log('📋 Memberships:', JSON.stringify(finalMemberships, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixCompanyMemberships();