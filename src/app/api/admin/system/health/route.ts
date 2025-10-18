import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check system health
    let status: 'healthy' | 'warning' | 'error' = 'healthy'
    const checks = []

    // Check database connection
    try {
      const { data, error } = await supabase.from('properties').select('count').limit(1)
      if (error) {
        status = 'warning'
        checks.push({ name: 'Database', status: 'error', message: error.message })
      } else {
        checks.push({ name: 'Database', status: 'healthy' })
      }
    } catch (error) {
      status = 'error'
      checks.push({ name: 'Database', status: 'error', message: 'Connection failed' })
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        status = 'error'
        checks.push({ name: `Environment: ${envVar}`, status: 'error', message: 'Missing' })
      } else {
        checks.push({ name: `Environment: ${envVar}`, status: 'healthy' })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
        checks,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      }
    })
  } catch (error) {
    console.error('System health check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check system health',
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          checks: [{ name: 'Health Check', status: 'error', message: 'System error' }]
        }
      },
      { status: 500 }
    )
  }
}
