import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-rbac'
import { PricingWorkflowManager } from '@/lib/pricing-workflow'

export const dynamic = 'force-dynamic'

/**
 * Pricing Approval API
 * Handles approval, rejection, and escalation of pricing revisions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> }
) {
  try {
    const { user, hasPermission, error } = await requirePermission(request, 'pricing.approve')
    
    if (!user || !hasPermission) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const { revisionId } = await params
    const body = await request.json()
    const { decision, reason } = body

    // Validate decision
    if (!['approve', 'reject', 'escalate'].includes(decision)) {
      return NextResponse.json({
        success: false,
        message: 'Decision must be approve, reject, or escalate'
      }, { status: 400 })
    }

    // Validate reason for rejection/escalation
    if ((decision === 'reject' || decision === 'escalate') && !reason?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Reason is required for rejection or escalation'
      }, { status: 400 })
    }

    // Process the approval
    const result = await PricingWorkflowManager.processApproval(
      revisionId,
      decision,
      user.id,
      reason
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to process approval'
      }, { status: 400 })
    }

    const messages = {
      approve: 'Pricing revision approved successfully',
      reject: 'Pricing revision rejected',
      escalate: 'Pricing revision escalated to higher authority'
    }

    return NextResponse.json({
      success: true,
      message: messages[decision as keyof typeof messages]
    })

  } catch (error) {
    console.error('Pricing approval API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process pricing approval'
    }, { status: 500 })
  }
}

/**
 * Get revision details for approval
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> }
) {
  try {
    const { user, hasPermission, error } = await requirePermission(request, 'pricing.view')
    
    if (!user || !hasPermission) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const { revisionId } = await params

    // This would typically fetch revision details from the database
    // For now, we'll return a placeholder response
    return NextResponse.json({
      success: true,
      data: {
        revision_id: revisionId,
        message: 'Revision details endpoint - implementation pending'
      }
    })

  } catch (error) {
    console.error('Get revision details API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch revision details'
    }, { status: 500 })
  }
}