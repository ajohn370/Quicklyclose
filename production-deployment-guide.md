# QuicklyClose n8n Integration - Production Deployment Guide

## 🎯 Overview

Complete guide for deploying the QuicklyClose n8n property analysis integration to production, including monitoring, error handling, and performance optimization.

## 📋 Pre-Deployment Checklist

### ✅ Database Setup
- [ ] Run `complete-schema-update.sql` in Supabase
- [ ] Verify `properties` table exists with proper RLS policies
- [ ] Verify `property_images` table created with indexes
- [ ] Confirm `property-images` storage bucket configured
- [ ] Test storage policies for image upload/access

### ✅ n8n Configuration
- [ ] Activate "QuicklyClose Property Analysis Pipeline" workflow
- [ ] Verify webhook URL: `quickly-close-property-analysis`
- [ ] Test webhook responds to POST requests
- [ ] Confirm Google Gemini API integration
- [ ] Verify Zillow API access and rate limits

### ✅ Environment Variables
- [ ] `N8N_API_KEY` - Production n8n API key
- [ ] `N8N_BASE_URL` - Production n8n instance URL
- [ ] `N8N_WEBHOOK_URL` - Production webhook endpoint
- [ ] `GOOGLE_API_KEY` - Google Generative AI API key
- [ ] `COMP_AI_SERVICE_KEY` - Internal service authentication

### ✅ Application Setup
- [ ] Seller portal image upload functionality
- [ ] Comp AI service integration
- [ ] MCP dashboard n8n monitoring
- [ ] Error handling and fallback logic
- [ ] Rate limiting and abuse prevention

## 🔧 Production Environment Setup

### Environment Variables (.env.production)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# n8n Configuration
N8N_API_KEY=your_production_n8n_api_key
N8N_BASE_URL=https://your-production.n8n.cloud
N8N_WEBHOOK_URL=https://your-production.n8n.cloud/webhook/quickly-close-property-analysis

# Google API Configuration
GOOGLE_API_KEY=your_google_api_key

# Service Configuration
COMP_AI_SERVICE_KEY=your_production_service_key

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_ANALYTICS=true
ERROR_REPORTING_URL=your_error_reporting_endpoint
```

### Vercel Deployment Configuration

#### vercel.json Updates
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "N8N_API_KEY": "@n8n_api_key",
    "N8N_BASE_URL": "@n8n_base_url", 
    "N8N_WEBHOOK_URL": "@n8n_webhook_url",
    "GOOGLE_API_KEY": "@google_api_key",
    "COMP_AI_SERVICE_KEY": "@comp_ai_service_key"
  }
}
```

#### Environment Variables in Vercel
```bash
# Set these in Vercel Dashboard > Settings > Environment Variables
vercel env add N8N_API_KEY production
vercel env add N8N_BASE_URL production  
vercel env add N8N_WEBHOOK_URL production
vercel env add GOOGLE_API_KEY production
vercel env add COMP_AI_SERVICE_KEY production
```

## 📊 Monitoring & Observability

### Performance Monitoring

#### API Response Times
- Comp AI Analysis: Target < 30s (due to n8n processing)
- Image Upload: Target < 5s
- Seller Form Submission: Target < 3s
- n8n Webhook: Target < 60s

#### Resource Monitoring
- Database connections and query performance
- Supabase storage usage and bandwidth
- n8n execution quotas and rate limits
- Google API quotas and billing

### Error Tracking

#### Critical Error Scenarios
1. **n8n Workflow Failures**
   - Webhook 404/500 errors
   - Workflow execution timeouts
   - Google API rate limit exceeded
   - Zillow API access denied

2. **Image Upload Failures**
   - File size/type validation errors
   - Supabase storage quota exceeded
   - Invalid user permissions
   - Network upload timeouts

3. **Database Issues**
   - RLS policy violations
   - Foreign key constraint failures
   - Connection pool exhaustion
   - Backup/recovery scenarios

### Logging Strategy

#### Log Levels
- **ERROR**: Critical failures requiring immediate attention
- **WARN**: Recoverable issues that need monitoring
- **INFO**: Normal operation events and metrics
- **DEBUG**: Detailed execution traces (development only)

#### Log Structure
```javascript
{
  timestamp: "2024-01-01T00:00:00Z",
  level: "INFO",
  service: "n8n-integration",
  operation: "property-analysis",
  requestId: "req_12345",
  userId: "user_67890",
  propertyId: "prop_abcde",
  executionTime: 25.5,
  success: true,
  metadata: {
    imageCount: 3,
    analysisType: "full",
    n8nExecutionId: "exec_xyz"
  }
}
```

## 🚨 Error Handling & Fallbacks

### n8n Workflow Failures

