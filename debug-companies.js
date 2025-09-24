// Debug script to check companies table and test company creation
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCompanies() {
  console.log('=== Debugging Companies Table ===')
  
  try {
    // Get all companies
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching companies:', error)
      return
    }
    
    console.log('All companies:')
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ID: ${company.id}`)
      console.log(`   Name: ${company.name}`)
      console.log(`   Subdomain: ${company.subdomain}`)
      console.log(`   Created: ${company.created_at}`)
      console.log('   ---')
    })
    
    // Check specifically for 'misaelti' subdomain
    const { data: misaeltiCompany, error: misaeltiError } = await supabase
      .from('companies')
      .select('*')
      .eq('subdomain', 'misaelti')
      .single()
    
    console.log('\n=== Checking for "misaelti" subdomain ===')
    if (misaeltiError) {
      console.log('Error or not found:', misaeltiError)
    } else {
      console.log('Found company with misaelti subdomain:', misaeltiCompany)
    }
    
    // Check specifically for 'test2' subdomain
    const { data: test2Company, error: test2Error } = await supabase
      .from('companies')
      .select('*')
      .eq('subdomain', 'test2')
      .single()
    
    console.log('\n=== Checking for "test2" subdomain ===')
    if (test2Error) {
      console.log('Error or not found:', test2Error)
    } else {
      console.log('Found company with test2 subdomain:', test2Company)
    }
    
    // Check for similar subdomains
    const { data: similarCompanies, error: similarError } = await supabase
      .from('companies')
      .select('*')
      .ilike('subdomain', '%test%')
    
    console.log('\n=== Companies with test-related subdomains ===')
    if (similarError) {
      console.log('Error:', similarError)
    } else {
      console.log('Test-related companies:', similarCompanies)
    }
    
    // Test the create_company_with_owner function
    console.log('\n=== Testing create_company_with_owner function ===')
    const { data: testResult, error: testError } = await supabase
      .rpc('create_company_with_owner', {
        company_name: 'Test Company Debug',
        company_subdomain: 'test-debug-' + Date.now(),
        company_description: 'Test company for debugging'
      })
    
    if (testError) {
      console.log('Error calling create_company_with_owner:', testError)
    } else {
      console.log('Function call successful:', testResult)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

debugCompanies()