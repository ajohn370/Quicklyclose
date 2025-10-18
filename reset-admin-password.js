#!/usr/bin/env node

/**
 * Script to reset the admin password for QuicklyClose
 * Run with: node reset-admin-password.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Admin user credentials
const ADMIN_EMAIL = 'admin@quicklyclose.com'
const NEW_PASSWORD = 'Admin123!@#'

async function resetAdminPassword() {
  console.log('🔐 Resetting admin password for QuicklyClose...\n')

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
    console.log(`📧 Finding user with email: ${ADMIN_EMAIL}`)
    
    // Get existing user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) throw listError
    
    const adminUser = users.users.find(u => u.email === ADMIN_EMAIL)
    
    if (!adminUser) {
      console.error(`❌ No user found with email: ${ADMIN_EMAIL}`)
      console.log('\nTry running: node create-admin-user.js first')
      process.exit(1)
    }
    
    console.log(`✅ Found user: ${adminUser.id}`)
    console.log('🔄 Resetting password...')
    
    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        password: NEW_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...adminUser.user_metadata,
          role: 'admin',
          admin_role: 'super_admin'
        }
      }
    )
    
    if (updateError) throw updateError
    
    console.log('\n🎉 Password reset successful!')
    console.log('\nAdmin Credentials:')
    console.log(`📧 Email: ${ADMIN_EMAIL}`)
    console.log(`🔑 Password: ${NEW_PASSWORD}`)
    console.log('\n🌐 You can now sign in at: http://localhost:3000/admin')
    console.log('\n⚠️  IMPORTANT: Change this password after first login!')
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message)
    process.exit(1)
  }
}

// Run the script
resetAdminPassword()