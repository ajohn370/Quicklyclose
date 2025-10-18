import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Revision History API
 * Returns completed pricing revisions (approved/rejected/escalated)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated admin
    const admin = await getAuthenticatedAdmin(request)
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('pricing_revisions')
      .select(`
        *,
        properties:property_id (
          address,
          property_type
        )
      `)
      .neq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply status filter if specified
    if (statusFilter !== 'all') {
      query = query.eq('approval_status', statusFilter)
    }

    const { data: revisionHistory, error } = await query

    if (error) {
      console.error('Error fetching revision history:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch revision history'
      }, { status: 500 })
    }

    // Transform data to match component interface (already has approval_status)
    const transformedData = revisionHistory || []

    return NextResponse.json({
      success: true,
      data: transformedData
    })

  } catch (error) {
    console.error('Revision history API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch revision history'
    }, { status: 500 })
  }
}