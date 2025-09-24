import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugAcmeSubdomain() {
  console.log('🔍 Debugging "acme" subdomain lookup...');
  
  try {
    // First, let's see all companies in the database
    console.log('\n📊 All companies in database:');
    const { data: allCompanies, error: allError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching all companies:', allError);
      return;
    }

    console.log(`Found ${allCompanies.length} companies:`);
    allCompanies.forEach((company, index) => {
      console.log(`${index + 1}. Name: "${company.name}"`);
      console.log(`   Subdomain: "${company.subdomain}"`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Created: ${company.created_at}`);
      console.log('');
    });

    // Now test the exact query for 'acme'
    console.log('\n🎯 Testing exact query for "acme" subdomain:');
    const { data: acmeCompany, error: acmeError } = await supabase
      .from('companies')
      .select('*')
      .eq('subdomain', 'acme')
      .single();

    if (acmeError) {
      console.error('❌ Error finding acme company:', acmeError);
      console.log('Error code:', acmeError.code);
      console.log('Error message:', acmeError.message);
      
      if (acmeError.code === 'PGRST116') {
        console.log('🔍 PGRST116 means no rows returned - company with subdomain "acme" does not exist');
      }
    } else {
      console.log('✅ Found acme company:', acmeCompany);
    }

    // Test case-insensitive search
    console.log('\n🔍 Testing case-insensitive search for "acme":');
    const { data: acmeInsensitive, error: acmeInsensitiveError } = await supabase
      .from('companies')
      .select('*')
      .ilike('subdomain', 'acme');

    if (acmeInsensitiveError) {
      console.error('❌ Error in case-insensitive search:', acmeInsensitiveError);
    } else {
      console.log(`✅ Case-insensitive search found ${acmeInsensitive.length} companies:`, acmeInsensitive);
    }

    // Test partial matches
    console.log('\n🔍 Testing partial matches for "acme":');
    const { data: acmePartial, error: acmePartialError } = await supabase
      .from('companies')
      .select('*')
      .ilike('subdomain', '%acme%');

    if (acmePartialError) {
      console.error('❌ Error in partial search:', acmePartialError);
    } else {
      console.log(`✅ Partial search found ${acmePartial.length} companies:`, acmePartial);
    }

    // Check if there's a company with name "Acme Corporation"
    console.log('\n🔍 Searching by company name "Acme Corporation":');
    const { data: acmeByName, error: acmeByNameError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'Acme Corporation');

    if (acmeByNameError) {
      console.error('❌ Error searching by name:', acmeByNameError);
    } else {
      console.log(`✅ Found ${acmeByName.length} companies with name "Acme Corporation":`, acmeByName);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugAcmeSubdomain();