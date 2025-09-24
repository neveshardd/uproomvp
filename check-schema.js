import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Check if companies table exists and what columns it has
    console.log('\n📋 Checking companies table...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (companiesError) {
      console.error('❌ Error accessing companies table:', companiesError);
    } else {
      console.log('✅ Companies table exists');
      if (companies.length > 0) {
        console.log('📊 Sample company structure:', Object.keys(companies[0]));
      } else {
        console.log('📊 Companies table is empty');
      }
    }

    // Check profiles table
    console.log('\n👤 Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError);
    } else {
      console.log('✅ Profiles table exists');
      if (profiles.length > 0) {
        console.log('📊 Sample profile structure:', Object.keys(profiles[0]));
      } else {
        console.log('📊 Profiles table is empty');
      }
    }

    // Check company_members table
    console.log('\n👥 Checking company_members table...');
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('*')
      .limit(1);

    if (membersError) {
      console.error('❌ Error accessing company_members table:', membersError);
    } else {
      console.log('✅ Company_members table exists');
      if (members.length > 0) {
        console.log('📊 Sample member structure:', Object.keys(members[0]));
      } else {
        console.log('📊 Company_members table is empty');
      }
    }

    // Try to get table information from information_schema
    console.log('\n🗂️ Getting table information...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'companies' })
      .single();

    if (tableError) {
      console.log('ℹ️ Could not get detailed table info (this is normal)');
    } else {
      console.log('📋 Table info:', tableInfo);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema();