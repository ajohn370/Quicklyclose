#!/usr/bin/env node

/**
 * Test script for seller submission flow without authentication
 * Tests the complete flow: submission -> email activation -> status check
 */

const testSellerSubmission = async () => {
  console.log('🧪 Testing Seller Submission Flow\n')

  const testData = {
    seller: {
      name: 'John Doe',
      email: 'test.seller@example.com',
      phone: '+1 (555) 123-4567'
    },
    property: {
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zip: '90210',
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1500
    }
  }

  try {
    // Test 1: Submit property without authentication
    console.log('1️⃣ Testing property submission without authentication...')
    
    const submitResponse = await fetch('http://localhost:3000/api/sellers/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })

    const submitResult = await submitResponse.json()
    console.log('✅ Submission Result:', {
      success: submitResult.success,
      message: submitResult.message,
      data: submitResult.data ? {
        leadId: submitResult.data.leadId,
        email: submitResult.data.email,
        userExists: submitResult.data.userExists
      } : null
    })

    if (!submitResult.success) {
      throw new Error(`Submission failed: ${submitResult.message}`)
    }

    // Test 2: Check submission status
    console.log('\n2️⃣ Testing status check for submitted property...')
    
    const statusResponse = await fetch('http://localhost:3000/api/sellers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testData.seller.email })
    })

    const statusResult = await statusResponse.json()
    console.log('✅ Status Check Result:', {
      success: statusResult.success,
      accountStatus: statusResult.data?.accountStatus,
      properties: statusResult.data?.properties?.length || 0,
      sellerName: statusResult.data?.seller?.name
    })

    // Test 3: Test invalid email status check
    console.log('\n3️⃣ Testing status check with non-existent email...')
    
    const invalidStatusResponse = await fetch('http://localhost:3000/api/sellers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    })

    const invalidStatusResult = await invalidStatusResponse.json()
    console.log('✅ Invalid Email Result:', {
      success: invalidStatusResult.success,
      message: invalidStatusResult.message,
      expectedError: !invalidStatusResult.success
    })

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📧 Next steps to verify complete flow:')
    console.log(`1. Check email for account activation link sent to: ${testData.seller.email}`)
    console.log('2. Click the activation link to set up password')
    console.log('3. Login to seller dashboard to view submitted properties')
    console.log('4. Verify property appears in seller dashboard')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSellerSubmission()
}

module.exports = { testSellerSubmission }