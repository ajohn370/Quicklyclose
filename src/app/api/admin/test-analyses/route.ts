import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to check if analyses can be fetched
 * GET /api/admin/test-analyses
 */
export async function GET(request: NextRequest) {
  try {
    // Check if service role key is configured
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!hasServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured',
        message: 'Please add SUPABASE_SERVICE_ROLE_KEY to your Vercel environment variables'
      }, { status: 500 })
    }

    // Try to use service role client
    const { createClient: createServiceClient } = require('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // Fetch analyses without any auth checks
    const { data: analyses, error } = await supabaseService
      .from('comp_vision_analyses')
      .select('id, address, city, state, estimated_value, confidence, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: analyses || [],
      count: analyses?.length || 0,
      message: 'Test successful - service role access working'
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}