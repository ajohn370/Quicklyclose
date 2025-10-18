#!/usr/bin/env node

/**
 * Test n8n Connection Script
 * Validates n8n API connection and workflow availability
 */

const https = require('https')
const http = require('http')

// Load environment variables
require('dotenv').config({ path: '.env.development' })

const N8N_API_KEY = process.env.N8N_API_KEY
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678'
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL

console.log('🔍 Testing n8n Connection...\n')
console.log(`Base URL: ${N8N_BASE_URL}`)
console.log(`API Key: ${N8N_API_KEY ? '✅ Configured' : '❌ Missing'}`)
console.log(`Webhook URL: ${N8N_WEBHOOK_URL ? '✅ Configured' : '❌ Missing'}\n`)

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${N8N_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'QuicklyClose-n8n-Test',
        ...options.headers
      },
      timeout: 10000,
      ...options
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers })
        }
      })
    })
    
    req.on('error', reject)
    req.on('timeout', () => reject(new Error('Request timeout')))
    req.end()
  })
}

async function testConnection() {
  try {
    console.log('1️⃣ Testing API Connection...')
    const healthCheck = await makeRequest(`${N8N_BASE_URL}/healthz`)
    
    if (healthCheck.status === 200) {
      console.log('✅ n8n server is running and healthy')
    } else {
      console.log(`⚠️ Health check returned: ${healthCheck.status}`)
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`)
    return false
  }

  try {
    console.log('\n2️⃣ Testing API Authentication...')
    const workflowsResponse = await makeRequest(`${N8N_BASE_URL}/api/v1/workflows`)
    
    if (workflowsResponse.status === 200) {
      console.log('✅ API authentication successful')
      const workflows = workflowsResponse.data.data || []
      console.log(`📋 Found ${workflows.length} workflows`)
      
      // Look for QuicklyClose workflow
      const quicklyCloseWorkflow = workflows.find(w => 
        w.name && w.name.toLowerCase().includes('quickly') || 
        w.name.toLowerCase().includes('property') ||
        w.name.toLowerCase().includes('analysis')
      )
      
      if (quicklyCloseWorkflow) {
        console.log(`🎯 Found QuicklyClose workflow: "${quicklyCloseWorkflow.name}"`)
        console.log(`   - ID: ${quicklyCloseWorkflow.id}`)
        console.log(`   - Active: ${quicklyCloseWorkflow.active ? '✅' : '❌'}`)
        console.log(`   - Nodes: ${quicklyCloseWorkflow.nodes?.length || 0}`)
        return quicklyCloseWorkflow
      } else {
        console.log('⚠️ QuicklyClose property analysis workflow not found')
        if (workflows.length > 0) {
          console.log('Available workflows:')
          workflows.slice(0, 3).forEach(w => {
            console.log(`   - ${w.name} (${w.active ? 'Active' : 'Inactive'})`)
          })
        }
      }
    } else if (workflowsResponse.status === 401) {
      console.log('❌ API authentication failed - check N8N_API_KEY')
      return false
    } else {
      console.log(`❌ API request failed: ${workflowsResponse.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`)
    return false
  }

  return true
}

async function testWebhook() {
  if (!N8N_WEBHOOK_URL) {
    console.log('⚠️ Webhook URL not configured - skipping webhook test')
    return
  }

  try {
    console.log('\n3️⃣ Testing Webhook Endpoint...')
    
    const testPayload = {
      test: true,
      imageUrl: 'https://example.com/test.jpg',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
      },
      requestId: 'test-' + Date.now(),
      userId: 'test-user'
    }

    const protocol = N8N_WEBHOOK_URL.startsWith('https') ? https : http
    
    const webhookTest = new Promise((resolve, reject) => {
      const postData = JSON.stringify(testPayload)
      
      const req = protocol.request(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'QuicklyClose-Test'
        },
        timeout: 15000
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          resolve({ status: res.statusCode, data, headers: res.headers })
        })
      })
      
      req.on('error', reject)
      req.on('timeout', () => reject(new Error('Webhook timeout')))
      req.write(postData)
      req.end()
    })

    const webhookResponse = await webhookTest
    
    if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
      console.log('✅ Webhook endpoint is responding')
      console.log(`📡 Response status: ${webhookResponse.status}`)
      
      try {
        const responseData = JSON.parse(webhookResponse.data)
        console.log('📊 Webhook processed test data successfully')
        return true
      } catch (e) {
        console.log('✅ Webhook responded (non-JSON response)')
        return true
      }
    } else {
      console.log(`⚠️ Webhook returned: ${webhookResponse.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Webhook test failed: ${error.message}`)
    return false
  }
}

async function main() {
  const connectionOk = await testConnection()
  const webhookOk = await testWebhook()
  
  console.log('\n📋 Test Summary:')
  console.log(`API Connection: ${connectionOk ? '✅' : '❌'}`)
  console.log(`Webhook Test: ${webhookOk ? '✅' : '❌'}`)
  
  if (connectionOk && webhookOk) {
    console.log('\n🎉 n8n integration is ready!')
  } else {
    console.log('\n⚠️ Some tests failed - check configuration')
  }
}

main().catch(console.error)