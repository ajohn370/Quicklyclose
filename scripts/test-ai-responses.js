const fetch = require('node-fetch')

async function testAIResponsesAPI() {
  console.log('Testing AI Responses API...\n')
  
  try {
    // Test the API endpoint
    const response = await fetch('http://localhost:3001/api/admin/analyses-service?limit=5', {
      headers: {
        // You'll need to add a valid auth token here for production testing
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ API Response successful')
      console.log(`📊 Found ${data.data.length} AI analyses\n`)
      
      // Check the structure of each response
      data.data.forEach((analysis, index) => {
        console.log(`Analysis ${index + 1}:`)
        console.log(`  - ID: ${analysis.id}`)
        console.log(`  - Workflow: ${analysis.workflow_name}`)
        console.log(`  - Status: ${analysis.status}`)
        console.log(`  - Confidence: ${analysis.confidence_score}%`)
        console.log(`  - Processing Time: ${analysis.processing_time}ms`)
        
        if (analysis.ai_response) {
          console.log('  - AI Response Fields:')
          if (analysis.ai_response.estimated_value) {
            console.log(`    • Estimated Value: $${analysis.ai_response.estimated_value.toLocaleString()}`)
          }
          if (analysis.ai_response.confidence !== undefined) {
            console.log(`    • AI Confidence: ${analysis.ai_response.confidence}%`)
          }
          if (analysis.ai_response.features) {
            console.log(`    • Features Detected: ${analysis.ai_response.features.length}`)
          }
          if (analysis.ai_response.flip_comps) {
            console.log(`    • Has Flip Comps: Yes`)
          }
          if (analysis.ai_response.rental_comps) {
            console.log(`    • Has Rental Comps: Yes`)
          }
        }
        console.log('')
      })
      
      // Summary
      const completedCount = data.data.filter(a => a.status === 'completed').length
      const avgConfidence = data.data.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / data.data.length
      const avgProcessingTime = data.data.reduce((sum, a) => sum + (a.processing_time || 0), 0) / data.data.length
      
      console.log('📈 Summary Statistics:')
      console.log(`  - Completed: ${completedCount}/${data.data.length}`)
      console.log(`  - Average Confidence: ${avgConfidence.toFixed(1)}%`)
      console.log(`  - Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`)
      
    } else {
      console.log('❌ API Response failed:', data.message)
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message)
    console.log('\nNote: Make sure the development server is running on port 3001')
  }
}

testAIResponsesAPI()