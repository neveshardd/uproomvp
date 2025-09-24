import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchemaRelationships() {
  console.log('🔍 Checking database schema and relationships...');
  
  try {
    // Check company_members table structure
    console.log('\n📋 Checking company_members table...');
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('*')
      .limit(1);

    if (membersError) {
      console.error('❌ Error accessing company_members:', membersError);
    } else {
      console.log('✅ company_members sample:', members);
      if (members && members.length > 0) {
        console.log('📝 company_members columns:', Object.keys(members[0]));
      }
    }

    // Check profiles table structure
    console.log('\n👤 Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('❌ Error accessing profiles:', profilesError);
    } else {
      console.log('✅ profiles sample:', profiles);
      if (profiles && profiles.length > 0) {
        console.log('📝 profiles columns:', Object.keys(profiles[0]));
      }
    }

    // Check companies table structure
    console.log('\n🏢 Checking companies table...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (companiesError) {
      console.error('❌ Error accessing companies:', companiesError);
    } else {
      console.log('✅ companies sample:', companies);
      if (companies && companies.length > 0) {
        console.log('📝 companies columns:', Object.keys(companies[0]));
      }
    }

    // Try different join approaches
    console.log('\n🔗 Testing different join approaches...');
    
    // Try manual join with user_id
    console.log('\n1. Manual join with user_id...');
    const { data: manualJoin, error: manualError } = await supabase
      .from('company_members')
      .select(`
        *,
        companies (*)
      `)
      .limit(5);

    if (manualError) {
      console.error('❌ Manual join error:', manualError);
    } else {
      console.log('✅ Manual join result:', JSON.stringify(manualJoin, null, 2));
    }

    // Try to get user companies without profile join
    console.log('\n2. Get companies without profile join...');
    const { data: simpleJoin, error: simpleError } = await supabase
      .from('company_members')
      .select(`
        role,
        is_active,
        user_id,
        company_id,
        companies (
          id,
          name,
          subdomain,
          description
        )
      `)
      .limit(5);

    if (simpleError) {
      console.error('❌ Simple join error:', simpleError);
    } else {
      console.log('✅ Simple join result:', JSON.stringify(simpleJoin, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchemaRelationships();