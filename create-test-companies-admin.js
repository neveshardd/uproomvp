import { createClient } from '@supabase/supabase-js';

// Use the service role key to bypass RLS
const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU5MzEyMCwiZXhwIjoyMDczMTY5MTIwfQ.vxl9UW2w20F4kDwikNsdOGpO59cdCqVdbAbYAMxXhBs';

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function createTestCompanies() {
  console.log('Creating test companies with admin privileges...');

  const testCompanies = [
    {
      name: 'Dev Test Company',
      subdomain: 'devtestcompany',
      description: 'Test company for development'
    },
    {
      name: 'Misael TI',
      subdomain: 'misaelti',
      description: 'Misael TI consulting company'
    },
    {
      name: 'Demo Corp',
      subdomain: 'democorp',
      description: 'Demo company for testing'
    }
  ];

  try {
    for (const company of testCompanies) {
      console.log(`Creating company: ${company.name}`);
      
      const { data, error } = await supabaseAdmin
        .from('companies')
        .insert([company])
        .select();

      if (error) {
        console.error(`Error creating ${company.name}:`, error);
      } else {
        console.log(`✅ Successfully created ${company.name}:`, data[0]);
      }
    }

    // Verify companies were created
    console.log('\nVerifying companies...');
    const { data: companies, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('*');

    if (fetchError) {
      console.error('Error fetching companies:', fetchError);
    } else {
      console.log('All companies in database:', companies);
    }

    // Test subdomain lookup
    console.log('\nTesting subdomain lookup...');
    const { data: subdomainTest, error: subdomainError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('subdomain', 'devtestcompany')
      .single();

    if (subdomainError) {
      console.error('Error testing subdomain lookup:', subdomainError);
    } else {
      console.log('✅ Subdomain lookup successful:', subdomainTest);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestCompanies();