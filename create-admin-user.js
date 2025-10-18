#!/usr/bin/env node

/**
 * Script to create a default admin user for QuicklyClose
 * Run with: node create-admin-user.js
 * 
 * Requirements:
 * - Set SUPABASE_SERVICE_ROLE_KEY in your .env file
 * - Admin schema must be set up first (run supabase-admin-schema.sql)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Admin user credentials
const ADMIN_EMAIL = 'admin@quicklyclose.com'
const ADMIN_PASSWORD = 'Admin123!@#'

async function createAdminUser() {
  console.log('🚀 Creating admin user for QuicklyClose...\n')

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing required environment variables')
    console.error('Please ensure the following are set in your .env file:')
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
    console.log('📧 Creating admin user...')
    
    // Create the admin user
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: 'QuicklyClose Admin',
        admin_role: 'super_admin',
        department: 'Administration'
      }
    })

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log('⚠️  User already exists, updating profile...')
        
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers.users.find(u => u.email === ADMIN_EMAIL)
        
        if (existingUser) {
          // Update user metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              user_metadata: {
                role: 'admin',
                full_name: 'QuicklyClose Admin',
                admin_role: 'super_admin',
                department: 'Administration'
              }
            }
          )

          if (updateError) {
            throw updateError
          }

          console.log('✅ Updated existing user metadata')
        }
      } else {
        throw createError
      }
    } else {
      console.log('✅ Admin user created successfully')
      console.log(`   User ID: ${user.user.id}`)
      console.log(`   Email: ${user.user.email}`)
    }

    // Wait a moment for the trigger to potentially create the admin profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('\n🔧 Setting up admin profile...')

    // Check if admin profile exists and create/update it
    const { data: profiles, error: profileCheckError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === ADMIN_EMAIL)?.id)

    if (profileCheckError && !profileCheckError.message.includes('does not exist')) {
      throw profileCheckError
    }

    // Get user ID for profile creation
    const { data: users } = await supabase.auth.admin.listUsers()
    const adminUser = users.users.find(u => u.email === ADMIN_EMAIL)
    
    if (!adminUser) {
      throw new Error('Could not find created admin user')
    }

    // Create or update admin profile
    const { error: profileError } = await supabase
      .from('admin_profiles')
      .upsert({
        user_id: adminUser.id,
        full_name: 'QuicklyClose Admin',
        role: 'super_admin',
        department: 'Administration',
        permissions: {
          can_manage_users: true,
          can_manage_pricing: true,
          can_view_all_data: true,
          can_export_data: true
        },
        is_active: true
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })

    if (profileError) {
      console.error('⚠️  Could not create admin profile in database:', profileError.message)
      console.log('This might be because the admin_profiles table does not exist.')
      console.log('Please run the supabase-admin-schema.sql file first.')
    } else {
      console.log('✅ Admin profile created/updated successfully')
    }

    console.log('\n🎉 Admin user setup complete!')
    console.log('\nAdmin Credentials:')
    console.log(`📧 Email: ${ADMIN_EMAIL}`)
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`)
    console.log('\n⚠️  IMPORTANT: Change this password after first login!')
    console.log('\n🌐 You can now sign in at: /admin')

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    
    if (error.message.includes('relation "admin_profiles" does not exist')) {
      console.log('\n💡 Solution: Run the admin schema first:')
      console.log('1. Go to your Supabase Dashboard → SQL Editor')
      console.log('2. Run the supabase-admin-schema.sql file')
      console.log('3. Then run this script again')
    }
    
    process.exit(1)
  }
}

// Run the script
createAdminUser()
