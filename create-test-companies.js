import { createClient } from '@supabase/supabase-js';

// Use the actual credentials from .env
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestCompanies() {
  console.log('🏢 Creating test companies...');
  
  const testCompanies = [
    {
      name: 'Dev Test Company',
      subdomain: 'devtestcompany',
      description: 'A test company for development purposes',
      settings: {},
      status_policies: {}
    },
    {
      name: 'Misael TI',
      subdomain: 'misaelti',
      description: 'Misael TI Solutions',
      settings: {},
      status_policies: {}
    },
    {
      name: 'Test Company 2',
      subdomain: 'test2',
      description: 'Another test company',
      settings: {},
      status_policies: {}
    }
  ];

  try {
    // Insert companies
    console.log('📝 Inserting companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .insert(testCompanies)
      .select();

    if (companiesError) {
      console.error('❌ Error creating companies:', companiesError);
      return;
    }

    console.log('✅ Successfully created companies:');
    companies.forEach(company => {
      console.log(`  - ${company.name} (subdomain: ${company.subdomain}, id: ${company.id})`);
    });

    // Verify the companies were created
    console.log('\n🔍 Verifying companies...');
    const { data: allCompanies, error: verifyError } = await supabase
      .from('companies')
      .select('*');

    if (verifyError) {
      console.error('❌ Error verifying companies:', verifyError);
      return;
    }

    console.log(`📊 Total companies in database: ${allCompanies.length}`);
    allCompanies.forEach(company => {
      console.log(`  - ${company.name} (${company.subdomain})`);
    });

    // Test subdomain lookup
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

createTestCompanies();