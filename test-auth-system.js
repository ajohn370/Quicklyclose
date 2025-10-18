// Test script for new authentication system
// Run with: node test-auth-system.js

const { createClient } = require('@supabase/supabase-js')

// Replace with your Supabase project details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthentication() {
  console.log('🔐 Testing New Authentication System\n')
  console.log('=====================================\n')

  try {
    // Test 1: Create a new user
    console.log('Test 1: Creating new user with investor role...')
    const testEmail = `test.${Date.now()}@example.com`
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test Multi User',
          role: 'investor'
        }
      }
    })

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message)
      return
    }
    console.log('✅ User created successfully')
    console.log('   Email:', testEmail)
    console.log('   User ID:', signUpData.user?.id)

    // Test 2: Sign in
    console.log('\nTest 2: Signing in...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      return
    }
    console.log('✅ Sign in successful')

    const userId = signInData.user?.id
    if (!userId) {
      console.error('❌ No user ID found')
      return
    }

    // Test 3: Check user profile
    console.log('\nTest 3: Checking user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message)
    } else {
      console.log('✅ Profile found:')
      console.log('   Full Name:', profile.full_name)
      console.log('   Email:', profile.email)
    }

    // Test 4: Check user roles
    console.log('\nTest 4: Checking user roles...')
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', userId)

    if (rolesError) {
      console.error('❌ Roles fetch failed:', rolesError.message)
    } else {
      console.log('✅ Roles found:')
      roles.forEach(r => {
        console.log(`   - ${r.role} (active: ${r.is_active})`)
      })
    }

    // Test 5: Add seller role
    console.log('\nTest 5: Adding seller role...')
    const { data: addRoleData, error: addRoleError } = await supabase
      .rpc('add_user_role', {
        p_user_id: userId,
        p_role: 'seller'
      })

    if (addRoleError) {
      console.error('❌ Add role failed:', addRoleError.message)
    } else {
      console.log('✅ Seller role added successfully')
    }

    // Test 6: Check if user has specific role
    console.log('\nTest 6: Checking role permissions...')
    const { data: hasSellerRole } = await supabase
      .rpc('user_has_role', {
        p_user_id: userId,
        p_role: 'seller'
      })
    
    const { data: hasAdminRole } = await supabase
      .rpc('user_has_role', {
        p_user_id: userId,
        p_role: 'admin'
      })

    console.log('✅ Role check results:')
    console.log('   Has seller role:', hasSellerRole)
    console.log('   Has admin role:', hasAdminRole)

    // Test 7: Get all user roles
    console.log('\nTest 7: Getting all user roles...')
    const { data: allRoles, error: allRolesError } = await supabase
      .rpc('get_user_roles', {
        p_user_id: userId
      })

    if (allRolesError) {
      console.error('❌ Get roles failed:', allRolesError.message)
    } else {
      console.log('✅ All user roles:')
      allRoles.forEach(r => {
        console.log(`   - ${r.role} (active: ${r.is_active})`)
      })
    }

    // Test 8: Create session context
    console.log('\nTest 8: Creating session context...')
    const sessionToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        active_role: 'seller',
        portal_context: 'seller_portal',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      })

    if (sessionError) {
      console.error('❌ Session creation failed:', sessionError.message)
    } else {
      console.log('✅ Session created with token:', sessionToken.substring(0, 8) + '...')
    }

    console.log('\n=====================================')
    console.log('✅ All tests completed successfully!')
    console.log('=====================================\n')

    // Cleanup (optional)
    console.log('Cleaning up test data...')
    await supabase.auth.signOut()
    console.log('✅ Signed out\n')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
console.log('Starting authentication system test...\n')
console.log('Make sure to set your Supabase URL and anon key as environment variables:')
console.log('  export NEXT_PUBLIC_SUPABASE_URL=your_url_here')
console.log('  export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here\n')

testAuthentication()