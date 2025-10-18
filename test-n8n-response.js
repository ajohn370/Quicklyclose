const https = require('https');
require('dotenv').config({ path: '.env.development' });

const testData = {
  imageUrl: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop",
  address: {
    street: "132 Point Of Woods Drive",
    city: "Albany", 
    state: "NY",
    zip: "12201"
  },
  requestId: `response-test-${Date.now()}`,
  userId: "test-user"
};

console.log('🧪 Testing n8n Webhook Response Configuration\n');
console.log('=' + '='.repeat(50));

const webhookUrl = process.env.N8N_WEBHOOK_URL;
console.log(`Webhook URL: ${webhookUrl}`);
console.log(`Test Property: ${testData.address.street}, ${testData.address.city}, ${testData.address.state}`);
console.log('=' + '='.repeat(50));

function testWebhook() {
  const url = new URL(webhookUrl);
  const postData = JSON.stringify(testData);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('\n📤 Sending request to n8n webhook...');
  const startTime = Date.now();

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n📥 Response received in ${responseTime}s`);
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      console.log('\nHeaders:', JSON.stringify(res.headers, null, 2));
      
      if (data) {
        console.log('\n📊 Response Data:');
        console.log('-'.repeat(50));
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
          
          // Check for expected fields
          console.log('\n✅ Response Validation:');
          console.log(`  • Has success field: ${json.success ? '✅' : '❌'}`);
          console.log(`  • Has data field: ${json.data ? '✅' : '❌'}`);
          console.log(`  • Has requestId: ${json.requestId ? '✅' : '❌'}`);
          
          if (json.data && json.data.propertyAnalysis) {
            const analysis = json.data.propertyAnalysis;
            console.log(`  • Has address: ${analysis.address ? '✅' : '❌'}`);
            console.log(`  • Has Gemini analysis: ${analysis.geminiAnalysis ? '✅' : '❌'}`);
            console.log(`  • Has Zillow data: ${analysis.zillowData ? '✅' : '❌'}`);
            console.log(`  • Has comparables: ${analysis.comparables ? '✅' : '❌'}`);
            console.log(`  • Has market analysis: ${analysis.marketAnalysis ? '✅' : '❌'}`);
            console.log(`  • Has AI recommendation: ${analysis.aiRecommendation ? '✅' : '❌'}`);
            
            if (analysis.marketAnalysis && analysis.marketAnalysis.estimatedValue) {
              console.log(`\n💰 Estimated Value: $${analysis.marketAnalysis.estimatedValue.toLocaleString()}`);
            }
          }
          
        } catch (e) {
          console.log('⚠️ Response is not valid JSON:', data);
        }
      } else {
        console.log('\n❌ Empty response received');
        console.log('The webhook is responding but not returning data.');
        console.log('Please add a "Respond to Webhook" node in your n8n workflow.');
      }
      
      console.log('\n' + '=' + '='.repeat(50));
      console.log('Test complete!');
    });
  });

  req.on('error', (e) => {
    console.error(`\n❌ Request failed: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testWebhook();