# Google Gemini 2.5 Pro Integration Guide for QuicklyClose Property Analysis

## Overview
This document provides detailed configuration and implementation guidance for integrating Google Gemini 2.5 Pro into the QuicklyClose property analysis workflow via n8n.

## API Configuration

### Authentication
- **API Type**: Google Generative AI API
- **Authentication Method**: API Key
- **Model**: `gemini-2.0-flash-exp` (Latest with vision capabilities)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

### Required Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_GOOGLE_AI_API_KEY"
}
```

## Stage 1: Primary Property Image Analysis

### Purpose
Initial analysis of property images to extract visual features, assess condition, and estimate property characteristics.

### Request Configuration
```json
{
  "contents": [{
    "parts": [{
      "text": "PROMPT_TEXT_HERE",
      "inline_data": {
        "mime_type": "image/jpeg",
        "data": "BASE64_IMAGE_DATA"
      }
    }]
  }],
  "generationConfig": {
    "temperature": 0.2,
    "topK": 40,
    "topP": 0.8,
    "maxOutputTokens": 2048
  }
}
```

### Primary Analysis Prompt
```
Analyze this property image for real estate investment purposes and provide a comprehensive assessment.

Property Address: {{address.full}}

You are an expert real estate analyst. Analyze this property image and provide detailed insights in JSON format only.

Required Analysis:

1. PROPERTY FEATURES (Array of objects with name and confidence 0-100):
   - Architectural style (Colonial, Ranch, Cape Cod, Victorian, etc.)
   - Exterior materials (Brick, Vinyl, Wood, Stone, etc.)
   - Roofing type and condition
   - Windows and doors condition
   - Landscaping and curb appeal
   - Garage type and size
   - Special features (porch, deck, pool, etc.)

2. PROPERTY CHARACTERISTICS:
   - Estimated square footage
   - Estimated number of bedrooms
   - Estimated number of bathrooms
   - Property type (Single Family, Multi-Family, Townhouse, etc.)
   - Approximate age/era of construction
   - Lot size assessment

3. CONDITION ASSESSMENT:
   - Overall condition (Excellent, Good, Fair, Poor)
   - Renovation needs (None, Light, Moderate, Heavy)
   - Specific repair items visible
   - Estimated repair cost range
   - Market appeal score (1-10)
   - Move-in readiness

4. INVESTMENT ANALYSIS:
   - Fix and flip potential (High, Medium, Low)
   - Rental property suitability
   - Target buyer demographic
   - Market positioning
   - Unique selling points
   - Potential concerns or red flags

Return ONLY valid JSON in this exact structure:
{
  "propertyFeatures": [
    {"name": "feature_name", "confidence": 85}
  ],
  "characteristics": {
    "estimatedSqft": 1650,
    "estimatedBedrooms": 3,
    "estimatedBathrooms": 2,
    "propertyType": "Single Family",
    "approximateAge": "1960s",
    "lotSizeAssessment": "Average suburban lot"
  },
  "conditionAssessment": {
    "overallCondition": "Good",
    "renovationNeeds": "Light",
    "repairItems": ["Paint touch-up", "Minor landscaping"],
    "repairCostRange": "$5,000-$15,000",
    "marketAppeal": 7,
    "moveInReady": true
  },
  "investmentAnalysis": {
    "fixFlipPotential": "Medium",
    "rentalSuitability": "High",
    "targetBuyer": "First-time homebuyers, young families",
    "marketPositioning": "Entry-level family home",
    "sellingPoints": ["Established neighborhood", "Good bones"],
    "concerns": ["Needs cosmetic updates"]
  }
}
```

### Response Processing
```javascript
// Extract and parse Gemini response
const geminiResponse = response.json.candidates[0].content.parts[0].text;
const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
const propertyAnalysis = JSON.parse(jsonMatch[0]);
```

## Stage 2: Data Fusion and Investment Analysis

### Purpose
Combine visual property analysis with Zillow market data to create comprehensive investment insights and accurate valuations.

### Enhanced Analysis Prompt
```
You are a senior real estate investment analyst with access to comprehensive market data. Your task is to combine visual property analysis with current market data to provide institutional-quality investment insights.

ANALYSIS INPUTS:

PROPERTY VISUAL ANALYSIS:
{{geminiPropertyAnalysis}}

ZILLOW PROPERTY DATA:
{{zillowPropertyData}}

ZILLOW COMPARABLE SALES (Last 6 months, 0.5 mile radius):
{{zillowComparableSales}}

ZILLOW MARKET TRENDS:
{{zillowMarketTrends}}

ZILLOW RENTAL DATA:
{{zillowRentalData}}

ANALYSIS REQUIREMENTS:

Provide comprehensive investment analysis by combining all data sources. Focus on accuracy, market context, and actionable insights.

1. ENHANCED VALUATION:
   - Cross-validate visual assessment with market data
   - Calculate ARV based on condition and comparable sales
   - Provide current market value range
   - Adjust estimates for property condition differences
   - Calculate price per square foot analysis

2. INVESTMENT METRICS:
   - Fix & Flip Analysis: Detailed ROI calculations
   - Rental Analysis: Cap rates, cash flow projections
   - Market timing assessment
   - Risk-adjusted return estimates
   - Exit strategy recommendations

3. COMPARABLE PROPERTIES ANALYSIS:
   - Rank ALL Zillow comparables by relevance
   - Calculate similarity scores (0-100)
   - Adjust comparable prices for:
     * Sale timing (market appreciation)
     * Condition differences
     * Feature variations
   - Provide weighted average pricing

