#!/usr/bin/env node

/**
 * Seller Flow Test Script
 * Tests the complete seller form submission and image upload flow
 */

const https = require('https')
const http = require('http')
const path = require('path')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.development' })

const SERVICE_KEY = process.env.COMP_AI_SERVICE_KEY || 'internal-service-key-quicklyclose-2024'
const BASE_URL = 'http://localhost:3000'

console.log('🧪 Seller Flow Test\n')
console.log('Configuration:')
console.log(`├─ Base URL: ${BASE_URL}`)
console.log(`├─ Service Key: ${SERVICE_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`└─ Test Mode: Development\n`)

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QuicklyClose-SellerTest',
        ...options.headers
      },
      timeout: 30000,
      ...options
    }

    const req = protocol.request(url, reqOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {}
          resolve({ 
            status: res.statusCode, 
            data: jsonData, 
            headers: res.headers,
            raw: data
          })
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            headers: res.headers,
            raw: data 
          })
        }
      })
    })
    
    req.on('error', reject)
    req.on('timeout', () => reject(new Error('Request timeout')))
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testDevServerRunning() {
  console.log('🔍 Testing Development Server...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`)
    
    if (response.status === 200) {
      console.log('✅ Development server is running')
      return true
    } else {
      console.log(`❌ Dev server health check failed: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Cannot connect to development server: ${error.message}`)
    console.log(`   Make sure 'npm run dev' is running`)
    return false
  }
}

async function testCompAIService() {
  console.log('\n🧠 Testing Comp AI Service...')
  
  try {
    const testPayload = {
      imageUrl: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop',
      address: {
        street: '123 Test Street',
        city: 'Schenectady',
        state: 'NY',
        zip: '12345'
      },
      requestId: `test-seller-${Date.now()}`,
      userId: 'test-user'
    }

    const response = await makeRequest(`${BASE_URL}/api/comp-ai/v1/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    if (response.status === 200) {
      console.log('✅ Comp AI service is working')
      
      if (response.data.success) {
        console.log('📊 Analysis Results:')
        console.log(`   ├─ Request ID: ${response.data.requestId}`)
        console.log(`   ├─ Version: ${response.data.version}`)
        console.log(`   └─ Data: ${response.data.data ? 'Present' : 'Missing'}`)
        
        return true
      } else {
        console.log(`⚠️ Service responded but analysis failed: ${response.data.error}`)
        return false
      }
    } else {
      console.log(`❌ Comp AI service failed: ${response.status}`)
      console.log(`   Response: ${response.raw}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Comp AI service test failed: ${error.message}`)
    return false
  }
}

async function testSellerFormEndpoints() {
  console.log('\n📝 Testing Seller Form Endpoints...')
  
  try {
    // Test the sellers/leads endpoint
    const testSellerData = {
      seller: {
        name: 'Test Seller',
        email: 'test@example.com',
        phone: '555-0123'
      },
      property: {
        address: '123 Test Street',
        city: 'Test City',
        state: 'NY',
        zip: '12345',
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1500
      }
    }

    const response = await makeRequest(`${BASE_URL}/api/sellers/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSellerData)
    })

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Seller form endpoint is working')
      
      if (response.data.success) {
        console.log('📝 Form Submission:')
        console.log(`   ├─ Success: ${response.data.success}`)
        console.log(`   ├─ Property ID: ${response.data.data?.propertyId || 'N/A'}`)
        console.log(`   └─ Message: ${response.data.message || 'N/A'}`)
        
        return response.data.data?.propertyId || true
      } else {
        console.log(`⚠️ Form submission failed: ${response.data.error}`)
        return false
      }
    } else {
      console.log(`❌ Seller form endpoint failed: ${response.status}`)
      console.log(`   Response: ${response.raw}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Seller form test failed: ${error.message}`)
    return false
  }
}

async function testImageUploadEndpoint() {
  console.log('\n📸 Testing Image Upload Endpoint...')
  
  // For this test, we'll just validate the endpoint structure
  // since we can't easily create multipart form data in this script
  
  try {
    // Test without file to see if endpoint responds correctly
    const response = await makeRequest(`${BASE_URL}/api/upload/property-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Empty body should trigger validation error
    })

    // We expect a 400 error for missing file
    if (response.status === 400 || response.status === 401) {
      console.log('✅ Image upload endpoint is responding')
      console.log(`   Expected validation error: ${response.data.error || 'Authentication required'}`)
      return true
    } else {
      console.log(`⚠️ Unexpected response from upload endpoint: ${response.status}`)
      console.log(`   Response: ${response.raw}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Image upload endpoint test failed: ${error.message}`)
    return false
  }
}

async function testN8nIntegration() {
  console.log('\n🔗 Testing n8n Integration...')
  
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
  
  if (!N8N_WEBHOOK_URL) {
    console.log('⚠️ n8n webhook URL not configured')
    return false
  }

  try {
    const testPayload = {
      imageUrl: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop',
      address: {
        street: '123 Test Street',
        city: 'Schenectady',
        state: 'NY',
        zip: '12345'
      },
      requestId: `integration-test-${Date.now()}`,
      userId: 'test-integration'
    }

    const response = await makeRequest(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    if (response.status >= 200 && response.status < 300) {
      console.log('✅ n8n webhook is responding')
      console.log(`   Status: ${response.status}`)
      return true
    } else if (response.status === 404) {
      console.log('⚠️ n8n webhook not activated')
      console.log('   Please activate your workflow in n8n Cloud')
      return false
    } else {
      console.log(`❌ n8n webhook failed: ${response.status}`)
      console.log(`   Response: ${response.raw}`)
      return false
    }
  } catch (error) {
    console.log(`❌ n8n integration test failed: ${error.message}`)
    return false
  }
}

async function generateReport(results) {
  console.log('\n📋 Seller Flow Test Report:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const checks = [
    { name: 'Development Server', status: results.devServer },
    { name: 'Comp AI Service', status: results.compAI },
    { name: 'Seller Form Endpoint', status: results.sellerForm },
    { name: 'Image Upload Endpoint', status: results.imageUpload },
    { name: 'n8n Integration', status: results.n8nIntegration }
  ]

  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌'
    console.log(`${icon} ${check.name}`)
  })

  const passedCount = checks.filter(c => c.status).length
  const totalCount = checks.length
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 Score: ${passedCount}/${totalCount} tests passed`)
  
  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed! Seller flow is ready for testing.')
    console.log('\nNext steps:')
    console.log('1. Run the database schema: complete-schema-update.sql')
    console.log('2. Test the seller form manually at /seller-portal')
    console.log('3. Activate n8n workflow')
    console.log('4. Test end-to-end image analysis')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the issues above.')
    
    if (!results.devServer) {
      console.log('\nTo fix dev server issues:')
      console.log('- Run: npm run dev')
      console.log('- Check for port conflicts')
    }
    
    if (!results.n8nIntegration) {
      console.log('\nTo fix n8n issues:')
      console.log('- Activate workflow in n8n Cloud')
      console.log('- Check webhook URL configuration')
    }
  }
}

async function main() {
  try {
    const results = {
      devServer: await testDevServerRunning(),
      compAI: await testCompAIService(),
      sellerForm: await testSellerFormEndpoints(),
      imageUpload: await testImageUploadEndpoint(),
      n8nIntegration: await testN8nIntegration()
    }

    await generateReport(results)
    
    // Exit with appropriate code
    const allPassed = Object.values(results).every(Boolean)
    process.exit(allPassed ? 0 : 1)
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { main }