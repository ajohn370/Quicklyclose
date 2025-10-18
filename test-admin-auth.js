#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function testAdminAuth() {
  console.log('🔍 Testing admin authentication flow...\n')

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // Step 1: Sign in as admin
    console.log('📧 Signing in as admin...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@quicklyclose.com',
      password: 'Admin123!@#'
    })

    if (authError) {
      console.error('❌ Sign in failed:', authError.message)
      return
    }

    console.log('✅ Signed in successfully')
    console.log('   User ID:', authData.user.id)
    console.log('   Email:', authData.user.email)
    console.log('   Session:', authData.session ? 'Active' : 'None')
    
    // Step 2: Get user profile
    console.log('\n👤 Checking user profile...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Failed to get user:', userError.message)
    } else {
      console.log('✅ User retrieved:', user.email)
    }
    
    // Step 3: Check admin profile
    console.log('\n🔐 Checking admin profile...')
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Failed to get admin profile:', profileError.message)
    } else {
      console.log('✅ Admin profile found:')
      console.log('   ID:', adminProfile.id)
      console.log('   Role:', adminProfile.role)
      console.log('   Active:', adminProfile.is_active)
    }
    
    // Step 4: Test API with session
    console.log('\n🌐 Testing API endpoint with session...')
    const accessToken = authData.session.access_token
    
    const response = await fetch('http://localhost:3000/api/test-auth', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token=${accessToken}`
      }
    })
    
    const result = await response.json()
    console.log('API Response:', JSON.stringify(result, null, 2))
    
    // Sign out
    await supabase.auth.signOut()
    console.log('\n✅ Test complete')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testAdminAuth()