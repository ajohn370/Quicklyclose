import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-rbac'
import { PricingWorkflowManager } from '@/lib/pricing-workflow'

export const dynamic = 'force-dynamic'

/**
 * Pricing Revisions API
 * Handles creation and management of pricing revisions
 */
export async function POST(request: NextRequest) {
  try {
    const { user, hasPermission, error } = await requirePermission(request, 'pricing.revise')
    
    if (!user || !hasPermission) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const body = await request.json()
    const { 
      property_id, 
      previous_offer, 
      new_offer, 
      reason,
      confidence_adjustment,
      market_adjustment,
      profit_margin_override
    } = body

    // Validate required fields
    if (!property_id || !previous_offer || !new_offer || !reason) {
      return NextResponse.json({
        success: false,
        message: 'Property ID, previous offer, new offer, and reason are required'
      }, { status: 400 })
    }

    // Validate offer amounts
    if (new_offer <= 0 || previous_offer <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Offer amounts must be positive'
      }, { status: 400 })
    }

    // Create the pricing revision
    const result = await PricingWorkflowManager.createRevision(
      property_id,
      {
        previous_offer,
        new_offer,
        reason,
        confidence_adjustment,
        market_adjustment,
        profit_margin_override
      },
      user.id
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to create pricing revision'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.revision,
      message: result.revision?.approval_status === 'approved' 
        ? 'Pricing revision auto-approved and applied'
        : 'Pricing revision created and pending approval'
    })

  } catch (error) {
    console.error('Pricing revisions API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process pricing revision'
    }, { status: 500 })
  }
}

/**
 * Get pricing revisions (for admin dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, hasPermission, error } = await requirePermission(request, 'pricing.view')
    
    if (!user || !hasPermission) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get pending approvals for this user
    const pendingApprovals = await PricingWorkflowManager.getPendingApprovals(user.id)

    // If property_id specified, get history for that property
    let revisionHistory: any[] = []
    if (propertyId) {
      revisionHistory = await PricingWorkflowManager.getPricingHistory(propertyId)
    }

    return NextResponse.json({
      success: true,
      data: {
        pending_approvals: pendingApprovals,
        revision_history: revisionHistory,
        summary: {
          pending_count: pendingApprovals.length,
          total_revisions: revisionHistory.length
        }
      }
    })

  } catch (error) {
    console.error('Get pricing revisions API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch pricing revisions'
    }, { status: 500 })
  }
}