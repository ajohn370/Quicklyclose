import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Pending Approvals API
 * Returns pricing revisions awaiting approval
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

    // Get pending pricing revisions with property details
    const { data: pendingApprovals, error } = await supabase
      .from('pricing_revisions')
      .select(`
        *,
        properties:property_id (
          address,
          property_type,
          listing_price
        ),
        created_by_profile:created_by (
          name,
          email
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending approvals:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch pending approvals'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: pendingApprovals || []
    })

  } catch (error) {
    console.error('Pending approvals API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch pending approvals'
    }, { status: 500 })
  }
}