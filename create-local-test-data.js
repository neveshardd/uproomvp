import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createLocalTestData() {
  console.log('🏢 Creating test data in local Supabase...');
  
  try {
    // First, try to get existing user or create a new one
    console.log('👤 Getting or creating test user...');
    
    let authUser;
    let userId;
    
    // Try to get existing user first
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const existingUser = existingUsers.users.find(user => user.email === 'test@example.com');
    
    if (existingUser) {
      console.log('✅ Using existing test user:', existingUser.email);
      authUser = { user: existingUser };
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'test@example.com',
        password: 'password123',
        email_confirm: true
      });

      if (authError) {
        console.error('❌ Error creating user:', authError);
        return;
      }

      console.log('✅ Test user created:', newUser.user.email);
      authUser = newUser;
      userId = newUser.user.id;
    }

    // Check if profile exists, create if not
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user.email,
          full_name: 'Test User',
          avatar_url: null
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        return;
      }

      console.log('✅ User profile created');
    } else {
      console.log('✅ User profile already exists');
    }

    // Create test companies
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
      }
    ];

    console.log('📝 Creating companies...');
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
      console.log(`  - ${company.name} (${company.subdomain})`);
    });

    // Add user as member to companies
    console.log('👥 Adding user as company member...');
    const membershipData = companies.map(company => ({
      user_id: userId,
      company_id: company.id,
      role: 'owner'
    }));

    const { error: memberError } = await supabase
      .from('company_members')
      .insert(membershipData);

    if (memberError) {
      console.error('❌ Error adding company members:', memberError);
      return;
    }

    console.log('✅ User added as company member');

    console.log('\n🎉 Local test data created successfully!');
    console.log('📧 Test user credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('\n🌐 You can now login and see the companies in your dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createLocalTestData();