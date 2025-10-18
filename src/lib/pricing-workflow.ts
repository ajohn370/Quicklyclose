/**
 * Pricing Workflow Management System
 * Handles pricing revisions, approval chains, and business rule validation
 */

import { createClient } from '@supabase/supabase-js'
import { RBACManager } from './rbac'
import { ConfigurationManager } from './configuration-manager'
import { PropertyStateMachine } from './property-state-machine'
import { JobQueueManager } from './job-queue'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated'
export type ApprovalLevel = 'analyst' | 'senior_analyst' | 'pricing_manager' | 'director'

export interface PricingRevision {
  id: string
  property_id: string
  previous_offer: number
  new_offer: number
  reason: string
  confidence_adjustment?: number
  market_adjustment?: number
  profit_margin_override?: number
  created_by: string
  approval_status: ApprovalStatus
  approval_level_required: ApprovalLevel
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  escalation_reason?: string
  business_rules_validated: boolean
  risk_score: number
  impact_analysis: {
    profit_impact: number
    margin_change: number
    market_position: 'aggressive' | 'competitive' | 'conservative'
    risk_factors: string[]
  }
  created_at: string
  updated_at: string
}

export interface ApprovalChain {
  level: ApprovalLevel
  required_permissions: string[]
  auto_approve_conditions?: {
    max_amount_change: number
    max_margin_change: number
    min_confidence_score: number
  }
  escalation_triggers: {
    amount_threshold: number
    margin_threshold: number
    risk_score_threshold: number
  }
}

export interface PricingAnalysisRequest {
  property_id: string
  estimated_value: number
  confidence_score: number
  analysis_data: any
  comparables: any[]
  market_trends: any
}

export class PricingWorkflowManager {
  
  /**
   * Calculate recommended pricing based on business rules
   */
  static async calculatePricing(request: PricingAnalysisRequest): Promise<{
    recommended_offer: number
    profit_margins: {
      base: number
      adjusted: number
      minimum: number
      maximum: number
      multipliers: Record<string, number>
    }
    risk_assessment: {
      score: number
      factors: string[]
      recommendations: string[]
    }
  }> {
    try {
      // Get business rules
      const [profitMarginRules, analysisRules] = await Promise.all([
        ConfigurationManager.getBusinessRules('profit_margins'),
        ConfigurationManager.getBusinessRules('analysis')
      ])

      // Base profit margin calculation
      const baseProfitMargin = parseFloat(profitMarginRules['profit_margins.base'] || '0.15')
      const minProfitMargin = parseFloat(profitMarginRules['profit_margins.minimum'] || '0.10')
      const maxProfitMargin = parseFloat(profitMarginRules['profit_margins.maximum'] || '0.30')

      // Get property type multiplier
      const propertyTypeMultiplier = await this.getPropertyTypeMultiplier(request.property_id, profitMarginRules)
      
      // Confidence-based adjustment
      const confidenceMultiplier = this.calculateConfidenceMultiplier(request.confidence_score)
      
      // Market condition adjustment
      const marketMultiplier = this.calculateMarketMultiplier(request.market_trends)

      // Calculate adjusted profit margin
      let adjustedMargin = baseProfitMargin * propertyTypeMultiplier * confidenceMultiplier * marketMultiplier
      adjustedMargin = Math.max(minProfitMargin, Math.min(maxProfitMargin, adjustedMargin))

      // Calculate recommended offer
      const recommendedOffer = request.estimated_value * (1 - adjustedMargin)

      // Risk assessment
      const riskAssessment = this.assessPricingRisk(
        request.estimated_value,
        recommendedOffer,
        request.confidence_score,
        request.market_trends
      )

      return {
        recommended_offer: Math.round(recommendedOffer),
        profit_margins: {
          base: baseProfitMargin,
          adjusted: adjustedMargin,
          minimum: minProfitMargin,
          maximum: maxProfitMargin,
          multipliers: {
            property_type: propertyTypeMultiplier,
            confidence: confidenceMultiplier,
            market: marketMultiplier
          }
        },
        risk_assessment: riskAssessment
      }
    } catch (error) {
      console.error('Error calculating pricing:', error)
      throw new Error('Failed to calculate pricing')
    }
  }

