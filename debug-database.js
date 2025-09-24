// Debug script to check database structure and connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://giawohzenspimigbostg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpYXdvaHplbnNwaW1pZ2Jvc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTMxMjAsImV4cCI6MjA3MzE2OTEyMH0.A4No22t-xgE5QoiSI1Jh0-4X8qQ-3CPfkyHWOHiUu6I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDatabase() {
  console.log('=== Database Connection and Structure Debug ===')
  
  try {
    // Test basic connection
    console.log('\n=== Testing Basic Connection ===')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('companies')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.log('Connection error:', connectionError)
      return
    } else {
      console.log('Connection successful')
    }
    
    // Check if companies table exists and its structure
    console.log('\n=== Checking Companies Table Structure ===')
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('companies')
        .select('*')
        .limit(0)
      
      if (tableError) {
        console.log('Table structure check error:', tableError)
      } else {
        console.log('Table accessible')
      }
    } catch (error) {
      console.log('Table access error:', error.message)
    }
    
    // Check total count of companies
    console.log('\n=== Checking Total Company Count ===')
    const { count, error: countError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('Count error:', countError)
    } else {
      console.log('Total companies in database:', count)
    }
    
    // Check if there are any companies at all
    console.log('\n=== Checking for Any Companies ===')
    const { data: anyCompanies, error: anyError } = await supabase
      .from('companies')
      .select('id, name, subdomain, created_at')
      .limit(10)
    
    if (anyError) {
      console.log('Error fetching companies:', anyError)
    } else {
      console.log('Found companies:', anyCompanies.length)
      anyCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.subdomain}) - Created: ${company.created_at}`)
      })
    }
    
    // Check profiles table
    console.log('\n=== Checking Profiles Table ===')
    const { count: profileCount, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (profileError) {
      console.log('Profiles table error:', profileError)
    } else {
      console.log('Total profiles in database:', profileCount)
    }
    
    // Check company_members table
    console.log('\n=== Checking Company Members Table ===')
    const { count: memberCount, error: memberError } = await supabase
      .from('company_members')
      .select('*', { count: 'exact', head: true })
    
    if (memberError) {
      console.log('Company members table error:', memberError)
    } else {
      console.log('Total company members in database:', memberCount)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

debugDatabase()