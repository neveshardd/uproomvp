import { createClient } from '@supabase/supabase-js';

// Use the actual credentials from .env
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRemoteDatabase() {
  console.log('🔍 Testing connection to remote Supabase database...');
  console.log('Project URL:', supabaseUrl);
  console.log('Project ID:', supabaseUrl.split('//')[1].split('.')[0]);
  
  try {
    // Test basic connection
    console.log('\n📡 Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('companies')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      console.error('❌ Connection failed:', healthError);
      return;
    }
    
    console.log('✅ Connection successful!');
    
    // Check companies table
    console.log('\n🏢 Checking companies table...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');
    
    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
    } else {
      console.log(`📊 Found ${companies.length} companies:`);
      companies.forEach(company => {
        console.log(`  - ${company.name} (subdomain: ${company.subdomain})`);
      });
    }
    
    // Check company_members table
    console.log('\n👥 Checking company_members table...');
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('*');
    
    if (membersError) {
      console.error('❌ Error fetching company members:', membersError);
    } else {
      console.log(`📊 Found ${members.length} company members`);
    }
    
    // Test specific subdomain lookup
    console.log('\n🔍 Testing subdomain lookup for "devtestcompany"...');
    const { data: testCompany, error: testError } = await supabase
      .from('companies')
      .select('*')
      .eq('subdomain', 'devtestcompany')
      .single();
    
    if (testError) {
      console.error('❌ Error finding devtestcompany:', testError);
    } else {
      console.log('✅ Found devtestcompany:', testCompany);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRemoteDatabase();