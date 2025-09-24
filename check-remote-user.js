import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjA0MjU0Nzk2N30.example-service-key'; // You'll need the actual service key

// Create client with anon key first to check what we can access
const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I');

async function checkRemoteUser() {
  console.log('🔍 Checking remote database users and companies...');
  
  try {
    // Check companies in remote database
    console.log('\n📋 Checking companies in remote database...');
    const { data: companies, error: companiesError } = await supabaseAnon
      .from('companies')
      .select('*');

    if (companiesError) {
      console.error('❌ Error getting companies:', companiesError);
    } else {
      console.log(`✅ Found ${companies.length} companies in remote database:`);
      companies.forEach(company => {
        console.log(`  - ${company.name} (${company.subdomain}) - ID: ${company.id}`);
      });
    }

    // Check profiles in remote database
    console.log('\n👤 Checking profiles in remote database...');
    const { data: profiles, error: profilesError } = await supabaseAnon
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError);
    } else {
      console.log(`✅ Found ${profiles.length} profiles in remote database:`);
      profiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.full_name}) - ID: ${profile.id}`);
      });
    }

    // Check company members
    console.log('\n👥 Checking company members in remote database...');
    const { data: members, error: membersError } = await supabaseAnon
      .from('company_members')
      .select(`
        *,
        profiles (email, full_name),
        companies (name, subdomain)
      `);

    if (membersError) {
      console.error('❌ Error getting company members:', membersError);
    } else {
      console.log(`✅ Found ${members.length} company memberships:`);
      members.forEach(member => {
        console.log(`  - ${member.profiles?.email} is ${member.role} of ${member.companies?.name}`);
      });
    }

    // Check if there are any users without company memberships
    if (profiles && profiles.length > 0 && members) {
      const usersWithoutCompanies = profiles.filter(profile => 
        !members.some(member => member.user_id === profile.id)
      );
      
      if (usersWithoutCompanies.length > 0) {
        console.log('\n⚠️ Users without company memberships:');
        usersWithoutCompanies.forEach(user => {
          console.log(`  - ${user.email} (${user.full_name}) - ID: ${user.id}`);
        });
      } else {
        console.log('\n✅ All users have company memberships');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRemoteUser();