/**
 * Mock Property State Machine for admin dashboard
 * This provides basic state management until the full system is set up
 */

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
  | 'pricing_review'
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

export class MockPropertyStateMachine {
  /**
   * Mock transition state - always succeeds in development
   */
  static async transitionState(
    propertyId: string,
    newState: PropertyState,
    metadata: TransitionMetadata
  ): Promise<{ success: boolean; error?: string; transitionId?: string }> {
    // Mock implementation - in real system this would validate and update database
    console.log(`Mock state transition: Property ${propertyId} -> ${newState}`, metadata)
    
    // Simulate successful transition
    return {
      success: true,
      transitionId: `mock_transition_${Date.now()}`
    }
  }

  /**
   * Mock valid next states
   */
  static getValidNextStates(
    currentState: PropertyState, 
    triggeredBy: 'system' | 'admin' | 'seller' | 'investor'
  ): PropertyState[] {
    // Mock implementation - return some common next states based on current state
    const mockTransitions: Partial<Record<PropertyState, PropertyState[]>> = {
      'submitted': ['analyzing', 'admin_rejected'],
      'analyzing': ['analysis_completed', 'analysis_failed'],
      'analysis_completed': ['pending_admin_review'],
      'pending_admin_review': ['pending_seller_approval', 'admin_rejected'],
      'pending_seller_approval': ['seller_approved', 'seller_rejected'],
      'seller_approved': ['calculating_investor_price'],
      'calculating_investor_price': ['priced_for_investors', 'pricing_failed'],
      'priced_for_investors': ['listed'],
      'listed': ['bidding_active', 'withdrawn'],
      'bidding_active': ['bidding_ended', 'bidding_cancelled'],
      'bidding_ended': ['bid_accepted'],
      'bid_accepted': ['under_contract'],
      'under_contract': ['sold'],
      'pricing_review': ['pricing_approved', 'pricing_revision_requested'],
      'pricing_revision_requested': ['pricing_review']
    }

    return mockTransitions[currentState] || []
  }

  /**
   * Mock state history
   */
  static async getStateHistory(propertyId: string): Promise<PropertyTransition[]> {
    // Mock transition history
    return [
      {
        id: 'mock_1',
        property_id: propertyId,
        from_state: 'submitted',
        to_state: 'analyzing',
        triggered_by: 'system',
        reason: 'Automatic analysis trigger',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'mock_2',
        property_id: propertyId,
        from_state: 'analyzing',
        to_state: 'pricing_review',
        triggered_by: 'system',
        reason: 'Analysis completed',
        created_at: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
      }
    ]
  }

  /**
   * Mock validation check
   */
  static isValidTransition(
    fromState: PropertyState,
    toState: PropertyState,
    triggeredBy: 'system' | 'admin' | 'seller' | 'investor'
  ): boolean {
    // Mock implementation - be permissive for development
    return true
  }

  /**
   * Mock properties by state
   */
  static async getPropertiesByState(
    state: PropertyState | PropertyState[],
    limit: number = 50,
    offset: number = 0
  ) {
    // Mock implementation - return empty array for now
    console.log(`Mock getPropertiesByState: ${state}, limit: ${limit}, offset: ${offset}`)
    return []
  }
}

// Export the mock as the main export for development
export const PropertyStateMachine = MockPropertyStateMachine
