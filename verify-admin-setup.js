#!/usr/bin/env node

/**
 * Script to verify and fix admin setup for QuicklyClose
 * Run with: node verify-admin-setup.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Admin user credentials
const ADMIN_EMAIL = 'admin@quicklyclose.com'
const ADMIN_PASSWORD = 'Admin123!@#'

async function verifyAdminSetup() {
  console.log('🔍 Verifying admin setup for QuicklyClose...\n')

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing required environment variables')
    console.error('Please ensure the following are set in your .env.local file:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Check if admin_profiles table exists
    console.log('📋 Checking admin_profiles table...')
    const { data: tables, error: tablesError } = await supabase
      .from('admin_profiles')
      .select('id')
      .limit(1)

    if (tablesError && tablesError.message.includes('does not exist')) {
      console.error('❌ admin_profiles table does not exist!')
      console.log('\nTo fix this:')
      console.log('1. Go to your Supabase Dashboard → SQL Editor')
      console.log('2. Run the SQL from: supabase/admin-profiles-schema.sql')
      console.log('3. Then run this script again')
      process.exit(1)
    }

    console.log('✅ admin_profiles table exists')

    // Step 2: Find admin user in auth.users
    console.log('\n👤 Finding admin user...')
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) throw listError
    
    const adminUser = users.users.find(u => u.email === ADMIN_EMAIL)
    
    if (!adminUser) {
      console.error(`❌ No user found with email: ${ADMIN_EMAIL}`)
      console.log('\nRun: node create-admin-user.js first')
      process.exit(1)
    }
    
    console.log(`✅ Found admin user: ${adminUser.id}`)

    // Step 3: Check admin_profiles entry
    console.log('\n🔐 Checking admin profile...')
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', adminUser.id)
      .single()

    if (profileError || !adminProfile) {
      console.log('⚠️  Admin profile not found, creating...')
      
      // Create admin profile
      const { data: newProfile, error: createError } = await supabase
        .from('admin_profiles')
        .insert({
          user_id: adminUser.id,
          full_name: 'QuicklyClose Admin',
          role: 'super_admin',
          department: 'Administration',
          permissions: {
            can_manage_users: true,
            can_manage_pricing: true,
            can_view_all_data: true,
            can_export_data: true,
            can_manage_settings: true
          },
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Failed to create admin profile:', createError.message)
        process.exit(1)
      }

      console.log('✅ Admin profile created successfully')
    } else {
      console.log('✅ Admin profile exists')
      console.log(`   Role: ${adminProfile.role}`)
      console.log(`   Active: ${adminProfile.is_active}`)

      // Ensure admin is active and has super_admin role
      if (!adminProfile.is_active || adminProfile.role !== 'super_admin') {
        console.log('\n🔄 Updating admin profile...')
        const { error: updateError } = await supabase
          .from('admin_profiles')
          .update({
            role: 'super_admin',
            is_active: true,
            permissions: {
              can_manage_users: true,
              can_manage_pricing: true,
              can_view_all_data: true,
              can_export_data: true,
              can_manage_settings: true
            }
          })
          .eq('id', adminProfile.id)

        if (updateError) {
          console.error('❌ Failed to update admin profile:', updateError.message)
        } else {
          console.log('✅ Admin profile updated to super_admin')
        }
      }
    }

    // Step 4: Test authentication
    console.log('\n🔑 Testing authentication...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      console.log('\nTry running: node reset-admin-password.js')
      process.exit(1)
    }

    console.log('✅ Authentication successful!')
    
    // Sign out to clean up
    await supabase.auth.signOut()

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('🎉 Admin setup verification complete!')
    console.log('='.repeat(50))
    console.log('\nAdmin Credentials:')
    console.log(`📧 Email: ${ADMIN_EMAIL}`)
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`)
    console.log('\n🌐 Login URL: http://localhost:3000/admin')
    console.log('\n✅ Everything is set up correctly. You should be able to log in now.')
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message)
    process.exit(1)
  }
}

// Run the script
verifyAdminSetup()