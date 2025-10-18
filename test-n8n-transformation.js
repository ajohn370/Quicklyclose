// Removed TypeScript import since we're testing the transformation logic directly

// Mock the actual n8n response data from the test above
const mockN8nResponse = {
  "features": [
    {
      "name": "Architectural_Style",
      "confidence": 95
    }
  ],
  "estimatedValue": 285000,
  "confidence": 92,
  "flipComps": {
    "after_repair_value": 350000,
    "price_per_sqft": 175,
    "days_on_market": 35,
    "sale_to_list_ratio": 0.96,
    "renovation_grade": "Light to Moderate",
    "recent_sales": [],
    "lot_size": 0.25,
    "zoning_potential": "R1 Single Family",
    "neighborhood_trends": "Stable with 3% annual appreciation",
    "property_type_match": "Single Family Home"
  },
  "rentalComps": {
    "market_rent_estimate": 2200,
    "rent_to_price_ratio": 0.0077,
    "cap_rate": 7.2,
    "vacancy_rate": 4.5,
    "tenant_turnover": "Low - stable neighborhood",
    "crime_rate": "Below average",
    "school_district_quality": "Good - B+ rating",
    "transit_employment_access": "Good - 20min to downtown",
    "hoa_fees": 0,
    "property_taxes": 4200
  },
  "similarProperties": [
    {
      "id": "comp-1",
      "address": "123 Oak Street, Schenectady, NY",
      "similarity": 94,
      "price": 275000,
      "image": "/api/placeholder/150/100",
      "property_type": "Single Family",
      "sqft": 1650,
      "bedrooms": 3,
      "bathrooms": 2
    }
  ],
  "requestId": "unknown",
  "processingTimestamp": "2025-08-22T08:12:33.121Z",
  "dataSourceAttribution": {
    "geminiAnalysis": "Google Gemini 2.5 Pro",
    "marketData": "Zillow API",
    "processingEngine": "n8n Workflow"
  }
};

console.log('🔄 Testing n8n Response Transformation');
console.log('=' + '='.repeat(50));

