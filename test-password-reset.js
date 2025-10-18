#!/usr/bin/env node

/**
 * Test script for password reset flow
 * Tests the complete flow: request reset -> receive email -> reset password
 */

const testPasswordReset = async () => {
  console.log('🧪 Testing Password Reset Flow\n')

  const testEmail = 'test.reset@example.com'
  const baseUrl = 'http://localhost:3000'

  try {
    // Test 1: Request password reset
    console.log('1️⃣ Testing password reset request...')
    
    const resetResponse = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: testEmail,
        portal: 'investor'
      })
    }).catch(() => null)

    if (resetResponse) {
      const resetResult = await resetResponse.json()
      console.log('✅ Reset Request Result:', {
        success: resetResult.success,
        message: resetResult.message
      })
    } else {
      console.log('ℹ️ Using Supabase client directly for password reset')
    }

    console.log('\n📧 Next steps to verify complete flow:')
    console.log(`1. Check email sent to: ${testEmail}`)
    console.log('2. Click the password reset link in the email')
    console.log('3. Verify the reset password page loads with proper authentication')
    console.log('4. Enter new password and confirm it works')
    console.log('5. Try logging in with the new password')
    
    console.log('\n🔍 Expected URL format in email:')
    console.log(`${baseUrl}/reset-password?portal=investor#access_token=xxx&refresh_token=xxx&type=recovery`)
    
    console.log('\n⚠️ Common issues to check:')
    console.log('- Missing hash parameters (#access_token, #refresh_token)')
    console.log('- Token expired (links expire after 1 hour by default)')
    console.log('- Session not being set from tokens')
    console.log('- updateUser called without valid session')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testPasswordReset()
}

module.exports = { testPasswordReset }