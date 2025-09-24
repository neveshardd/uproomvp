import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ixqjqvqvqvqvqvqvqvqv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxdnF2cXZxdnF2cXZxdnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzE2NzcsImV4cCI6MjA0ODMwNzY3N30.Ej_1_rqLlJXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSubdomainLookup() {
  console.log('🔍 Testing subdomain lookup logic...')
  
  const testSubdomains = ['devtestcompany', 'misaelti', 'test2']
  
  for (const subdomain of testSubdomains) {
    console.log(`\n📍 Testing subdomain: "${subdomain}"`)
    
    try {
      // Test the exact query used by the application
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('subdomain', subdomain)
        .single()
      
      if (error) {
        console.log(`❌ Error for "${subdomain}":`, error.code, error.message)
        if (error.code === 'PGRST116') {
          console.log(`   → This means no company found with subdomain "${subdomain}"`)
        }
      } else {
        console.log(`✅ Found company for "${subdomain}":`)
        console.log(`   → ID: ${data.id}`)
        console.log(`   → Name: ${data.name}`)
        console.log(`   → Subdomain: ${data.subdomain}`)
        console.log(`   → Created: ${data.created_at}`)
      }
    } catch (err) {
      console.log(`💥 Exception for "${subdomain}":`, err.message)
    }
  }
  
  // Also test a broader query to see all companies
  console.log('\n📋 All companies in database:')
  try {
    const { data: allCompanies, error } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log('❌ Error fetching all companies:', error)
    } else {
      console.log(`Found ${allCompanies.length} companies:`)
      allCompanies.forEach(company => {
        console.log(`   → "${company.name}" (${company.subdomain}) - ID: ${company.id}`)
      })
    }
  } catch (err) {
    console.log('💥 Exception fetching all companies:', err.message)
  }
}

// Test subdomain extraction logic
function testSubdomainExtraction() {
  console.log('\n🌐 Testing subdomain extraction logic...')
  
  const testUrls = [
    'http://devtestcompany.localhost:8080/',
    'http://misaelti.localhost:8080/',
    'http://test2.localhost:8080/',
    'http://localhost:8080/'
  ]
  
  testUrls.forEach(url => {
    // Simulate the getCurrentSubdomain logic
    const hostname = new URL(url).hostname
    const parts = hostname.split('.')
    
    let extractedSubdomain = null
    
    if (hostname.includes('localhost')) {
      if (parts.length >= 2 && parts[1] === 'localhost') {
        extractedSubdomain = parts[0]
      }
    }
    
    console.log(`URL: ${url}`)
    console.log(`   → Hostname: ${hostname}`)
    console.log(`   → Parts: [${parts.join(', ')}]`)
    console.log(`   → Extracted subdomain: ${extractedSubdomain || 'null'}`)
  })
}

async function main() {
  testSubdomainExtraction()
  await testSubdomainLookup()
}

main().catch(console.error)