// Test the transformation logic
async function testTransformation() {
  const request = {
    imageUrl: "https://example.com/test.jpg",
    address: {
      street: "132 Point Of Woods Drive",
      city: "Albany",
      state: "NY",
      zip: "12201"
    },
    requestId: "test-123",
    userId: "test-user"
  };

  try {
    // Mock fetch to return our test data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockN8nResponse),
      })
    );

    const result = await n8nService.executePropertyAnalysis(request);
    
    console.log('✅ Transformation Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Validate structure
    console.log('\n🔍 Validation:');
    console.log(`  • success: ${result.success ? '✅' : '❌'}`);
    console.log(`  • has data: ${result.data ? '✅' : '❌'}`);
    console.log(`  • has propertyAnalysis: ${result.data?.propertyAnalysis ? '✅' : '❌'}`);
    console.log(`  • has marketAnalysis: ${result.data?.propertyAnalysis?.marketAnalysis ? '✅' : '❌'}`);
    console.log(`  • estimated value: ${result.data?.propertyAnalysis?.marketAnalysis?.estimatedValue || 'Missing'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Since we're not in a Node.js module environment, let's simulate the transformation manually
function simulateTransformation() {
  const rawData = mockN8nResponse;
  const request = {
    address: {
      street: "132 Point Of Woods Drive",
      city: "Albany", 
      state: "NY",
      zip: "12201"
    }
  };

  const transformedData = {
    success: true,
    data: {
      propertyAnalysis: {
        // Map address if available
        address: rawData.address || request.address,
        
        // Map Gemini AI analysis
        geminiAnalysis: rawData.ai_analysis || {
          propertyCondition: rawData.property_condition || 'Good',
          estimatedAge: rawData.property_age || 'Unknown',
          architecturalStyle: rawData.architectural_style || 'Unknown',
          curbAppeal: rawData.curb_appeal || 'Good',
          maintenanceNeeds: rawData.maintenance_needs || 'Minor updates needed',
          keyFeatures: rawData.key_features || rawData.features || [],
          suggestedImprovements: rawData.suggested_improvements || [],
          marketReadiness: rawData.market_readiness || 'Ready'
        },
        
        // Map Zillow data
        zillowData: rawData.zillow_data || {
          zestimate: rawData.estimatedValue || rawData.zestimate || 0,
          rentZestimate: rawData.rentalComps?.market_rent_estimate || rawData.rent_estimate || 0,
          propertyType: rawData.property_type || 'Single Family',
          yearBuilt: rawData.year_built || null,
          lotSize: rawData.flipComps?.lot_size || rawData.lot_size || null,
          finishedSqFt: rawData.sqft || rawData.square_feet || null,
          bedrooms: rawData.bedrooms || null,
          bathrooms: rawData.bathrooms || null,
          lastSoldDate: rawData.last_sold_date || null,
          lastSoldPrice: rawData.last_sold_price || null
        },
        
        // Map comparables from similarProperties
        comparables: (rawData.similarProperties || []).map((comp) => ({
          address: comp.address || 'Unknown',
          soldPrice: comp.price || 0,
          soldDate: comp.sold_date || new Date().toISOString(),
          sqft: comp.sqft || null,
          bedrooms: comp.bedrooms || null,
          bathrooms: comp.bathrooms || null,
          type: 'similar'
        })),
        
        // Map market analysis
        marketAnalysis: {
          estimatedValue: rawData.estimatedValue || 0,
          valueRangeLow: rawData.value_range_low || (rawData.estimatedValue ? rawData.estimatedValue * 0.9 : 0),
          valueRangeHigh: rawData.value_range_high || (rawData.estimatedValue ? rawData.estimatedValue * 1.1 : 0),
          daysOnMarket: rawData.flipComps?.days_on_market || rawData.days_on_market || 30,
          marketTrend: rawData.market_trend || rawData.flipComps?.neighborhood_trends || 'Stable',
          neighborhoodGrowth: rawData.neighborhood_growth || 'Unknown',
          investmentScore: rawData.investment_score || rawData.confidence || 0,
          cashFlowPotential: rawData.cash_flow_potential || 'Unknown'
        },
        
        // Map AI recommendations
        aiRecommendation: {
          quickSalePrice: rawData.quick_sale_price || (rawData.estimatedValue ? rawData.estimatedValue * 0.95 : 0),
          optimalListPrice: rawData.optimal_list_price || rawData.flipComps?.after_repair_value || rawData.estimatedValue || 0,
          repairCosts: rawData.repair_costs || 0,
          timeToSell: rawData.time_to_sell || '2-4 weeks',
          confidence: rawData.confidence ? `${rawData.confidence}%` : 'High',
          summary: rawData.summary || rawData.recommendation || 'Property analysis complete. Please review the details above.'
        }
      }
    },
    executionId: rawData.executionId || rawData.execution_id || `n8n-${Date.now()}`
  };

  console.log('✅ Simulated Transformation Result:');
  console.log(JSON.stringify(transformedData, null, 2));
  
  // Validate structure
  console.log('\n🔍 Validation:');
  console.log(`  • success: ${transformedData.success ? '✅' : '❌'}`);
  console.log(`  • has data: ${transformedData.data ? '✅' : '❌'}`);
  console.log(`  • has propertyAnalysis: ${transformedData.data?.propertyAnalysis ? '✅' : '❌'}`);
  console.log(`  • has marketAnalysis: ${transformedData.data?.propertyAnalysis?.marketAnalysis ? '✅' : '❌'}`);
  console.log(`  • estimated value: $${transformedData.data?.propertyAnalysis?.marketAnalysis?.estimatedValue?.toLocaleString() || 'Missing'}`);
  console.log(`  • comparable count: ${transformedData.data?.propertyAnalysis?.comparables?.length || 0}`);
  console.log(`  • optimal list price: $${transformedData.data?.propertyAnalysis?.aiRecommendation?.optimalListPrice?.toLocaleString() || 'Missing'}`);
  console.log(`  • confidence: ${transformedData.data?.propertyAnalysis?.aiRecommendation?.confidence || 'Missing'}`);

  return transformedData;
}

simulateTransformation();