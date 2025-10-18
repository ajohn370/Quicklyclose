import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Reject Pricing Revision API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> }
) {
  try {
    // Check if user is authenticated admin
    const admin = await getAuthenticatedAdmin(request)
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 })
    }

    const { revisionId } = await params
    const { notes } = await request.json()

    // Update the pricing revision status to rejected
    const { data: revision, error: updateError } = await supabase
      .from('pricing_revisions')
      .update({
        approval_status: 'rejected',
        approved_by: admin.adminProfile.id,
        approved_at: new Date().toISOString(),
        rejection_reason: notes || 'Rejected via admin dashboard'
      })
      .eq('id', revisionId)
      .eq('approval_status', 'pending') // Only reject if still pending
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting revision:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to reject revision'
      }, { status: 500 })
    }

    if (!revision) {
      return NextResponse.json({
        success: false,
        message: 'Revision not found or not pending'
      }, { status: 404 })
    }

    // Log admin activity
    const { error: activityError } = await supabase
      .from('admin_activities')
      .insert({
        admin_id: admin.adminProfile.id,
        action: 'pricing_revision_rejected',
        resource_type: 'pricing_revision',
        resource_id: revisionId,
        details: {
          revision_id: revisionId,
          property_id: revision.property_id,
          previous_offer: revision.previous_offer,
          new_offer: revision.new_offer,
          notes: notes
        },
        created_at: new Date().toISOString()
      })

    if (activityError) {
      console.error('Error logging admin activity:', activityError)
      // Don't fail the request for logging errors
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing revision rejected successfully',
      data: revision
    })

  } catch (error) {
    console.error('Reject revision API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to reject revision'
    }, { status: 500 })
  }
}