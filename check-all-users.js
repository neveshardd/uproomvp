import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllUsers() {
  console.log('👥 Checking all users in the database...');
  
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError);
      return;
    }

    console.log(`📊 Total profiles found: ${profiles.length}`);
    
    if (profiles.length > 0) {
      console.log('\n👤 All profiles:');
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ID: ${profile.id}`);
        console.log(`   Email: ${profile.email || 'N/A'}`);
        console.log(`   Full Name: ${profile.full_name || 'N/A'}`);
        console.log(`   Created: ${profile.created_at}`);
        console.log('');
      });
    }

    // Also check auth.users if we can
    console.log('\n🔐 Trying to check auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Cannot access auth users (expected with anon key):', authError.message);
    } else {
      console.log(`📊 Auth users found: ${authUsers.users.length}`);
      authUsers.users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }

    // Check company members table
    console.log('\n🏢 Checking company members...');
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('*');

    if (membersError) {
      console.error('❌ Error getting company members:', membersError);
    } else {
      console.log(`📊 Total company members: ${members.length}`);
      if (members.length > 0) {
        console.log('Company members:', JSON.stringify(members, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAllUsers();