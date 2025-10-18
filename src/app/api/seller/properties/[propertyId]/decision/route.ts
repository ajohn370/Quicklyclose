/**
 * API Route: Seller Pricing Decision
 * Handles seller approval/rejection/counter-offer decisions
 */

import { NextRequest, NextResponse } from 'next/server'
import { SellerAuthManager } from '@/lib/seller-auth'
import { SellerNotificationService } from '@/lib/seller-notification-service'
import { PropertyStateMachine, PropertyState } from '@/lib/property-state-machine'
import { DataGovernanceManager } from '@/lib/data-governance'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{
    propertyId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')
    const body = await request.json()

    // Validate seller session
    const sessionResult = await SellerAuthManager.validateSellerSession(sessionToken)
    if (!sessionResult.success || !sessionResult.sellerId) {
      return NextResponse.json(
        { success: false, message: sessionResult.error || 'Invalid session' },
        { status: 401 }
      )
    }

    // Check seller access for pricing approval
    const accessCheck = await SellerAuthManager.checkSellerAccess(
      sessionResult.sellerId,
      propertyId,
      'approve_pricing'
    )

    if (!accessCheck.can_approve_pricing) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Cannot approve pricing at this time',
          restrictions: accessCheck.restrictions
        },
        { status: 403 }
      )
    }

    const {
      decision,
      counter_offer_amount,
      feedback,
      preferred_contact_method,
      best_contact_time,
      additional_terms = []
    } = body

    // Validate decision
    if (!['approved', 'rejected', 'counter_offer'].includes(decision)) {
      return NextResponse.json(
        { success: false, message: 'Invalid decision type' },
        { status: 400 }
      )
    }

    // Validate counter offer amount if needed
    if (decision === 'counter_offer' && (!counter_offer_amount || counter_offer_amount <= 0)) {
      return NextResponse.json(
        { success: false, message: 'Counter offer amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    // Get property and current pricing
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        address,
        seller_id,
        current_state,
        pricing_revisions!left (
          id,
          recommended_offer,
          approval_status
        )
      `)
      .eq('id', propertyId)
      .eq('seller_id', sessionResult.sellerId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      )
    }

    // Get current pricing revision
    const currentPricing = property.pricing_revisions?.find(
      revision => revision.approval_status === 'approved'
    ) || property.pricing_revisions?.[0]

    if (!currentPricing) {
      return NextResponse.json(
        { success: false, message: 'No pricing available for decision' },
        { status: 404 }
      )
    }

    // Record the interaction
    const { data: interaction, error: interactionError } = await supabase
      .from('seller_property_interactions')
      .insert({
        seller_id: sessionResult.sellerId,
        property_id: propertyId,
        interaction_type: `pricing_${decision}`,
        interaction_data: {
          pricing_revision_id: currentPricing.id,
          original_offer: currentPricing.recommended_offer,
          decision_details: {
            decision,
            counter_offer_amount,
            feedback,
            preferred_contact_method,
            best_contact_time,
            additional_terms
          }
        },
        decision,
        decision_reason: feedback,
        counter_offer_amount,
        counter_offer_terms: additional_terms.join('; '),
        preferred_contact_method,
        best_contact_time,
        requires_follow_up: decision !== 'approved'
      })
      .select()
      .single()

    if (interactionError) {
      return NextResponse.json(
        { success: false, message: 'Failed to record decision' },
        { status: 500 }
      )
    }

    // Update property state based on decision
    let newState: PropertyState
    switch (decision) {
      case 'approved':
        newState = 'seller_approved'
        break
      case 'rejected':
        newState = 'seller_rejected'
        break
      case 'counter_offer':
        newState = 'seller_counter_offer'
        break
      default:
        newState = property.current_state
    }

    // Transition property state
    if (newState !== property.current_state) {
      const stateResult = await PropertyStateMachine.transitionState(
        propertyId,
        newState,
        {
          triggeredBy: 'seller',
          data: {
            seller_decision: decision,
            interaction_id: interaction.id,
            decision_timestamp: new Date().toISOString()
          }
        }
      )

      if (!stateResult.success) {
        console.error('Failed to transition property state:', stateResult.error)
      }
    }

    // Send notifications to admin team
    await this.notifyAdminTeam(propertyId, property.address, decision, {
      seller_id: sessionResult.sellerId,
      interaction_id: interaction.id,
      counter_offer_amount,
      feedback
    })

    // Log the activity
    await DataGovernanceManager.logActivity({
      userId: sessionResult.sellerId,
      action: `seller_pricing_${decision}`,
      tableName: 'seller_property_interactions',
      recordId: interaction.id,
      details: JSON.stringify({
        property_id: propertyId as string,
        decision,
        counter_offer_amount,
        original_offer: currentPricing.recommended_offer
      })
    })

    // Prepare response based on decision
    let responseMessage = ''
    let nextSteps: string[] = []

    switch (decision) {
      case 'approved':
        responseMessage = 'Thank you for accepting our offer! We\'ll be in touch with next steps.'
        nextSteps = [
          'Our team will contact you within 24 hours',
          'Purchase agreement will be prepared',
          'Due diligence process will begin',
          'Closing scheduled within 14-21 days'
        ]
        break
      case 'rejected':
        responseMessage = 'We understand. Thank you for considering our offer.'
        nextSteps = [
          'Your property will remain in our system',
          'We may reach out with market updates',
          'Feel free to contact us if your situation changes'
        ]
        break
      case 'counter_offer':
        responseMessage = `Thank you for your counter offer of $${counter_offer_amount.toLocaleString()}. Our team will review and respond.`
        nextSteps = [
          'Our team will review your counter offer',
          'We\'ll respond within 48 hours',
          'We may contact you to discuss terms',
          'Further negotiation may be possible'
        ]
        break
    }

    return NextResponse.json({
      success: true,
      data: {
        interaction_id: interaction.id,
        decision,
        message: responseMessage,
        next_steps: nextSteps,
        contact_info: {
          preferred_method: preferred_contact_method,
          best_time: best_contact_time
        }
      }
    })

  } catch (error) {
    console.error('Error processing seller decision:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }

}

/**
 * Notify admin team of seller decision
 */
async function notifyAdminTeam(
  propertyId: string,
  propertyAddress: string,
  decision: string,
  context: any
): Promise<void> {
  try {
    // Get admin users who should be notified
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        auth.users!inner (
          email
        ),
        roles!inner (
          name
        )
      `)
      .in('roles.name', ['admin', 'sales', 'support'])
      .eq('is_active', true)

    if (!adminUsers || adminUsers.length === 0) return

    // Create internal notification for each admin
    const notifications = adminUsers.map((admin: any) => ({
      user_id: admin.user_id,
      type: 'seller_decision',
      title: `Seller ${decision} - ${propertyAddress}`,
      message: `Property ${propertyAddress} has received a seller ${decision}.`,
      data: {
        property_id: propertyId,
        property_address: propertyAddress,
        decision,
        ...context
      },
      priority: decision === 'approved' ? 'high' : 'medium'
    }))

    // Insert notifications (assuming you have an internal notifications table)
    // await supabase.from('internal_notifications').insert(notifications)

    // Insert notifications (assuming you have an internal notifications table)
    // await supabase.from('internal_notifications').insert(notifications)

    console.log(`Admin team notified of seller ${decision} for ${propertyAddress}`)
  } catch (error) {
    console.error('Error notifying admin team:', error)
  }
}