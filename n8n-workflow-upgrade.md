# N8N Workflow Upgrade for AI Comp Vision

## Current Architecture
```
User uploads image → Next.js API → n8n webhook → Mock response
```

## Option 4 Architecture (Recommended)
```
User uploads image → Next.js API → n8n workflow → 
  ├── Google Vision API (property features)
  ├── OpenAI GPT-4V (condition assessment)
  ├── House Canary API (market data)
  └── Custom scoring algorithm → Response
```

## Implementation Steps

### 1. Set up APIs
```bash
# Add to your environment variables
GOOGLE_CLOUD_VISION_API_KEY=your_key
OPENAI_API_KEY=your_key  
HOUSE_CANARY_API_KEY=your_key
```

### 2. Update N8N Workflow Nodes

#### Node 1: Google Vision API
- Analyzes uploaded image for:
  - Property type (colonial, ranch, contemporary)
  - Exterior materials (brick, siding, stone)  
  - Architectural features
  - Overall condition indicators

#### Node 2: OpenAI GPT-4V Analysis
- Prompt: "Analyze this property image and provide condition assessment, estimated renovation needs, and market appeal score"
- Returns structured JSON with condition grades

#### Node 3: House Canary API
- Gets market comparables
- Property value estimates
- Neighborhood trends
- Rental estimates

#### Node 4: Custom Scoring Algorithm
- Combines vision data + market data
- Applies weighting based on local market conditions
- Generates confidence scores

### 3. Cost Estimation for Option 4
- Google Vision: ~$3 per 1000 images
- OpenAI GPT-4V: ~$0.03 per image
- House Canary API: ~$299/month base
- **Total: ~$400-600/month for 1000 analyses**

### 4. Implementation Timeline
- Week 1: Set up APIs and test endpoints
- Week 2: Build n8n workflow nodes
- Week 3: Integration testing with your existing system
- Week 4: A/B test against mock data

## Quick Start with Option 3
If you want something simpler first:

```typescript
// Add this to your n8n workflow
const houseCanaryData = await fetch('https://api.housecanary.com/v2/property/value', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${process.env.HOUSE_CANARY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([{
    address: `${street}, ${city}, ${state} ${zip}`,
    property_type: 'Single Family Residential'
  }])
});

const valuation = await houseCanaryData.json();
return {
  estimatedValue: valuation[0].property_value.value,
  confidence: valuation[0].property_value.confidence,
  flipComps: {
    after_repair_value: valuation[0].property_value.value * 1.15,
    // ... rest of your mock structure
  }
};