  /**
   * Create a pricing revision
   */
  static async createRevision(
    propertyId: string,
    revisionData: {
      previous_offer: number
      new_offer: number
      reason: string
      confidence_adjustment?: number
      market_adjustment?: number
      profit_margin_override?: number
    },
    createdBy: string
  ): Promise<{ success: boolean; revision?: PricingRevision; error?: string }> {
    try {
      // Calculate impact analysis
      const impactAnalysis = await this.calculateImpactAnalysis(propertyId, revisionData)
      
      // Determine approval level required
      const approvalLevel = this.determineApprovalLevel(impactAnalysis)
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(impactAnalysis)
      
      // Validate business rules
      const businessRulesValidated = await this.validateBusinessRules(propertyId, revisionData)

      // Determine if auto-approval is possible
      const autoApprovalResult = await this.checkAutoApproval(
        approvalLevel,
        impactAnalysis,
        riskScore,
        createdBy
      )

      const revisionRecord = {
        property_id: propertyId,
        previous_offer: revisionData.previous_offer,
        new_offer: revisionData.new_offer,
        reason: revisionData.reason,
        confidence_adjustment: revisionData.confidence_adjustment,
        market_adjustment: revisionData.market_adjustment,
        profit_margin_override: revisionData.profit_margin_override,
        created_by: createdBy,
        approval_status: autoApprovalResult.autoApproved ? 'approved' : 'pending',
        approval_level_required: approvalLevel,
        approved_by: autoApprovalResult.autoApproved ? createdBy : null,
        approved_at: autoApprovalResult.autoApproved ? new Date().toISOString() : null,
        business_rules_validated: businessRulesValidated,
        risk_score: riskScore,
        impact_analysis: impactAnalysis
      }

      const { data, error } = await supabase
        .from('pricing_revisions')
        .insert(revisionRecord)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Update property with new pricing if auto-approved
      if (autoApprovalResult.autoApproved) {
        await this.applyPricingRevision(propertyId, revisionData.new_offer, data.id)
      } else {
        // Create approval task for the appropriate level
        await this.createApprovalTask(data.id, approvalLevel)
      }

      // Log the revision creation
      await this.logPricingActivity(propertyId, 'revision_created', {
        revision_id: data.id,
        new_offer: revisionData.new_offer,
        auto_approved: autoApprovalResult.autoApproved,
        approval_level: approvalLevel,
        risk_score: riskScore
      }, createdBy)

      return { success: true, revision: data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Process approval/rejection of a pricing revision
   */
  static async processApproval(
    revisionId: string,
    decision: 'approve' | 'reject' | 'escalate',
    processedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the revision
      const { data: revision, error: fetchError } = await supabase
        .from('pricing_revisions')
        .select('*')
        .eq('id', revisionId)
        .single()

      if (fetchError || !revision) {
        return { success: false, error: 'Revision not found' }
      }

      // Verify user has permission to approve at this level
      const hasPermission = await this.verifyApprovalPermission(
        processedBy,
        revision.approval_level_required
      )

      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions for this approval level' }
      }

      let updateData: any = {
        updated_at: new Date().toISOString()
      }

      switch (decision) {
        case 'approve':
          updateData.approval_status = 'approved'
          updateData.approved_by = processedBy
          updateData.approved_at = new Date().toISOString()
          
          // Apply the pricing revision
          await this.applyPricingRevision(revision.property_id, revision.new_offer, revisionId)
          break

        case 'reject':
          updateData.approval_status = 'rejected'
          updateData.rejection_reason = reason
          updateData.approved_by = processedBy
          updateData.approved_at = new Date().toISOString()
          break

        case 'escalate':
          const nextLevel = this.getNextApprovalLevel(revision.approval_level_required)
          if (!nextLevel) {
            return { success: false, error: 'Cannot escalate further' }
          }
          
          updateData.approval_status = 'escalated'
          updateData.approval_level_required = nextLevel
          updateData.escalation_reason = reason
          
          // Create new approval task at higher level
          await this.createApprovalTask(revisionId, nextLevel)
          break
      }

      const { error: updateError } = await supabase
        .from('pricing_revisions')
        .update(updateData)
        .eq('id', revisionId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Log the approval activity
      await this.logPricingActivity(revision.property_id, `revision_${decision}d`, {
        revision_id: revisionId,
        processed_by: processedBy,
        reason,
        approval_level: revision.approval_level_required
      }, processedBy)

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get pricing history for a property
   */
  static async getPricingHistory(propertyId: string): Promise<PricingRevision[]> {
    const { data, error } = await supabase
      .from('pricing_revisions')
      .select(`
        *,
        created_by_profile:profiles!pricing_revisions_created_by_fkey(name, email),
        approved_by_profile:profiles!pricing_revisions_approved_by_fkey(name, email)
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pricing history:', error)
      return []
    }

    return data || []
  }

  /**
   * Get pending approvals for a user
   */
  static async getPendingApprovals(userId: string): Promise<any[]> {
    // Get user's approval levels based on permissions
    const approvalLevels = await this.getUserApprovalLevels(userId)
    
    if (approvalLevels.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('pricing_revisions')
      .select(`
        *,
        properties(address, property_type, listing_price),
        created_by_profile:profiles!pricing_revisions_created_by_fkey(name, email)
      `)
      .eq('approval_status', 'pending')
      .in('approval_level_required', approvalLevels)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching pending approvals:', error)
      return []
    }

    return data || []
  }

  /**
   * Private helper methods
   */
  private static async getPropertyTypeMultiplier(
    propertyId: string,
    profitMarginRules: any
  ): Promise<number> {
    // Get property type
    const { data: property } = await supabase
      .from('properties')
      .select('property_type')
      .eq('id', propertyId)
      .single()

    if (!property) return 1.0

    const propertyType = property.property_type.toLowerCase().replace(/[^a-z]/g, '_')
    const multiplierKey = `profit_margins.${propertyType}`
    
    return parseFloat(profitMarginRules[multiplierKey] || '1.0')
  }

  private static calculateConfidenceMultiplier(confidenceScore: number): number {
    // Higher confidence = lower margin needed
    if (confidenceScore >= 90) return 0.95  // High confidence
    if (confidenceScore >= 70) return 1.0   // Medium confidence  
    return 1.1  // Low confidence
  }

  private static calculateMarketMultiplier(marketTrends: any): number {
    if (!marketTrends || !marketTrends.trend) return 1.0

    switch (marketTrends.trend) {
      case 'up': return 0.95    // Hot market - can afford lower margin
      case 'down': return 1.1   // Slow market - need higher margin
      default: return 1.0       // Stable market
    }
  }

  private static assessPricingRisk(
    estimatedValue: number,
    recommendedOffer: number,
    confidenceScore: number,
    marketTrends: any
  ): { score: number; factors: string[]; recommendations: string[] } {
    const riskFactors: string[] = []
    const recommendations: string[] = []
    let riskScore = 0

    // Confidence-based risk
    if (confidenceScore < 70) {
      riskScore += 3
      riskFactors.push('Low analysis confidence')
      recommendations.push('Consider additional property inspection')
    } else if (confidenceScore < 90) {
      riskScore += 1
      riskFactors.push('Moderate analysis confidence')
    }

    // Market condition risk
    if (marketTrends?.trend === 'down') {
      riskScore += 2
      riskFactors.push('Declining market conditions')
      recommendations.push('Monitor local market trends closely')
    }

    // Pricing aggressiveness risk
    const margin = 1 - (recommendedOffer / estimatedValue)
    if (margin < 0.1) {
      riskScore += 3
      riskFactors.push('Aggressive pricing with low profit margin')
      recommendations.push('Consider increasing profit margin for safety')
    } else if (margin > 0.3) {
      riskScore += 1
      riskFactors.push('Conservative pricing may lose competitive advantage')
      recommendations.push('Monitor competitor pricing')
    }

    return {
      score: Math.min(riskScore, 10), // Cap at 10
      factors: riskFactors,
      recommendations
    }
  }

  private static async calculateImpactAnalysis(
    propertyId: string,
    revisionData: any
  ): Promise<any> {
    const offerDifference = revisionData.new_offer - revisionData.previous_offer
    const percentageChange = (offerDifference / revisionData.previous_offer) * 100

    // Get estimated value for margin calculation
    const { data: analysis } = await supabase
      .from('comp_vision_analyses')
      .select('estimated_value')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const estimatedValue = analysis?.estimated_value || revisionData.new_offer / 0.85

    const profitImpact = offerDifference
    const newMargin = 1 - (revisionData.new_offer / estimatedValue)
    const originalMargin = 1 - (revisionData.previous_offer / estimatedValue)
    const marginChange = newMargin - originalMargin

    let marketPosition: 'aggressive' | 'competitive' | 'conservative' = 'competitive'
    if (newMargin < 0.1) marketPosition = 'aggressive'
    if (newMargin > 0.25) marketPosition = 'conservative'

    const riskFactors: string[] = []
    if (Math.abs(percentageChange) > 10) riskFactors.push('Large price change')
    if (newMargin < 0.1) riskFactors.push('Low profit margin')
    if (newMargin > 0.3) riskFactors.push('High profit margin may reduce competitiveness')

    return {
      profit_impact: profitImpact,
      margin_change: marginChange,
      market_position: marketPosition,
      risk_factors: riskFactors,
      percentage_change: percentageChange,
      new_margin: newMargin,
      estimated_value: estimatedValue
    }
  }

  private static determineApprovalLevel(impactAnalysis: any): ApprovalLevel {
    const absChange = Math.abs(impactAnalysis.percentage_change)
    const profitImpact = Math.abs(impactAnalysis.profit_impact)

    // Director approval for major changes
    if (absChange > 20 || profitImpact > 50000) {
      return 'director'
    }

    // Pricing manager for significant changes
    if (absChange > 10 || profitImpact > 25000) {
      return 'pricing_manager'
    }

    // Senior analyst for moderate changes
    if (absChange > 5 || profitImpact > 10000) {
      return 'senior_analyst'
    }

    // Analyst for small changes
    return 'analyst'
  }

  private static calculateRiskScore(impactAnalysis: any): number {
    let riskScore = 0

    // Percentage change risk
    const absChange = Math.abs(impactAnalysis.percentage_change)
    if (absChange > 20) riskScore += 4
    else if (absChange > 10) riskScore += 2
    else if (absChange > 5) riskScore += 1

    // Margin risk
    if (impactAnalysis.new_margin < 0.05) riskScore += 4
    else if (impactAnalysis.new_margin < 0.1) riskScore += 2
    else if (impactAnalysis.new_margin > 0.35) riskScore += 2

    // Market position risk
    if (impactAnalysis.market_position === 'aggressive') riskScore += 2

    return Math.min(riskScore, 10)
  }

  private static async validateBusinessRules(
    propertyId: string,
    revisionData: any
  ): Promise<boolean> {
    try {
      const rules = await ConfigurationManager.getBusinessRules('profit_margins')
      const minMargin = parseFloat(rules['profit_margins.minimum'] || '0.1')
      const maxMargin = parseFloat(rules['profit_margins.maximum'] || '0.3')

      // Get estimated value
      const { data: analysis } = await supabase
        .from('comp_vision_analyses')
        .select('estimated_value')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!analysis) return false

      const margin = 1 - (revisionData.new_offer / analysis.estimated_value)
      
      return margin >= minMargin && margin <= maxMargin
    } catch (error) {
      console.error('Error validating business rules:', error)
      return false
    }
  }

  private static async checkAutoApproval(
    approvalLevel: ApprovalLevel,
    impactAnalysis: any,
    riskScore: number,
    createdBy: string
  ): Promise<{ autoApproved: boolean; reason?: string }> {
    // Auto-approve only for analyst level with low risk
    if (approvalLevel !== 'analyst' || riskScore > 3) {
      return { autoApproved: false }
    }

    // Check if user has auto-approval permissions
    const hasPermission = await RBACManager.hasPermission(
      createdBy,
      'pricing.auto_approve'
    )

    if (!hasPermission) {
      return { autoApproved: false }
    }

    // Additional checks for auto-approval
    const absChange = Math.abs(impactAnalysis.percentage_change)
    const profitImpact = Math.abs(impactAnalysis.profit_impact)

    if (absChange <= 5 && profitImpact <= 10000 && impactAnalysis.new_margin >= 0.1) {
      return { autoApproved: true, reason: 'Low risk change with sufficient margin' }
    }

    return { autoApproved: false }
  }

  private static async verifyApprovalPermission(
    userId: string,
    approvalLevel: ApprovalLevel
  ): Promise<boolean> {
    const permissionMap = {
      'analyst': 'pricing.approve.analyst',
      'senior_analyst': 'pricing.approve.senior_analyst', 
      'pricing_manager': 'pricing.approve.manager',
      'director': 'pricing.approve.director'
    }

    return await RBACManager.hasPermission(userId, permissionMap[approvalLevel])
  }

  private static getNextApprovalLevel(currentLevel: ApprovalLevel): ApprovalLevel | null {
    const hierarchy = ['analyst', 'senior_analyst', 'pricing_manager', 'director']
    const currentIndex = hierarchy.indexOf(currentLevel)
    
    if (currentIndex >= 0 && currentIndex < hierarchy.length - 1) {
      return hierarchy[currentIndex + 1] as ApprovalLevel
    }
    
    return null
  }

  private static async getUserApprovalLevels(userId: string): Promise<ApprovalLevel[]> {
    const levels: ApprovalLevel[] = []
    
    const permissions = [
      { level: 'analyst', permission: 'pricing.approve.analyst' },
      { level: 'senior_analyst', permission: 'pricing.approve.senior_analyst' },
      { level: 'pricing_manager', permission: 'pricing.approve.manager' },
      { level: 'director', permission: 'pricing.approve.director' }
    ]

    for (const perm of permissions) {
      if (await RBACManager.hasPermission(userId, perm.permission)) {
        levels.push(perm.level as ApprovalLevel)
      }
    }

    return levels
  }

  private static async applyPricingRevision(
    propertyId: string,
    newOffer: number,
    revisionId: string
  ): Promise<void> {
    // Update property with new pricing
    await supabase
      .from('properties')
      .update({
        recommended_offer: newOffer,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId)

    // Transition property state if needed
    const { data: property } = await supabase
      .from('properties')
      .select('current_state')
      .eq('id', propertyId)
      .single()

    if (property?.current_state === 'pricing_review') {
      await PropertyStateMachine.transitionState(
        propertyId,
        'pricing_approved',
        {
          triggeredBy: 'system',
          reason: 'Pricing revision approved',
          data: {
            revision_id: revisionId,
            new_offer: newOffer
          }
        }
      )
    }
  }

  private static async createApprovalTask(
    revisionId: string,
    approvalLevel: ApprovalLevel
  ): Promise<void> {
    await JobQueueManager.addJob('notifications', 'send_seller_notification', {
      sellerId: '', // TODO: Get from revision data
      propertyId: '', // TODO: Get from revision data  
      notificationType: 'pricing_proposal',
      data: {
        revision_id: revisionId,
        approval_level: approvalLevel,
        priority: 'normal'
      }
    })
  }

  private static async logPricingActivity(
    propertyId: string,
    action: string,
    metadata: any,
    userId: string
  ): Promise<void> {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: userId,
          action: `PRICING_${action.toUpperCase()}`,
          resource_type: 'property',
          resource_id: propertyId,
          metadata
        })
    } catch (error) {
      console.error('Failed to log pricing activity:', error)
    }
  }
}