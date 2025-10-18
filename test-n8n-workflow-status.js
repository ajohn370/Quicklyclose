const https = require('https');
require('dotenv').config({ path: '.env.development' });

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://quicklyclose.app.n8n.cloud';

console.log('🔍 Investigating n8n Workflow Status\n');
console.log('=' + '='.repeat(50));
console.log(`n8n Instance: ${N8N_BASE_URL}`);
console.log(`API Key: ${N8N_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log('=' + '='.repeat(50));

// Function to make API request
function makeRequest(path, method = 'GET') {
  const url = new URL(path, N8N_BASE_URL);
  
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    };

    https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n📡 API Response for ${path}:`);
        console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
        
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject).end();
  });
}

async function checkWorkflows() {
  try {
    // 1. Check if API is accessible
    console.log('\n1️⃣ Testing n8n API Access...');
    const apiTest = await makeRequest('/api/v1/workflows');
    
    if (apiTest.status === 401) {
      console.log('   ❌ Authentication failed - API key may be invalid');
      return;
    } else if (apiTest.status === 200) {
      console.log('   ✅ API is accessible');
      
      // List workflows
      if (apiTest.data && apiTest.data.data) {
        console.log(`   Found ${apiTest.data.data.length} workflows:`);
        apiTest.data.data.forEach(wf => {
          const isTarget = wf.name === 'QuicklyClose Property Analysis Pipeline';
          console.log(`     ${isTarget ? '🎯' : '•'} ${wf.name}`);
          console.log(`       ID: ${wf.id}`);
          console.log(`       Active: ${wf.active ? '✅' : '❌'}`);
          console.log(`       Created: ${wf.createdAt}`);
          console.log(`       Updated: ${wf.updatedAt}`);
          
          if (isTarget) {
            console.log('\n   🎯 TARGET WORKFLOW FOUND!');
            console.log(`   Status: ${wf.active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
            
            if (!wf.active) {
              console.log('\n   ⚠️ ISSUE IDENTIFIED: Workflow is INACTIVE');
              console.log('   This is why the webhook is not responding!');
            }
          }
        });
      }
    } else {
      console.log(`   ⚠️ Unexpected response: ${apiTest.status}`);
    }
    
    // 2. Test webhook directly
    console.log('\n2️⃣ Testing Webhook Endpoint...');
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    console.log(`   URL: ${webhookUrl}`);
    
    const webhookTest = await new Promise((resolve) => {
      https.get(webhookUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Response Status: ${res.statusCode}`);
          if (res.statusCode === 404) {
            console.log('   ❌ Webhook NOT REGISTERED (workflow inactive)');
            try {
              const json = JSON.parse(data);
              if (json.message) {
                console.log(`   Message: "${json.message}"`);
              }
            } catch (e) {}
          } else if (res.statusCode === 405) {
            console.log('   ✅ Webhook is registered (GET not allowed, POST required)');
          } else if (res.statusCode === 200) {
            console.log('   ✅ Webhook is active and responding');
          }
          resolve({ status: res.statusCode, data });
        });
      }).on('error', (err) => {
        console.log(`   ❌ Connection error: ${err.message}`);
        resolve({ error: err.message });
      });
    });
    
    // 3. Summary
    console.log('\n' + '=' + '='.repeat(50));
    console.log('📋 DIAGNOSIS SUMMARY:');
    console.log('=' + '='.repeat(50));
    
    if (webhookTest.status === 404) {
      console.log('\n❌ PROBLEM: Workflow is INACTIVE');
      console.log('\n🔧 SOLUTION:');
      console.log('1. Login to n8n Cloud: https://quicklyclose.app.n8n.cloud');
      console.log('2. Find workflow: "QuicklyClose Property Analysis Pipeline"');
      console.log('3. Click the toggle switch to ACTIVATE it');
      console.log('4. The webhook will immediately start working');
      console.log('\n📝 Once activated, your property submissions will:');
      console.log('   • Trigger Google Gemini 2.5 Pro AI analysis');
      console.log('   • Fetch Zillow market data for comparables');
      console.log('   • Generate comprehensive property reports');
      console.log('   • Store results in your database');
    } else if (webhookTest.status === 405 || webhookTest.status === 200) {
      console.log('\n✅ Workflow appears to be ACTIVE');
      console.log('The webhook is responding correctly.');
      console.log('\nIf submissions are still not triggering:');
      console.log('1. Check that your form is calling the correct webhook URL');
      console.log('2. Verify the request payload matches expected format');
      console.log('3. Check n8n execution logs for any errors');
    }
    
  } catch (error) {
    console.error('Error checking workflows:', error.message);
  }
}

checkWorkflows();