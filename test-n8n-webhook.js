// Test script to create a sample analysis record via n8n webhook
const testData = {
  requestId: `test-${Date.now()}`,
  userId: 'test-user-id',
  address: {
    street: '126 Rosemont Street',
    city: 'Albany',
    state: 'NY',
    zip: '12203'
  },
  estimated_value: 285000,
  confidence: 92,
  flip_comps: {
    after_repair_value: 315000,
    price_per_sqft: 185,
    days_on_market: 35,
    sale_to_list_ratio: 0.97
  },
  rental_comps: {
    market_rent_estimate: 2200,
    rent_to_price_ratio: 0.09,
    cap_rate: 7.2,
    vacancy_rate: 4.1
  },
  similar_properties: [
    {
      address: '128 Rosemont Street, Albany, NY',
      sale_price: 278000,
      sold_date: '2024-01-15',
      sqft: 1650,
      bedrooms: 3,
      bathrooms: 2
    },
    {
      address: '130 Pine Street, Albany, NY',
      sale_price: 295000,
      sold_date: '2024-02-20',
      sqft: 1720,
      bedrooms: 3,
      bathrooms: 2.5
    }
  ],
  features: [
    { name: 'Colonial Style', confidence: 94 },
    { name: 'Vinyl Siding', confidence: 88 },
    { name: 'Two-Story', confidence: 91 }
  ],
  ai_analysis: {
    property_condition: 'Good',
    architectural_style: 'Colonial',
    curb_appeal: 'Good',
    maintenance_needs: 'Minor cosmetic updates recommended',
    market_readiness: 'Ready for market'
  }
}

console.log('Testing n8n webhook with data:', JSON.stringify(testData, null, 2))

// Test locally first
fetch('http://localhost:3000/api/webhooks/n8n-analysis', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Local test result:', data)
  
  // If local test works, test on production
  if (data.success) {
    console.log('Testing on production...')
    return fetch('https://quickly-close-app.vercel.app/api/webhooks/n8n-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
  }
})
.then(response => response?.json())
.then(data => {
  if (data) {
    console.log('Production test result:', data)
  }
})
.catch(error => {
  console.error('Test failed:', error)
})