/**
 * Script to test seller authentication flow
 * Run with: node test-seller-auth.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Test seller credentials
const TEST_SELLER_EMAIL = 'testseller@quicklyclose.com'
const TEST_SELLER_PASSWORD = 'TestSeller123!@#'

async function testSellerAuth() {
  console.log('🧪 Testing seller authentication flow...\n')

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing required environment variables')
    console.error('Please ensure the following are set in your .env.local file:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create Supabase clients
  const supabaseAuth = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Clean up any existing test user
    console.log('🧹 Cleaning up any existing test user...')
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
    } else {
      const testUser = existingUsers.users.find(user => user.email === TEST_SELLER_EMAIL)
      if (testUser) {
        console.log('Found existing test user, deleting...')
        await supabaseAdmin.auth.admin.deleteUser(testUser.id)
        console.log('✅ Cleaned up existing test user')
      }
    }

    // Step 2: Test seller signup
    console.log('\n📝 Testing seller signup...')
    const { data: signupData, error: signupError } = await supabaseAuth.auth.signUp({
      email: TEST_SELLER_EMAIL,
      password: TEST_SELLER_PASSWORD,
      options: {
        data: {
          full_name: 'Test Seller',
          role: 'seller'
        }
      }
    })

    if (signupError) {
      console.error('❌ Signup error:', signupError)
      return
    }

    console.log('✅ Seller signup successful:', {
      userId: signupData.user?.id,
      email: signupData.user?.email,
      role: signupData.user?.user_metadata?.role
    })

    // Step 3: Check if seller profile was created automatically
    console.log('\n👤 Checking seller profile creation...')
    const userId = signupData.user?.id
    if (!userId) {
      console.error('❌ No user ID returned from signup')
      return
    }

    // Wait a moment for the trigger to run
    await new Promise(resolve => setTimeout(resolve, 2000))

    const { data: sellerProfile, error: profileError } = await supabaseAdmin
      .from('seller_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('❌ Error checking seller profile:', profileError)
    } else if (sellerProfile) {
      console.log('✅ Seller profile found:', {
        id: sellerProfile.id,
        full_name: sellerProfile.full_name,
        email: sellerProfile.email,
        userId: sellerProfile.user_id
      })
    } else {
      console.log('⚠️  No seller profile found, creating manually...')
      
      const { data: createdProfile, error: createError } = await supabaseAdmin
        .from('seller_profiles')
        .insert({
          user_id: userId,
          full_name: 'Test Seller',
          email: TEST_SELLER_EMAIL,
          preferred_communication: 'email',
          marketing_consent: false
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating seller profile:', createError)
      } else {
        console.log('✅ Seller profile created manually:', {
          id: createdProfile.id,
          full_name: createdProfile.full_name
        })
      }
    }

    // Step 4: Test seller signin
    console.log('\n🔐 Testing seller signin...')
    const { data: signinData, error: signinError } = await supabaseAuth.auth.signInWithPassword({
      email: TEST_SELLER_EMAIL,
      password: TEST_SELLER_PASSWORD
    })

    if (signinError) {
      console.error('❌ Signin error:', signinError)
    } else {
      console.log('✅ Seller signin successful:', {
        userId: signinData.user?.id,
        email: signinData.user?.email,
        role: signinData.user?.user_metadata?.role
      })

      // Step 5: Test profile loading
      console.log('\n📄 Testing profile loading with user context...')
      const { data: loadedProfile, error: loadError } = await supabaseAuth
        .from('seller_profiles')
        .select('*')
        .eq('user_id', signinData.user.id)
        .maybeSingle()

      if (loadError) {
        console.error('❌ Error loading seller profile with user context:', loadError)
      } else if (loadedProfile) {
        console.log('✅ Seller profile loaded successfully with user context')
      } else {
        console.log('⚠️  Profile not accessible with user context - possible RLS issue')
      }

      // Sign out
      await supabaseAuth.auth.signOut()
    }

    // Step 6: Clean up test user
    console.log('\n🧹 Cleaning up test user...')
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.log('✅ Test user cleaned up')
    }

    console.log('\n==================================================')
    console.log('🎉 Seller authentication test completed!')
    console.log('==================================================')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testSellerAuth()