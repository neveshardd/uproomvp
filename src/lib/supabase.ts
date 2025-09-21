import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('Supabase Configuration:')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    debug: true,
    // Enable email confirmation for proper verification flow
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'uproom@1.0.0'
    }
  }
})

// Test connection and auth configuration on initialization
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error)
  } else {
    console.log('Supabase connection test successful')
  }
})

// Test a simple query to check database connectivity
supabase.from('_realtime_schema_migrations').select('*').limit(1).then(({ data, error }) => {
  if (error) {
    console.log('Database connectivity test - Expected error for protected table:', error.message)
  } else {
    console.log('Database connectivity test successful')
  }
})