# n8n Workflow Testing and Validation Guide

## Overview
Comprehensive testing procedures for the QuicklyClose Property Analysis Pipeline n8n workflow to ensure accuracy, reliability, and performance.

## Test Environment Setup

### Prerequisites
- n8n instance with workflow imported
- Google Gemini 2.5 Pro API access configured
- Zillow API credentials configured (`81cd51c088msh8cb80a7b27fe3c0p1dfacejsn12ac496`)
- Test property images and addresses prepared
- Monitoring tools configured

### Test Data Preparation

#### Sample Property Addresses (Schenectady, NY Market)
```json
{
  "testProperties": [
    {
      "id": "test_prop_1",
      "address": {
        "street": "456 Oak Street",
        "city": "Schenectady",
        "state": "NY",
        "zip": "12345"
      },
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
      "expectedRange": { "min": 200000, "max": 350000 },
      "propertyType": "Single Family",
      "description": "Standard cape cod style home"
    },
    {
      "id": "test_prop_2", 
      "address": {
        "street": "789 Maple Drive",
        "city": "Schenectady",
        "state": "NY",
        "zip": "12308"
      },
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
      "expectedRange": { "min": 250000, "max": 400000 },
      "propertyType": "Single Family",
      "description": "Colonial style home with updates"
    }
  ]
}
```

## Unit Tests

### 1. Webhook Trigger Test

#### Test Case: Valid Webhook Input
```json
{
  "testName": "webhook_valid_input",
  "method": "POST",
  "endpoint": "https://quicklyclose.app.n8n.cloud/webhook/quickly-close-property-analysis",
  "payload": {
    "imageUrl": "data:image/jpeg;base64,validBase64ImageData",
    "address": {
      "street": "123 Test Street",
      "city": "Schenectady",
      "state": "NY",
      "zip": "12345"
    },
    "requestId": "test-request-001",
    "userId": "test-user-001"
  },
  "expectedStatus": 200,
  "timeout": 120000
}
```

#### Test Case: Invalid Webhook Input
```json
{
  "testName": "webhook_invalid_input",
  "payload": {
    "imageUrl": "",
    "address": {
      "street": "",
      "city": "Schenectady"
    }
  },
  "expectedError": "Missing required fields"
}
```

### 2. Data Extraction Test

#### Validation Rules
```javascript
function validateExtractedData(data) {
  const validations = {
    addressComplete: data.address?.street && data.address?.city && data.address?.state && data.address?.zip,
    imageUrlPresent: data.imageUrl && data.imageUrl.length > 0,
    requestIdPresent: data.requestId && data.requestId.length > 0,
    fullAddressFormatted: data.address?.full && data.address?.full.includes(','),
    searchAddressFormatted: data.address?.search && !data.address?.search.includes(',')
  };

  return {
    isValid: Object.values(validations).every(v => v),
    details: validations
  };
}
```

### 3. API Integration Tests

#### Zillow API Tests
```javascript
const zillowApiTests = {
  propertyLookup: {
    endpoint: "search",
    testAddress: "456 Oak Street, Schenectady, NY",
    expectedFields: ["zpid", "zestimate", "price", "livingArea", "bedrooms", "bathrooms"],
    timeout: 30000
  },
  
  comparableSales: {
    endpoint: "search_sales", 
    testLocation: "Schenectady, NY",
    expectedFields: ["sales", "averageSoldPrice", "averageDaysOnMarket"],
    minResults: 1,
    timeout: 30000
  },
  
  marketTrends: {
    endpoint: "market_data",
    testLocation: "Schenectady, NY",
    expectedFields: ["appreciationRates", "marketTemperature"],
    timeout: 30000
  },
  
  rentalAnalysis: {
    endpoint: "rentals",
    testLocation: "Schenectady, NY", 
    expectedFields: ["marketRentEstimate", "rentRange", "vacancyRate"],
    timeout: 30000
  }
};
```

