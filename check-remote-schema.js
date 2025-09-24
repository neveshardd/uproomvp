import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I');

async function checkRemoteSchema() {
  console.log('🔍 Checking remote database schema...');
  
  const tables = ['companies', 'profiles', 'company_members'];
  
  for (const table of tables) {
    console.log(`\n📋 Checking table: ${table}`);
    
    try {
      // Try to get table structure by querying with limit 0
      const { data, error } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(0);

      if (error) {
        console.error(`❌ Error accessing ${table}:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
        
        // Try to get a sample record to see the structure
        const { data: sample, error: sampleError } = await supabaseAnon
          .from(table)
          .select('*')
          .limit(1);
          
        if (sampleError) {
          console.error(`❌ Error getting sample from ${table}:`, sampleError.message);
        } else if (sample && sample.length > 0) {
          console.log(`📝 Sample record structure:`, Object.keys(sample[0]));
        } else {
          console.log(`📝 Table ${table} is empty`);
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error with ${table}:`, error.message);
    }
  }

  // Check if we can access auth users (this might not work with anon key)
  console.log('\n🔐 Checking auth access...');
  try {
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser();
    if (authError) {
      console.log('ℹ️ No authenticated user (expected with anon key)');
    } else {
      console.log('✅ Auth user found:', authData.user?.email);
    }
  } catch (error) {
    console.log('ℹ️ Auth check failed (expected with anon key)');
  }
}

checkRemoteSchema();