#### Graceful Degradation
1. **Primary**: n8n AI analysis with Gemini + Zillow
2. **Fallback 1**: Local AI analysis (if available)
3. **Fallback 2**: Enhanced mock data with property details
4. **Fallback 3**: Basic property information display

#### Implementation
```typescript
async function analyzeProperty(request: AnalysisRequest) {
  try {
    // Primary: n8n workflow
    const result = await analyzePropertyWithN8n(request)
    if (result.success) return result
  } catch (error) {
    logError('n8n-analysis-failed', error, request)
  }

  try {
    // Fallback: Enhanced mock analysis
    return generateEnhancedMockAnalysis(request)
  } catch (error) {
    logError('fallback-analysis-failed', error, request)
    throw new Error('Analysis service temporarily unavailable')
  }
}
```

### Image Upload Failures

#### Retry Logic
```typescript
async function uploadWithRetry(file: File, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadToSupabase(file)
    } catch (error) {
      if (attempt === maxRetries) throw error
      await delay(Math.pow(2, attempt) * 1000) // Exponential backoff
    }
  }
}
```

## 🔒 Security Considerations

### API Authentication
- Service-to-service authentication for comp AI calls
- Rate limiting on image upload endpoints
- Input validation and sanitization
- File type and size restrictions

### Data Privacy
- Image storage in secure Supabase bucket
- Automatic cleanup of temporary files
- GDPR compliance for EU users
- Audit logging for sensitive operations

### n8n Security
- Webhook authentication and validation
- API key rotation procedures
- Execution timeout limits
- Resource usage monitoring

## 📈 Performance Optimization

### Database Optimization
```sql
-- Index optimization for frequent queries
CREATE INDEX CONCURRENTLY idx_property_images_created_at_desc 
ON property_images (created_at DESC);

CREATE INDEX CONCURRENTLY idx_properties_status_created_at 
ON properties (status, created_at DESC);

-- Analyze query performance
ANALYZE property_images;
ANALYZE properties;
```

### Caching Strategy
- Image upload URLs cached for 1 hour
- Analysis results cached for 24 hours
- n8n workflow status cached for 5 minutes
- Database query results cached appropriately

### Resource Limits
```typescript
// Image upload limits
const IMAGE_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 6,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxDimensions: { width: 4096, height: 4096 }
}

// n8n execution limits
const N8N_LIMITS = {
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
  maxConcurrent: 5
}
```

## 🧪 Testing Strategy

### Production Testing Checklist

#### Smoke Tests
- [ ] Health endpoints responding
- [ ] Database connectivity working
- [ ] n8n webhook accessible
- [ ] Image upload basic functionality
- [ ] Authentication working

#### Integration Tests
- [ ] End-to-end seller flow
- [ ] Image upload and analysis
- [ ] Error handling scenarios
- [ ] Performance under load
- [ ] n8n workflow execution

#### Load Testing
```bash
# Artillery.js load test configuration
artillery run load-test-config.yml
```

### Monitoring Scripts

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh
curl -f https://your-domain.com/api/health || exit 1
curl -f https://your-production.n8n.cloud/healthz || exit 1
echo "Health checks passed"
```

#### Daily Validation
```bash
#!/bin/bash
# daily-validation.sh
node scripts/validate-n8n-flow.js --production
node scripts/test-seller-flow.js --production
```

## 📞 Incident Response

### Alert Thresholds
- Error rate > 5% in 5 minutes
- Response time > 30s for 3 consecutive requests
- n8n webhook failure rate > 10%
- Image upload failure rate > 15%

### Response Procedures
1. **Immediate**: Check service status dashboards
2. **5 minutes**: Analyze error logs and metrics
3. **15 minutes**: Implement temporary workarounds
4. **30 minutes**: Escalate to development team
5. **60 minutes**: Consider service degradation announcement

### Recovery Procedures
1. Identify root cause from logs and monitoring
2. Apply fix or enable fallback systems
3. Verify system recovery with health checks
4. Conduct post-incident review
5. Update documentation and procedures

## 🔄 Maintenance & Updates

### Regular Maintenance Tasks
- Weekly: Review error logs and performance metrics
- Monthly: Update dependencies and security patches
- Quarterly: Performance optimization review
- Annually: Security audit and penetration testing

### n8n Workflow Updates
1. Test changes in development environment
2. Create workflow backup before updates
3. Deploy changes during low-traffic periods
4. Monitor execution success rates post-deployment
5. Have rollback plan ready

### Database Maintenance
```sql
-- Monthly maintenance tasks
VACUUM ANALYZE property_images;
VACUUM ANALYZE properties;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes;

-- Monitor storage usage
SELECT pg_size_pretty(pg_total_relation_size('property_images'));
```

This production deployment guide ensures robust, monitored, and maintainable n8n integration for QuicklyClose property analysis.