#### Google Gemini API Tests
```javascript
const geminiApiTests = {
  imageAnalysis: {
    model: "gemini-2.0-flash-exp",
    testImage: "validPropertyImageBase64",
    expectedFields: ["propertyFeatures", "characteristics", "conditionAssessment"],
    confidenceThreshold: 50,
    timeout: 45000
  },
  
  dataFusion: {
    model: "gemini-2.0-flash-exp",
    testPayload: "combinedDataFromAllSources",
    expectedFields: ["features", "estimatedValue", "confidence", "flipComps", "rentalComps"],
    timeout: 60000
  }
};
```

## Integration Tests

### End-to-End Workflow Test

#### Test Scenario 1: Complete Successful Analysis
```javascript
async function testCompleteWorkflow() {
  const testRequest = {
    imageUrl: "data:image/jpeg;base64,validImageData",
    address: {
      "street": "456 Oak Street",
      "city": "Schenectady", 
      "state": "NY",
      "zip": "12345"
    },
    requestId: "integration-test-001",
    userId: "test-user"
  };

  const startTime = Date.now();
  
  const webhookUrl = 'https://quicklyclose.app.n8n.cloud/webhook/quickly-close-property-analysis';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    return {
      success: response.ok,
      duration,
      result,
      validations: validateCompleteResponse(result)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function validateCompleteResponse(response) {
  return {
    hasFeatures: Array.isArray(response.features) && response.features.length > 0,
    hasEstimatedValue: typeof response.estimatedValue === 'number' && response.estimatedValue > 0,
    hasConfidence: typeof response.confidence === 'number' && response.confidence >= 0 && response.confidence <= 100,
    hasFlipComps: response.flipComps && typeof response.flipComps === 'object',
    hasRentalComps: response.rentalComps && typeof response.rentalComps === 'object',
    hasSimilarProperties: Array.isArray(response.similarProperties),
    valueInRange: response.estimatedValue >= 150000 && response.estimatedValue <= 500000 // Schenectady range
  };
}
```

### Performance Tests

#### Load Testing Configuration
```javascript
const loadTestConfig = {
  concurrent_users: 5,
  test_duration: "5m",
  requests_per_second: 2,
  acceptable_response_time: 120000, // 2 minutes
  success_rate_threshold: 95
};

async function runLoadTest() {
  const results = [];
  const requests = [];
  
  for (let i = 0; i < loadTestConfig.concurrent_users; i++) {
    requests.push(simulateUserRequests());
  }
  
  const loadTestResults = await Promise.allSettled(requests);
  
  return analyzeLoadTestResults(loadTestResults);
}
```

## Error Handling Tests

### API Failure Scenarios

#### Test Case: Zillow API Rate Limit
```javascript
const rateLimitTest = {
  description: "Handle Zillow API rate limiting",
  simulate: "Send multiple rapid requests",
  expectedBehavior: "Exponential backoff with retry logic",
  maxRetries: 3,
  expectedDelay: "Increasing delays between retries"
};
```

#### Test Case: Google Gemini API Error
```javascript
const geminiErrorTest = {
  description: "Handle Gemini API errors gracefully",
  scenarios: [
    "Invalid image format",
    "API quota exceeded", 
    "Network timeout",
    "Invalid API key"
  ],
  expectedBehavior: "Return appropriate error message without crashing workflow"
};
```

#### Test Case: Partial Data Failure
```javascript
const partialFailureTest = {
  description: "Handle partial API failures",
  scenario: "One Zillow API call fails, others succeed",
  expectedBehavior: "Continue processing with available data, mark confidence lower",
  minimumRequiredData: ["propertyBasicInfo", "geminiAnalysis"]
};
```

## Data Quality Validation

### Response Validation Schema
```javascript
const responseValidationSchema = {
  features: {
    type: "array",
    minItems: 1,
    items: {
      name: { type: "string", required: true },
      confidence: { type: "number", min: 0, max: 100, required: true }
    }
  },
  
  estimatedValue: {
    type: "number",
    min: 50000,
    max: 2000000,
    required: true
  },
  
  confidence: {
    type: "number", 
    min: 0,
    max: 100,
    required: true
  },
  
  flipComps: {
    type: "object",
    required: true,
    properties: {
      after_repair_value: { type: "number", min: 50000 },
      price_per_sqft: { type: "number", min: 50, max: 1000 },
      days_on_market: { type: "number", min: 0, max: 365 }
    }
  },
  
  rentalComps: {
    type: "object",
    required: true,
    properties: {
      market_rent_estimate: { type: "number", min: 500, max: 10000 },
      cap_rate: { type: "number", min: 0, max: 20 },
      vacancy_rate: { type: "number", min: 0, max: 50 }
    }
  },
  
  similarProperties: {
    type: "array",
    minItems: 0,
    maxItems: 10,
    items: {
      address: { type: "string", required: true },
      similarity: { type: "number", min: 0, max: 100, required: true },
      price: { type: "number", min: 0, required: true }
    }
  }
};
```

