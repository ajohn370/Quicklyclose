import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { PropertyStateMachine, PropertyState } from '@/lib/property-state-machine'

export const dynamic = 'force-dynamic'

/**
 * Property State Transition API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { id: propertyId } = await params
    const body = await request.json()
    
    const { newState, reason, data } = body

    if (!newState) {
      return NextResponse.json({
        success: false,
        message: 'New state is required'
      }, { status: 400 })
    }

    // Validate that newState is a valid PropertyState
    const validStates: PropertyState[] = [
      'submitted', 'analyzing', 'analysis_failed', 'analysis_completed', 'analysis_pending',
      'pending_admin_review', 'admin_rejected', 'pending_seller_approval', 'seller_rejected',
      'seller_approved', 'calculating_investor_price', 'pricing_failed', 'pricing_approved',
      'pricing_revision_requested', 'priced_for_investors', 'listed', 'bidding_active',
      'bidding_closed', 'under_contract', 'closed', 'cancelled'
    ]
    
    if (!validStates.includes(newState)) {
      return NextResponse.json({
        success: false,
        message: `Invalid state: ${newState}. Valid states are: ${validStates.join(', ')}`
      }, { status: 400 })
    }

    // Determine trigger type based on user role
    const admin = await getAuthenticatedAdmin(request)
    const userMetadata = user.user_metadata || {}
    const isAdmin = !!admin
    
    let triggeredBy: 'admin' | 'seller' | 'investor'
    
    if (isAdmin) {
      triggeredBy = 'admin'
    } else if (userMetadata.role === 'seller') {
      triggeredBy = 'seller'
    } else if (userMetadata.role === 'investor') {
      triggeredBy = 'investor'
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid user role for state transitions'
      }, { status: 403 })
    }

    // Attempt state transition
    const result = await PropertyStateMachine.transitionState(
      propertyId,
      newState, // Now safely validated as PropertyState
      {
        triggeredBy,
        triggeredByUser: user.id,
        reason,
        data
      }
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        transitionId: result.transitionId,
        newState,
        triggeredBy,
        timestamp: new Date().toISOString()
      },
      message: `Property transitioned to ${newState} successfully`
    })

  } catch (error) {
    console.error('Property transition error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to transition property state'
    }, { status: 500 })
  }
}

/**
 * Get valid next states for property
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
    
    // Get property current state
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: property, error } = await supabase
      .from('properties')
      .select('current_state')
      .eq('id', propertyId)
      .single()

    if (error || !property) {
      return NextResponse.json({
        success: false,
        message: 'Property not found'
      }, { status: 404 })
    }

    // Determine user type
    const admin = await getAuthenticatedAdmin(request)
    const userMetadata = user.user_metadata || {}
    const isAdmin = !!admin
    
    let triggeredBy: 'admin' | 'seller' | 'investor'
    
    if (isAdmin) {
      triggeredBy = 'admin'
    } else if (userMetadata.role === 'seller') {
      triggeredBy = 'seller'
    } else if (userMetadata.role === 'investor') {
      triggeredBy = 'investor'
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid user role'
      }, { status: 403 })
    }

    const currentState = property.current_state || 'submitted'
    
    // Validate current state
    const validStates: PropertyState[] = [
      'submitted', 'analyzing', 'analysis_failed', 'analysis_completed', 'analysis_pending',
      'pending_admin_review', 'admin_rejected', 'pending_seller_approval', 'seller_rejected',
      'seller_approved', 'calculating_investor_price', 'pricing_failed', 'pricing_approved',
      'pricing_revision_requested', 'priced_for_investors', 'listed', 'bidding_active',
      'bidding_closed', 'under_contract', 'closed', 'cancelled'
    ]
    
    if (!validStates.includes(currentState as PropertyState)) {
      return NextResponse.json({
        success: false,
        message: `Invalid current state: ${currentState}`
      }, { status: 400 })
    }
    
    const validNextStates = PropertyStateMachine.getValidNextStates(
      currentState as PropertyState, // Safe after validation
      triggeredBy
    )

    return NextResponse.json({
      success: true,
      data: {
        currentState,
        validNextStates,
        triggeredBy
      }
    })

  } catch (error) {
    console.error('Get valid states error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get valid states'
    }, { status: 500 })
  }
}