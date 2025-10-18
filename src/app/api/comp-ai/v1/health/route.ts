import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Comp AI Service Health Check - Version 1
 */
export async function GET(request: NextRequest) {
  try {
    // Validate internal service authentication
    const authHeader = request.headers.get('authorization')
    const expectedServiceKey = process.env.COMP_AI_SERVICE_KEY || 'internal-service-key'
    
    if (!authHeader || authHeader !== `Bearer ${expectedServiceKey}`) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Invalid service authentication'
      }, { status: 401 })
    }

    // Check service dependencies
    const checks = {
      database: await checkDatabase(),
      n8n: await checkN8nService(),
      storage: await checkStorage(),
    }

    const allHealthy = Object.values(checks).every(check => check.healthy)
    
    const status = allHealthy ? 'healthy' : 'degraded'
    const uptime = process.uptime()

    return NextResponse.json({
      status,
      version: 'v1',
      uptime: Math.round(uptime),
      lastCheck: new Date().toISOString(),
      checks,
      capabilities: [
        'property_analysis',
        'flip_comps',
        'rental_comps',
        'similar_properties',
        'market_valuation'
      ]
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'unhealthy',
      version: 'v1',
      uptime: 0,
      lastCheck: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 500 })
  }
}

async function checkDatabase(): Promise<{ healthy: boolean; responseTime: number }> {
  const startTime = Date.now()
  
  try {
    // Simple database connectivity check
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      }
    })
    
    return {
      healthy: response.ok,
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime
    }
  }
}

async function checkN8nService(): Promise<{ healthy: boolean; responseTime: number }> {
  const startTime = Date.now()
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  
  if (!n8nWebhookUrl) {
    return {
      healthy: true, // Not required, so healthy by default
      responseTime: 0
    }
  }
  
  try {
    // Check if n8n webhook is accessible
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'GET',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    return {
      healthy: response.status < 500, // 4xx is acceptable, 5xx is not
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime
    }
  }
}

async function checkStorage(): Promise<{ healthy: boolean; responseTime: number }> {
  const startTime = Date.now()
  
  try {
    // Check Supabase storage accessibility
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      }
    })
    
    return {
      healthy: response.ok,
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime
    }
  }
}