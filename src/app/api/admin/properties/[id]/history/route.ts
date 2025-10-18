import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { PropertyStateMachine } from '@/lib/property-state-machine'

export const dynamic = 'force-dynamic'

/**
 * Property State History API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { id: propertyId } = await params

    // Check if user has access to this property
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user is admin via admin profiles
    const admin = await getAuthenticatedAdmin(request)
    const isAdmin = !!admin

    if (!isAdmin) {
      // Check if user is the seller of this property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select(`
          id,
          seller_profiles!inner(user_id)
        `)
        .eq('id', propertyId)
        .eq('seller_profiles.user_id', user.id)
        .single()

      if (propertyError || !property) {
        return NextResponse.json({
          success: false,
          message: 'Property not found or access denied'
        }, { status: 404 })
      }
    }

    // Get state history
    const history = await PropertyStateMachine.getStateHistory(propertyId)

    // Enrich history with user information
    const enrichedHistory = await Promise.all(
      history.map(async (transition) => {
        let triggerUserInfo = null
        
        if (transition.triggered_by_user) {
          const { data: userData } = await supabase.auth.admin.getUserById(transition.triggered_by_user)
          if (userData.user) {
            triggerUserInfo = {
              id: userData.user.id,
              email: userData.user.email,
              name: userData.user.user_metadata?.full_name || userData.user.email
            }
          }
        }

        return {
          ...transition,
          trigger_user: triggerUserInfo,
          duration: null // Will be calculated in frontend if needed
        }
      })
    )

    // Calculate duration between states
    for (let i = 0; i < enrichedHistory.length - 1; i++) {
      const currentTransition = enrichedHistory[i]
      const nextTransition = enrichedHistory[i + 1]
      
      const currentTime = new Date(currentTransition.created_at).getTime()
      const nextTime = new Date(nextTransition.created_at).getTime()
      const durationMs = nextTime - currentTime
      
      currentTransition.duration = {
        milliseconds: durationMs,
        seconds: Math.round(durationMs / 1000),
        minutes: Math.round(durationMs / (1000 * 60)),
        hours: Math.round(durationMs / (1000 * 60 * 60)),
        days: Math.round(durationMs / (1000 * 60 * 60 * 24))
      }
    }

    // Get current property state for context
    const { data: currentProperty, error: currentError } = await supabase
      .from('properties')
      .select('current_state, state_updated_at')
      .eq('id', propertyId)
      .single()

    if (currentError) {
      console.error('Failed to get current property state:', currentError)
    }

    return NextResponse.json({
      success: true,
      data: {
        propertyId,
        currentState: currentProperty?.current_state,
        lastUpdated: currentProperty?.state_updated_at,
        totalTransitions: enrichedHistory.length,
        history: enrichedHistory,
        timeline: generateTimeline(enrichedHistory)
      }
    })

  } catch (error) {
    console.error('Property history error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get property history'
    }, { status: 500 })
  }
}

function generateTimeline(history: any[]) {
  return history.map((transition, index) => {
    const isFirst = index === 0
    const isLast = index === history.length - 1
    
    return {
      id: transition.id,
      state: transition.to_state,
      timestamp: transition.created_at,
      triggeredBy: transition.triggered_by,
      triggerUser: transition.trigger_user,
      reason: transition.transition_reason,
      duration: transition.duration,
      metadata: transition.metadata,
      position: {
        isFirst,
        isLast,
        index,
        progress: isFirst ? 0 : (index / (history.length - 1)) * 100
      },
      status: getStateStatus(transition.to_state),
      description: getStateDescription(transition.from_state, transition.to_state, transition.triggered_by)
    }
  })
}

function getStateStatus(state: string) {
  const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
    'submitted': 'pending',
    'analyzing': 'processing',
    'analysis_failed': 'failed',
    'pending_admin_review': 'pending',
    'admin_rejected': 'failed',
    'pending_seller_approval': 'pending',
    'seller_rejected': 'cancelled',
    'seller_approved': 'completed',
    'calculating_investor_price': 'processing',
    'pricing_failed': 'failed',
    'priced_for_investors': 'completed',
    'listed': 'completed',
    'bidding_active': 'processing',
    'bidding_ended': 'completed',
    'bidding_cancelled': 'cancelled',
    'bid_accepted': 'completed',
    'under_contract': 'processing',
    'sold': 'completed',
    'withdrawn': 'cancelled'
  }
  
  return statusMap[state] || 'pending'
}

function getStateDescription(fromState: string, toState: string, triggeredBy: string) {
  const descriptions: Record<string, string> = {
    'submitted_to_analyzing': 'Property analysis started automatically',
    'analyzing_to_analysis_failed': 'Analysis failed - system error',
    'analyzing_to_pending_admin_review': 'Analysis completed - awaiting admin review',
    'pending_admin_review_to_admin_rejected': 'Property rejected by admin',
    'pending_admin_review_to_pending_seller_approval': 'Pricing proposal sent to seller',
    'pending_seller_approval_to_seller_rejected': 'Seller rejected pricing proposal',
    'pending_seller_approval_to_seller_approved': 'Seller approved pricing proposal',
    'seller_approved_to_calculating_investor_price': 'Calculating investor pricing',
    'calculating_investor_price_to_pricing_failed': 'Pricing calculation failed',
    'calculating_investor_price_to_priced_for_investors': 'Investor pricing calculated',
    'priced_for_investors_to_listed': 'Property listed for investors',
    'listed_to_bidding_active': 'Bidding window opened',
    'bidding_active_to_bidding_ended': 'Bidding window closed',
    'bidding_active_to_bidding_cancelled': 'Bidding cancelled by admin',
    'bidding_ended_to_bid_accepted': 'Winning bid accepted',
    'bid_accepted_to_under_contract': 'Property under contract',
    'under_contract_to_sold': 'Property sale completed',
    'to_withdrawn': 'Property withdrawn from listing'
  }
  
  const key = `${fromState}_to_${toState}`
  return descriptions[key] || descriptions[`to_${toState}`] || `Transitioned to ${toState} by ${triggeredBy}`
}