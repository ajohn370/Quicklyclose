/**
 * Property State Machine
 * Manages property lifecycle states and transitions with validation
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PropertyState = 
  | 'submitted'
  | 'analyzing'
  | 'analysis_failed'
  | 'analysis_completed'
  | 'analysis_pending'
  | 'pending_admin_review'
  | 'admin_rejected'
  | 'pending_seller_approval'
  | 'seller_rejected'
  | 'seller_approved'
  | 'seller_counter_offer'
  | 'calculating_investor_price'
  | 'pricing_failed'
  | 'pricing_approved'
  | 'pricing_revision_requested'
  | 'priced_for_investors'
  | 'listed'
  | 'bidding_active'
  | 'bidding_ended'
  | 'bidding_closed'
  | 'bidding_cancelled'
  | 'bid_accepted'
  | 'under_contract'
  | 'sold'
  | 'withdrawn'
  | 'closed'
  | 'cancelled'

export interface StateTransitionConfig {
  from: PropertyState
  to: PropertyState
  allowedTriggers: ('system' | 'admin' | 'seller' | 'investor')[]
  conditions?: (propertyData: any, metadata: any) => Promise<boolean>
  sideEffects?: (propertyData: any, transition: any) => Promise<void>
}

export interface TransitionMetadata {
  triggeredBy: 'system' | 'admin' | 'seller' | 'investor'
  triggeredByUser?: string
  reason?: string
  data?: Record<string, any>
}

export interface PropertyTransition {
  id: string
  property_id: string
  from_state: PropertyState
  to_state: PropertyState
  triggered_by: 'system' | 'admin' | 'seller' | 'investor'
  triggered_by_user?: string
  reason?: string
  metadata?: Record<string, any>
  created_at: string
}

// Define valid state transitions
const stateTransitions: StateTransitionConfig[] = [
  // Initial submission and analysis
  {
    from: 'submitted',
    to: 'analyzing',
    allowedTriggers: ['system', 'admin'],
    sideEffects: async (property, transition) => {
      // Trigger analysis job
      const { addAnalysisJob } = await import('./job-queue')
      await addAnalysisJob({
        propertyId: property.id,
        sellerId: property.seller_id,
        imageUrl: property.images?.[0] || '',
        address: {
          street: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip_code
        },
        userId: property.seller_id,
        requestId: `prop_${property.id}_${Date.now()}`
      })
    }
  },
  {
    from: 'analyzing',
    to: 'analysis_failed',
    allowedTriggers: ['system']
  },
  {
    from: 'analyzing',
    to: 'pending_admin_review',
    allowedTriggers: ['system']
  },
  
  // Admin review process
  {
    from: 'pending_admin_review',
    to: 'admin_rejected',
    allowedTriggers: ['admin']
  },
  {
    from: 'pending_admin_review',
    to: 'pending_seller_approval',
    allowedTriggers: ['admin'],
    conditions: async (property, metadata) => {
      // Ensure admin has provided pricing
      return !!(metadata.data?.proposedPrice || property.estimated_value)
    }
  },
  
  // Seller approval process
  {
    from: 'pending_seller_approval',
    to: 'seller_rejected',
    allowedTriggers: ['seller', 'system'], // system for expiration
  },
  {
    from: 'pending_seller_approval',
    to: 'seller_approved',
    allowedTriggers: ['seller'],
    sideEffects: async (property, transition) => {
      // Trigger investor pricing calculation
      const { addPricingJob } = await import('./job-queue')
      await addPricingJob({
        propertyId: property.id,
        sellerPrice: transition.metadata?.data?.approvedPrice || property.estimated_value,
        analysisId: property.analysis_id,
        profitMarginRules: {
          base: 0.15,
          minimum: 0.10,
          maximum: 0.30,
          single_family: 1.0,
          condo: 1.1,
          townhouse: 1.05,
          multi_family: 0.95
        }
      })
    }
  },
  
  // Pricing calculation
  {
    from: 'seller_approved',
    to: 'calculating_investor_price',
    allowedTriggers: ['system']
  },
  {
    from: 'calculating_investor_price',
    to: 'pricing_failed',
    allowedTriggers: ['system']
  },
  {
    from: 'calculating_investor_price',
    to: 'priced_for_investors',
    allowedTriggers: ['system']
  },
  {
    from: 'priced_for_investors',
    to: 'listed',
    allowedTriggers: ['system', 'admin']
  },
  
  // Bidding process
  {
    from: 'listed',
    to: 'bidding_active',
    allowedTriggers: ['admin', 'system'],
    sideEffects: async (property, transition) => {
      // Create bidding window
      const biddingDuration = transition.metadata?.data?.durationHours || 48
      const scheduleTime = new Date()
      scheduleTime.setHours(scheduleTime.getHours() + biddingDuration)
      
      const { data: biddingWindow } = await supabase
        .from('bidding_windows')
        .insert({
          property_id: property.id,
          starting_price: property.investor_price,
          duration_hours: biddingDuration,
          scheduled_close_time: scheduleTime.toISOString(),
          status: 'active',
          actual_open_time: new Date().toISOString()
        })
        .select()
        .single()
      
      // Schedule automatic closure
      if (biddingWindow) {
        const { addBiddingJob } = await import('./job-queue')
        await addBiddingJob({
          propertyId: property.id,
          biddingWindowId: biddingWindow.id,
          action: 'close'
        }, biddingDuration * 60 * 60 * 1000) // Convert hours to milliseconds
      }
    }
  },
  {
    from: 'bidding_active',
    to: 'bidding_ended',
    allowedTriggers: ['system']
  },
  {
    from: 'bidding_active',
    to: 'bidding_cancelled',
    allowedTriggers: ['admin']
  },
  {
    from: 'bidding_ended',
    to: 'bid_accepted',
    allowedTriggers: ['admin'],
    conditions: async (property, metadata) => {
      // Ensure there's a winning bid
      return !!(metadata.data?.winningBidId)
    }
  },
  
  // Final states
  {
    from: 'bid_accepted',
    to: 'under_contract',
    allowedTriggers: ['admin']
  },
  {
    from: 'under_contract',
    to: 'sold',
    allowedTriggers: ['admin']
  },
  
  // Withdrawal transitions (allowed from most states)
  {
    from: 'pending_admin_review',
    to: 'withdrawn',
    allowedTriggers: ['admin', 'seller']
  },
  {
    from: 'pending_seller_approval',
    to: 'withdrawn',
    allowedTriggers: ['seller']
  },
  {
    from: 'listed',
    to: 'withdrawn',
    allowedTriggers: ['admin', 'seller']
  },
  
  // Retry transitions for failed states
  {
    from: 'analysis_failed',
    to: 'analyzing',
    allowedTriggers: ['admin']
  },
  {
    from: 'pricing_failed',
    to: 'calculating_investor_price',
    allowedTriggers: ['admin']
  }
]

export class PropertyStateMachine {
  /**
   * Transition property to new state with validation
   */
  static async transitionState(
    propertyId: string,
    newState: PropertyState,
    metadata: TransitionMetadata
  ): Promise<{ success: boolean; error?: string; transitionId?: string }> {
    try {
      // 1. Get current property state
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (propertyError || !property) {
        return { success: false, error: 'Property not found' }
      }

      const currentState = property.current_state || 'submitted'

      // 2. Validate transition is allowed
      const validTransition = stateTransitions.find(
        t => t.from === currentState && 
             t.to === newState && 
             t.allowedTriggers.includes(metadata.triggeredBy)
      )

      if (!validTransition) {
        return { 
          success: false, 
          error: `Invalid transition from ${currentState} to ${newState} by ${metadata.triggeredBy}` 
        }
      }

      // 3. Check conditions if any
      if (validTransition.conditions) {
        const conditionMet = await validTransition.conditions(property, metadata)
        if (!conditionMet) {
          return { 
            success: false, 
            error: 'Transition conditions not met' 
          }
        }
      }

      // 4. Create transition record
      const { data: transition, error: transitionError } = await supabase
        .from('property_transitions')
        .insert({
          property_id: propertyId,
          from_state: currentState,
          to_state: newState,
          triggered_by: metadata.triggeredBy,
          triggered_by_user: metadata.triggeredByUser,
          transition_reason: metadata.reason,
          metadata: metadata.data || {}
        })
        .select()
        .single()

      if (transitionError || !transition) {
        return { success: false, error: 'Failed to create transition record' }
      }

      // 5. Update property state
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          current_state: newState,
          state_updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)

      if (updateError) {
        return { success: false, error: 'Failed to update property state' }
      }

      // 6. Execute side effects
      if (validTransition.sideEffects) {
        try {
          await validTransition.sideEffects(property, transition)
        } catch (error) {
          console.error('Side effect execution failed:', error)
          // Continue - don't fail the transition for side effect errors
        }
      }

      return { 
        success: true, 
        transitionId: transition.id 
      }

    } catch (error) {
      console.error('State transition error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get valid next states for a property
   */
  static getValidNextStates(
    currentState: PropertyState, 
    triggeredBy: 'system' | 'admin' | 'seller' | 'investor'
  ): PropertyState[] {
    return stateTransitions
      .filter(t => t.from === currentState && t.allowedTriggers.includes(triggeredBy))
      .map(t => t.to)
  }

  /**
   * Get property state history
   */
  static async getStateHistory(propertyId: string) {
    const { data: transitions, error } = await supabase
      .from('property_transitions')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get state history: ${error.message}`)
    }

    return transitions || []
  }

  /**
   * Check if transition is valid
   */
  static isValidTransition(
    fromState: PropertyState,
    toState: PropertyState,
    triggeredBy: 'system' | 'admin' | 'seller' | 'investor'
  ): boolean {
    return stateTransitions.some(
      t => t.from === fromState && 
           t.to === toState && 
           t.allowedTriggers.includes(triggeredBy)
    )
  }

  /**
   * Get properties by state
   */
  static async getPropertiesByState(
    state: PropertyState | PropertyState[],
    limit: number = 50,
    offset: number = 0
  ) {
    let query = supabase
      .from('properties')
      .select(`
        *,
        seller_profiles(*),
        comp_vision_analyses(*),
        pricing_revisions(*)
      `)

    if (Array.isArray(state)) {
      query = query.in('current_state', state)
    } else {
      query = query.eq('current_state', state)
    }

    query = query
      .order('state_updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get properties by state: ${error.message}`)
    }

    return data || []
  }
}