4. MARKET CONTEXT:
   - Current market conditions vs historical
   - Neighborhood trends and outlook
   - Seasonal factors affecting pricing
   - Competition analysis
   - Investment timing recommendations

5. RISK ASSESSMENT:
   - Market volatility indicators
   - Property-specific risks
   - Renovation complexity assessment
   - Liquidity considerations
   - Economic sensitivity analysis

Return ONLY valid JSON in this exact structure for QuicklyClose integration:

{
  "features": [
    {"name": "Architectural_Style", "confidence": 95},
    {"name": "Exterior_Material", "confidence": 88}
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
    "neighborhood_trends": "Stable with 3% annual appreciation based on Zillow data",
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
      "bathrooms": 2,
      "saleDate": "2024-01-15",
      "daysOnMarket": 28,
      "adjustedPrice": 282000
    }
  ],
  "marketAnalysis": {
    "currentTrends": "Market showing stability with modest growth",
    "appreciationRate": "3.2% annually based on 3-year data",
    "marketVelocity": "Properties selling in 30-45 days average",
    "priceRange": "$260,000 - $310,000 for similar properties",
    "investmentTiming": "Favorable - stable market with growth potential",
    "riskLevel": "Low to Medium"
  },
  "investmentSummary": {
    "overallScore": 7.5,
    "bestUseCase": "Buy and hold rental",
    "keyStrengths": ["Stable neighborhood", "Good rental demand", "Reasonable pricing"],
    "primaryConcerns": ["Needs minor updates", "Moderate competition"],
    "recommendedStrategy": "Purchase for rental income with potential appreciation"
  }
}

CRITICAL: Ensure all numerical values are realistic for the Schenectady, NY market (typically $200,000-$350,000 range). Base estimates on actual Zillow data provided, not generic assumptions.
```

## Configuration Parameters

### Generation Config for Property Analysis
```json
{
  "temperature": 0.2,
  "topK": 40,
  "topP": 0.8,
  "maxOutputTokens": 2048,
  "stopSequences": []
}
```

### Generation Config for Data Fusion
```json
{
  "temperature": 0.1,
  "topK": 30,
  "topP": 0.7,
  "maxOutputTokens": 4096,
  "stopSequences": []
}
```

## Error Handling

### Common Issues and Solutions

#### 1. JSON Parsing Errors
```javascript
// Robust JSON extraction
function extractJSON(response) {
  try {
    const text = response.candidates[0].content.parts[0].text;
    
    // Find JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    // Clean and parse
    const jsonText = jsonMatch[0]
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
}
```

#### 2. API Rate Limiting
```javascript
// Exponential backoff implementation
async function callGeminiWithRetry(payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error(`API error: ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
}
```

#### 3. Image Processing Issues
```javascript
// Image validation and preprocessing
function validateImage(imageData) {
  // Check if base64 encoded
  if (imageData.startsWith('data:image/')) {
    return imageData.split(',')[1];
  }
  
  // Check if URL
  if (imageData.startsWith('http')) {
    // Convert URL to base64 (implement as needed)
    return convertUrlToBase64(imageData);
  }
  
  // Assume already base64
  return imageData;
}
```

## Performance Optimization

### Best Practices

1. **Prompt Optimization**
   - Keep prompts concise but specific
   - Use structured output formatting
   - Include clear examples
   - Specify JSON schema requirements

2. **Response Caching**
   - Cache similar property analyses
   - Store market data for reuse
   - Implement TTL for data freshness

3. **Parallel Processing**
   - Run Gemini analysis concurrently with Zillow calls
   - Process multiple properties simultaneously
   - Optimize for throughput

4. **Cost Management**
   - Monitor token usage
   - Optimize prompt length
   - Use appropriate model variants
   - Implement usage tracking

## Testing and Validation

### Test Cases

#### 1. Standard Property Analysis
```json
{
  "testCase": "standard_property",
  "input": {
    "imageUrl": "sample_property_image.jpg",
    "address": {
      "street": "123 Test Street",
      "city": "Schenectady",
      "state": "NY",
      "zip": "12345"
    }
  },
  "expectedOutput": {
    "features": "Array of features with confidence scores",
    "estimatedValue": "Reasonable estimate for area",
    "confidence": "High confidence score (80+)"
  }
}
```

#### 2. Poor Quality Image
```json
{
  "testCase": "poor_image_quality",
  "input": {
    "imageUrl": "blurry_property_image.jpg"
  },
  "expectedOutput": {
    "confidence": "Lower confidence score (60-)"
  }
}
```

#### 3. Edge Cases
- Missing property features
- Unusual architectural styles
- Properties needing major renovation
- Multi-family properties
- Commercial properties

### Validation Metrics

1. **Accuracy**: Compare estimates to actual market values
2. **Consistency**: Same property should get similar results
3. **Response Time**: Average processing time per analysis
4. **Error Rate**: Percentage of failed analyses
5. **Cost Efficiency**: Token usage per analysis

## Integration with n8n Workflow

### Node Configuration

```json
{
  "name": "Google Gemini Property Analysis",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "googleApiKeyAuth",
    "sendBody": true,
    "bodyContentType": "json",
    "jsonBody": "PROMPT_PAYLOAD_HERE",
    "options": {
      "timeout": 45000,
      "retry": {
        "enabled": true,
        "maxRetries": 3
      }
    }
  }
}
```

### Data Flow

1. **Input**: Property image and address from QuicklyClose
2. **Processing**: Gemini analysis of visual features
3. **Fusion**: Combine with Zillow market data
4. **Output**: Comprehensive analysis for QuicklyClose system

This integration transforms QuicklyClose from mock data to real AI-powered property analysis using Google's most advanced vision and language model.