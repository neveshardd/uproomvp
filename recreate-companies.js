import { createClient } from '@supabase/supabase-js';

// Remote Supabase configuration
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function recreateCompanies() {
  console.log('🏢 Recreating companies in remote database...');
  
  try {
    // First, check what company IDs exist in company_members
    console.log('\n🔍 Checking existing company memberships...');
    const { data: memberships, error: membershipsError } = await supabase
      .from('company_members')
      .select('company_id, user_id, role');

    if (membershipsError) {
      console.error('❌ Error getting memberships:', membershipsError);
      return;
    }

    console.log(`Found ${memberships.length} company memberships:`);
    const companyIds = [...new Set(memberships.map(m => m.company_id))];
    console.log('Unique company IDs:', companyIds);

    // Define the companies that should exist based on our previous setup
    const companiesToCreate = [
      {
        id: 'fbfa7475-69f8-4ca2-aa15-9061dfa96263',
        name: 'Acme Corporation',
        subdomain: 'acme',
        description: 'A leading technology company',
        avatar_url: null,
        settings: {},
        status_policies: {}
      },
      {
        id: '630faf50-bd3a-4fa6-bc71-9d99687fbd6e',
        name: 'Tech Innovations Inc',
        subdomain: 'techinnovations',
        description: 'Innovative solutions for modern businesses',
        avatar_url: null,
        settings: {},
        status_policies: {}
      },
      {
        id: 'f861f0a7-26df-4f47-9179-07157478de0f',
        name: 'Digital Solutions Ltd',
        subdomain: 'digitalsolutions',
        description: 'Digital transformation experts',
        avatar_url: null,
        settings: {},
        status_policies: {}
      }
    ];

    console.log('\n➕ Creating companies...');
    
    for (const company of companiesToCreate) {
      console.log(`\n🏢 Creating company: ${company.name}`);
      
      const { data: createdCompany, error: createError } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating ${company.name}:`, createError);
      } else {
        console.log(`✅ Created ${company.name}:`, createdCompany);
      }
    }

    // Verify companies were created
    console.log('\n✅ Verifying companies...');
    const { data: allCompanies, error: verifyError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error verifying companies:', verifyError);
    } else {
      console.log(`🎉 Total companies in database: ${allCompanies.length}`);
      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.subdomain}) - ID: ${company.id}`);
      });
    }

    // Test the acme subdomain lookup specifically
    console.log('\n🎯 Testing "acme" subdomain lookup...');
    const { data: acmeTest, error: acmeTestError } = await supabase
      .from('companies')
      .select('*')
      .eq('subdomain', 'acme')
      .single();

    if (acmeTestError) {
      console.error('❌ Acme lookup still failing:', acmeTestError);
    } else {
      console.log('✅ Acme lookup successful:', acmeTest);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

recreateCompanies();