### Market Data Accuracy Tests
```javascript
function validateMarketData(response, location) {
  const schenectadyValidation = {
    priceRange: response.estimatedValue >= 150000 && response.estimatedValue <= 500000,
    rentRange: response.rentalComps?.market_rent_estimate >= 1200 && response.rentalComps?.market_rent_estimate <= 3500,
    propertyTaxes: response.rentalComps?.property_taxes >= 2000 && response.rentalComps?.property_taxes <= 8000,
    capRateRealistic: response.rentalComps?.cap_rate >= 3 && response.rentalComps?.cap_rate <= 15
  };
  
  return {
    isRealistic: Object.values(schenectadyValidation).every(v => v),
    details: schenectadyValidation
  };
}
```

## Monitoring and Analytics

### Performance Metrics
```javascript
const performanceMetrics = {
  responseTime: {
    target: "< 120 seconds",
    measurement: "End-to-end workflow completion time",
    alertThreshold: 180000 // 3 minutes
  },
  
  successRate: {
    target: "> 95%",
    measurement: "Percentage of successful completions", 
    alertThreshold: 90
  },
  
  dataQuality: {
    target: "> 90%",
    measurement: "Percentage of responses passing validation",
    alertThreshold: 85
  },
  
  apiUsage: {
    geminiTokens: "Track token consumption",
    zillowRequests: "Monitor API call volume",
    costPerAnalysis: "Calculate analysis cost"
  }
};
```

### Error Tracking
```javascript
const errorCategories = {
  webhookErrors: "Input validation failures",
  apiErrors: "External API failures (Zillow, Gemini)",
  dataParsingErrors: "JSON parsing or data extraction failures", 
  validationErrors: "Response validation failures",
  timeoutErrors: "Request timeout failures"
};
```

## Test Execution Schedule

### Automated Testing
```yaml
schedule:
  unit_tests:
    frequency: "Every code change"
    duration: "5 minutes"
    
  integration_tests:
    frequency: "Daily"
    duration: "30 minutes"
    
  load_tests:
    frequency: "Weekly"
    duration: "1 hour"
    
  end_to_end_tests:
    frequency: "Before deployment"
    duration: "15 minutes"
```

### Manual Testing Checklist
- [ ] Test with different property types (Colonial, Cape Cod, Ranch)
- [ ] Test with properties in different condition levels
- [ ] Verify comparable property similarity scoring accuracy
- [ ] Validate investment metrics calculations
- [ ] Test error recovery and graceful degradation
- [ ] Verify response format matches QuicklyClose requirements
- [ ] Test with edge cases (very high/low values, missing data)

## Test Results Documentation

### Test Report Template
```json
{
  "testRun": {
    "date": "2024-01-15T10:00:00Z",
    "version": "workflow-v1.0.0",
    "testEnvironment": "staging"
  },
  "results": {
    "unitTests": {
      "total": 25,
      "passed": 23,
      "failed": 2,
      "duration": "5m 23s"
    },
    "integrationTests": {
      "total": 15,
      "passed": 15,
      "failed": 0,
      "duration": "28m 45s"
    },
    "performanceTests": {
      "averageResponseTime": "89.5s",
      "successRate": "98.2%",
      "throughput": "2.1 requests/second"
    }
  },
  "issues": [
    {
      "id": "TEST-001",
      "severity": "medium",
      "description": "Occasional timeout on Zillow market trends API",
      "impact": "Reduces confidence score but doesn't fail analysis"
    }
  ]
}
```

This comprehensive testing guide ensures the n8n Property Analysis Pipeline delivers accurate, reliable results for QuicklyClose's real estate investment analysis needs.