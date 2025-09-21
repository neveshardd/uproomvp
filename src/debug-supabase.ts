import { supabase } from './lib/supabase'

// Debug function to test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Supabase Key (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    console.log('Session test result:', { data, error })
    
    // Test signup with detailed error logging
    const testEmail = 'test@example.com'
    const testPassword = 'testpassword123'
    
    console.log('Testing signup...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    console.log('Signup result:', { 
      data: signUpData, 
      error: signUpError,
      errorMessage: signUpError?.message,
      errorStatus: signUpError?.status,
      errorCode: (signUpError as any)?.code
    })
    
    return { signUpData, signUpError }
  } catch (error) {
    console.error('Unexpected error during Supabase test:', error)
    return { error }
  }
}

// Call this function when the module loads
if (typeof window !== 'undefined') {
  testSupabaseConnection()
}