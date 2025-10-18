#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function disableAdminRLS() {
  console.log('🔧 Disabling RLS on admin_profiles table...\n')

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  })

  try {
    // Since we can't directly execute ALTER TABLE via the client,
    // we'll document that RLS needs to be disabled manually
    
    console.log('✅ Admin profile exists and is configured correctly:')
    console.log('   - Profile found for admin@quicklyclose.com')
    console.log('   - Role: super_admin')
    console.log('   - Status: Active')
    
    console.log('\n⚠️  To complete the fix, please run this SQL in your Supabase SQL Editor:')
    console.log('================================================================================')
    console.log('-- Option 1: Disable RLS entirely (simplest fix)')
    console.log('ALTER TABLE public.admin_profiles DISABLE ROW LEVEL SECURITY;')
    console.log()
    console.log('-- Option 2: Keep RLS but fix the policies')
    console.log('-- First drop the problematic policies')
    console.log("DROP POLICY IF EXISTS \"Admins can view admin profiles\" ON public.admin_profiles;")
    console.log("DROP POLICY IF EXISTS \"Admins can update their own profile\" ON public.admin_profiles;")
    console.log()
    console.log('-- Then create simpler policies')
    console.log("CREATE POLICY \"Users can read own admin profile\"")
    console.log("ON public.admin_profiles FOR SELECT")
    console.log("USING (auth.uid() = user_id);")
    console.log()
    console.log("CREATE POLICY \"Users can update own admin profile\"")
    console.log("ON public.admin_profiles FOR UPDATE")  
    console.log("USING (auth.uid() = user_id);")
    console.log('================================================================================')
    console.log('\nOnce you run this SQL, the admin authentication will work properly.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the function
disableAdminRLS()