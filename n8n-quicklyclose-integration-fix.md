# n8n QuicklyClose Integration Fix

## Current Integration Issues

### 1. Webhook URL Configuration
- **Issue**: The n8n workflow webhook endpoint needs to be properly configured in QuicklyClose environment
- **Current**: `N8N_WEBHOOK_URL` environment variable is referenced but not set
- **Solution**: Set the webhook URL to point to your n8n instance

### 2. Admin-Only Access
- **Current**: Analysis results are stored in database and shown in admin comp-vision component only
- **Approach**: Property analysis remains admin-only functionality
- **Access**: Available at `/comp-vision` for authorized admin users

## Integration Flow Analysis

### Current Architecture
```
Admin Comp Vision Component (/comp-vision)
    ↓ (admin submits property image)
API Endpoint (/api/comp-vision/analyze)
    ↓ (calls comp AI service)
Comp AI Service (/api/comp-ai/v1/analyze) 
    ↓ (webhook call)
n8n Workflow (if N8N_WEBHOOK_URL is configured)
    ↓ (returns analysis)
Database (comp_vision_analyses table)
```

### Required Changes

#### 1. Environment Configuration
Set the n8n webhook URL in your deployment:

```bash
# Production n8n webhook URL
N8N_WEBHOOK_URL=https://quicklyclose.app.n8n.cloud/webhook/quickly-close-property-analysis
```

#### 2. Update n8n Workflow Webhook Path
The current workflow expects this exact webhook path:
- Path: `quickly-close-property-analysis`
- Full URL: `https://quicklyclose.app.n8n.cloud/webhook/quickly-close-property-analysis`

#### 3. Admin Access Only

Property analysis is restricted to admin users only:

1. **Admin Authentication Required** - Only authorized admin users can access
2. **Dedicated Admin Portal** - Available at `/comp-vision` endpoint
3. **Database Storage** - Results stored in `comp_vision_analyses` table
4. **No Public Access** - Marketing page does not include analysis functionality

## Implementation Steps

### Step 1: Configure n8n Webhook URL
Set your environment variable in Vercel/deployment:
```
N8N_WEBHOOK_URL=https://quicklyclose.app.n8n.cloud/webhook/quickly-close-property-analysis
```

### Step 2: Admin Access Configuration
Ensure admin users can access the property analysis functionality:

- **Admin Portal**: `/comp-vision` route is available for admin users
- **Authentication**: Admin emails configured in the system
- **Component**: `CompVision` component handles admin-only analysis
- **No Public Access**: Marketing page remains focused on lead generation

### Step 3: Webhook Validation
Ensure your n8n webhook can receive the expected payload:

```json
{
  "imageUrl": "https://supabase-storage-url/property-image.jpg",
  "address": {
    "street": "123 Main Street",
    "city": "Schenectady", 
    "state": "NY",
    "zip": "12345"
  },
  "requestId": "uuid-request-id"
}
```

### Step 4: Test the Integration
1. Deploy the updated code with `N8N_WEBHOOK_URL` configured
2. Login as an admin user
3. Navigate to `/comp-vision` admin portal
4. Upload a property image and fill address form
5. Verify the analysis request flows to n8n
6. Check that results are returned and displayed in admin interface

## Webhook Response Format
The n8n workflow should return exactly this format for QuicklyClose compatibility:

```json
{
  "features": [
    {"name": "Cape Cod Style", "confidence": 95},
    {"name": "Vinyl Siding", "confidence": 88}
  ],
  "estimatedValue": 285000,
  "confidence": 92,
  "flipComps": {
    "after_repair_value": 325000,
    "price_per_sqft": 175,
    "days_on_market": 35,
    "renovation_grade": "Light",
    "neighborhood_trends": "Stable with 3.2% appreciation"
  },
  "rentalComps": {
    "market_rent_estimate": 2200,
    "cap_rate": 6.8,
    "vacancy_rate": 4.5,
    "school_district_quality": "Good",
    "property_taxes": 4200
  },
  "similarProperties": [
    {
      "id": "comp-1",
      "address": "456 Oak Street, Schenectady, NY",
      "similarity": 94,
      "price": 275000,
      "image": "/api/placeholder/150/100",
      "property_type": "Single Family",
      "sqft": 1650,
      "bedrooms": 3,
      "bathrooms": 2
    }
  ]
}
```

## Testing Checklist
- [ ] n8n webhook URL is configured in environment
- [ ] n8n workflow imports successfully 
- [ ] Webhook trigger receives POST requests correctly
- [ ] Google Gemini API key is configured in n8n
- [ ] Zillow API credentials are configured in n8n
- [ ] Test image analysis completes successfully
- [ ] Response format matches QuicklyClose schema
- [ ] Results display correctly in admin comp-vision portal
- [ ] Analysis data is saved to database
- [ ] Error handling works for API failures

## Common Issues & Solutions

### Issue: n8n Webhook Not Receiving Requests
**Solution**: 
- Check n8n instance is accessible
- Verify webhook URL is correct
- Ensure n8n workflow is active
- Check firewall/security settings

### Issue: Google Gemini API Errors
**Solution**:
- Verify API key is valid and has quota
- Check image format is supported (JPEG/PNG)
- Ensure base64 encoding is correct

### Issue: Zillow API Rate Limiting
**Solution**:
- Implement retry logic in n8n (already included in workflow)
- Consider caching frequent requests
- Monitor API usage limits

### Issue: Response Format Mismatch
**Solution**:
- Verify n8n workflow returns exact JSON schema
- Check data validation in QuicklyClose
- Test with sample responses

This integration will transform QuicklyClose from using mock data to providing real AI-powered property analysis via the n8n workflow with Google Gemini and Zillow API.