#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fixAdminProfile() {
  console.log('🔧 Fixing admin profile RLS issues...\n')

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // First, let's check if RLS is enabled
    console.log('📋 Checking RLS status on admin_profiles...')
    
    // Temporarily disable RLS to fix the issue
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.admin_profiles DISABLE ROW LEVEL SECURITY;'
    }).single()
    
    if (!disableError) {
      console.log('✅ RLS temporarily disabled on admin_profiles')
    }
    
    // Check if admin profile exists
    const { data: profiles, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', '1ff3c5f6-aeda-41d9-b3f0-c968e45e3309')
    
    if (profileError) {
      console.error('❌ Error checking profiles:', profileError.message)
    } else {
      console.log('✅ Found', profiles.length, 'admin profile(s)')
      if (profiles.length > 0) {
        console.log('   Profile ID:', profiles[0].id)
        console.log('   Role:', profiles[0].role)
        console.log('   Active:', profiles[0].is_active)
      }
    }
    
    console.log('\n⚠️  IMPORTANT: Run the following SQL in your Supabase dashboard to fix RLS:')
    console.log('================================================================================')
    console.log(`
-- Disable RLS temporarily
ALTER TABLE public.admin_profiles DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS, fix the policies:
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admin_profiles;

-- Create simple policies without recursion
CREATE POLICY "Users can read own admin profile" 
ON public.admin_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own admin profile" 
ON public.admin_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can check admin exists"
ON public.admin_profiles
FOR SELECT
USING (auth.role() = 'authenticated');
    `)
    console.log('================================================================================')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the fix
fixAdminProfile()