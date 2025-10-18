/**
 * Profit Margin Calculator
 * Advanced calculations for property profit margins with business rule validation
 */

import { ConfigurationManager } from './configuration-manager'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface MarginCalculationInput {
  property_id: string
  estimated_value: number
  confidence_score: number
  property_type: string
  market_conditions: {
    trend: 'up' | 'down' | 'stable'
    velocity: number // Days on market average
    competition_level: 'low' | 'medium' | 'high'
    price_per_sqft_vs_market: number // Percentage vs market average
  }
  property_factors: {
    condition_score: number // 1-100
    location_desirability: number // 1-100
    renovation_required: boolean
    estimated_renovation_cost?: number
    days_to_close_estimate: number
  }
  financial_constraints?: {
    max_investment: number
    required_roi: number // As decimal (0.15 = 15%)
    holding_cost_per_month: number
  }
}

export interface MarginCalculationResult {
  base_margin: number
  adjusted_margin: number
  final_margin: number
  recommended_offer: number
  margin_breakdown: {
    base_rate: number
    property_type_adjustment: number
    confidence_adjustment: number
    market_adjustment: number
    risk_adjustment: number
    competition_adjustment: number
    condition_adjustment: number
  }
  risk_assessment: {
    overall_risk: 'low' | 'medium' | 'high'
    risk_score: number // 1-10
    risk_factors: string[]
    mitigation_strategies: string[]
  }
  business_rules_validation: {
    passes_minimum_margin: boolean
    passes_maximum_margin: boolean
    passes_roi_requirements: boolean
    passes_investment_limits: boolean
    warnings: string[]
    violations: string[]
  }
  scenario_analysis: {
    optimistic: { margin: number; offer: number; roi: number }
    realistic: { margin: number; offer: number; roi: number }
    pessimistic: { margin: number; offer: number; roi: number }
  }
}

export class ProfitMarginCalculator {
  
  /**
   * Calculate comprehensive profit margins for a property
   */
  static async calculateMargins(input: MarginCalculationInput): Promise<MarginCalculationResult> {
    try {
      // Load business rules
      const businessRules = await this.loadBusinessRules()
      
      // Start with base margin
      const baseMargin = businessRules.base_margin
      
      // Calculate all adjustments
      const adjustments = await this.calculateAdjustments(input, businessRules)
      
      // Apply adjustments
      let adjustedMargin = baseMargin
      Object.values(adjustments).forEach(adjustment => {
        adjustedMargin *= (1 + adjustment)
      })
      
      // Ensure within business rule bounds
      const finalMargin = Math.max(
        businessRules.minimum_margin,
        Math.min(businessRules.maximum_margin, adjustedMargin)
      )
      
      // Calculate recommended offer
      const recommendedOffer = input.estimated_value * (1 - finalMargin)
      
      // Risk assessment
      const riskAssessment = this.assessRisk(input, finalMargin)
      
      // Business rules validation
      const businessRulesValidation = this.validateBusinessRules(
        input,
        finalMargin,
        recommendedOffer,
        businessRules
      )
      
      // Scenario analysis
      const scenarioAnalysis = this.performScenarioAnalysis(input, finalMargin)
      
      return {
        base_margin: baseMargin,
        adjusted_margin: adjustedMargin,
        final_margin: finalMargin,
        recommended_offer: Math.round(recommendedOffer),
        margin_breakdown: {
          base_rate: baseMargin,
          property_type_adjustment: adjustments.property_type,
          confidence_adjustment: adjustments.confidence,
          market_adjustment: adjustments.market,
          risk_adjustment: adjustments.risk,
          competition_adjustment: adjustments.competition,
          condition_adjustment: adjustments.condition
        },
        risk_assessment: riskAssessment,
        business_rules_validation: businessRulesValidation,
        scenario_analysis: scenarioAnalysis
      }
    } catch (error) {
      console.error('Error calculating profit margins:', error)
      throw new Error('Failed to calculate profit margins')
    }
  }
  
  /**
   * Validate a proposed offer against business rules
   */
  static async validateOffer(
    propertyId: string,
    estimatedValue: number,
    proposedOffer: number
  ): Promise<{
    valid: boolean
    margin: number
    violations: string[]
    warnings: string[]
    recommendations: string[]
  }> {
    try {
      const businessRules = await this.loadBusinessRules()
      const margin = 1 - (proposedOffer / estimatedValue)
      
      const violations: string[] = []
      const warnings: string[] = []
      const recommendations: string[] = []
      
      // Check minimum margin
      if (margin < businessRules.minimum_margin) {
        violations.push(`Margin ${(margin * 100).toFixed(1)}% below minimum ${(businessRules.minimum_margin * 100).toFixed(1)}%`)
      }
      
      // Check maximum margin
      if (margin > businessRules.maximum_margin) {
        warnings.push(`Margin ${(margin * 100).toFixed(1)}% above maximum ${(businessRules.maximum_margin * 100).toFixed(1)}% - may reduce competitiveness`)
      }
      
      // Check against market conditions
      const { data: property } = await supabase
        .from('properties')
        .select('property_type, listing_price')
        .eq('id', propertyId)
        .single()
      
      if (property) {
        const offerToListRatio = proposedOffer / property.listing_price
        
        if (offerToListRatio < 0.7) {
          warnings.push('Offer is less than 70% of listing price - may be rejected')
        } else if (offerToListRatio > 0.95) {
          warnings.push('Offer is very close to listing price - limited negotiation margin')
        }
        
        // Property type specific recommendations
        if (property.property_type === 'single_family' && margin < 0.12) {
          recommendations.push('Consider increasing margin for single-family properties due to market demand')
        }
        
        if (property.property_type === 'condo' && margin > 0.25) {
          recommendations.push('High margin for condo - ensure competitive with similar units')
        }
      }
      
      return {
        valid: violations.length === 0,
        margin,
        violations,
        warnings,
        recommendations
      }
    } catch (error) {
      console.error('Error validating offer:', error)
      return {
        valid: false,
        margin: 0,
        violations: ['Error validating offer'],
        warnings: [],
        recommendations: []
      }
    }
  }
  
  /**
   * Calculate ROI projections for different scenarios
   */
  static calculateROI(
    purchasePrice: number,
    estimatedValue: number,
    holdingCosts: number,
    renovationCost: number = 0,
    sellPriceMultiplier: number = 0.95 // Account for selling costs
  ): {
    gross_profit: number
    net_profit: number
    roi_percentage: number
    total_investment: number
    break_even_sell_price: number
  } {
    const totalInvestment = purchasePrice + renovationCost + holdingCosts
    const sellPrice = estimatedValue * sellPriceMultiplier
    const grossProfit = sellPrice - purchasePrice
    const netProfit = sellPrice - totalInvestment
    const roiPercentage = (netProfit / totalInvestment) * 100
    const breakEvenSellPrice = totalInvestment / sellPriceMultiplier
    
    return {
      gross_profit: grossProfit,
      net_profit: netProfit,
      roi_percentage: roiPercentage,
      total_investment: totalInvestment,
      break_even_sell_price: breakEvenSellPrice
    }
  }
  
  /**
   * Private helper methods
   */
  private static async loadBusinessRules(): Promise<any> {
    const rules = await ConfigurationManager.getBusinessRules('profit_margins')
    
    return {
      base_margin: parseFloat(rules['profit_margins.base'] || '0.15'),
      minimum_margin: parseFloat(rules['profit_margins.minimum'] || '0.10'),
      maximum_margin: parseFloat(rules['profit_margins.maximum'] || '0.30'),
      single_family: parseFloat(rules['profit_margins.single_family'] || '1.0'),
      condo: parseFloat(rules['profit_margins.condo'] || '1.1'),
      townhouse: parseFloat(rules['profit_margins.townhouse'] || '1.05'),
      multi_family: parseFloat(rules['profit_margins.multi_family'] || '0.95'),
      hot_market: parseFloat(rules['profit_margins.hot_market'] || '0.95'),
      slow_market: parseFloat(rules['profit_margins.slow_market'] || '1.1'),
      high_confidence: parseFloat(rules['profit_margins.high_confidence'] || '0.95'),
      medium_confidence: parseFloat(rules['profit_margins.medium_confidence'] || '1.0'),
      low_confidence: parseFloat(rules['profit_margins.low_confidence'] || '1.1')
    }
  }
  
  private static async calculateAdjustments(
    input: MarginCalculationInput,
    businessRules: any
  ): Promise<Record<string, number>> {
    // Property type adjustment
    const propertyTypeKey = input.property_type.toLowerCase().replace(/[^a-z]/g, '_')
    const propertyTypeAdjustment = (businessRules[propertyTypeKey] || 1.0) - 1.0
    
    // Confidence adjustment
    let confidenceAdjustment = 0
    if (input.confidence_score >= 90) {
      confidenceAdjustment = (businessRules.high_confidence || 0.95) - 1.0
    } else if (input.confidence_score >= 70) {
      confidenceAdjustment = (businessRules.medium_confidence || 1.0) - 1.0
    } else {
      confidenceAdjustment = (businessRules.low_confidence || 1.1) - 1.0
    }
    
    // Market condition adjustment
    let marketAdjustment = 0
    if (input.market_conditions.trend === 'up') {
      marketAdjustment = (businessRules.hot_market || 0.95) - 1.0
    } else if (input.market_conditions.trend === 'down') {
      marketAdjustment = (businessRules.slow_market || 1.1) - 1.0
    }
    
    // Competition adjustment
    let competitionAdjustment = 0
    switch (input.market_conditions.competition_level) {
      case 'high':
        competitionAdjustment = -0.02 // Reduce margin in competitive markets
        break
      case 'low':
        competitionAdjustment = 0.03 // Increase margin when competition is low
        break
      default:
        competitionAdjustment = 0
    }
    
    // Property condition adjustment
    let conditionAdjustment = 0
    if (input.property_factors.condition_score < 60) {
      conditionAdjustment = 0.05 // Higher margin for poor condition properties
    } else if (input.property_factors.condition_score > 90) {
      conditionAdjustment = -0.02 // Lower margin for excellent condition
    }
    
    // Renovation risk adjustment
    let riskAdjustment = 0
    if (input.property_factors.renovation_required) {
      const renovationRatio = (input.property_factors.estimated_renovation_cost || 0) / input.estimated_value
      if (renovationRatio > 0.2) {
        riskAdjustment = 0.05 // High renovation risk
      } else if (renovationRatio > 0.1) {
        riskAdjustment = 0.03 // Moderate renovation risk
      } else {
        riskAdjustment = 0.01 // Minor renovation risk
      }
    }
    
    return {
      property_type: propertyTypeAdjustment,
      confidence: confidenceAdjustment,
      market: marketAdjustment,
      competition: competitionAdjustment,
      condition: conditionAdjustment,
      risk: riskAdjustment
    }
  }
  
  private static assessRisk(
    input: MarginCalculationInput,
    finalMargin: number
  ): {
    overall_risk: 'low' | 'medium' | 'high'
    risk_score: number
    risk_factors: string[]
    mitigation_strategies: string[]
  } {
    const riskFactors: string[] = []
    const mitigationStrategies: string[] = []
    let riskScore = 0
    
    // Confidence risk
    if (input.confidence_score < 70) {
      riskScore += 3
      riskFactors.push('Low analysis confidence')
      mitigationStrategies.push('Order additional property inspection')
    } else if (input.confidence_score < 85) {
      riskScore += 1
      riskFactors.push('Moderate analysis confidence')
    }
    
    // Market risk
    if (input.market_conditions.trend === 'down') {
      riskScore += 2
      riskFactors.push('Declining market trend')
      mitigationStrategies.push('Monitor market closely and be prepared to adjust pricing')
    }
    
    // Competition risk
    if (input.market_conditions.competition_level === 'high') {
      riskScore += 2
      riskFactors.push('High market competition')
      mitigationStrategies.push('Ensure offer is competitive and respond quickly')
    }
    
    // Renovation risk
    if (input.property_factors.renovation_required) {
      const renovationRatio = (input.property_factors.estimated_renovation_cost || 0) / input.estimated_value
      if (renovationRatio > 0.15) {
        riskScore += 3
        riskFactors.push('Significant renovation required')
        mitigationStrategies.push('Get detailed contractor estimates before proceeding')
      } else {
        riskScore += 1
        riskFactors.push('Minor renovation required')
      }
    }
    
    // Margin risk
    if (finalMargin < 0.12) {
      riskScore += 2
      riskFactors.push('Low profit margin')
      mitigationStrategies.push('Consider increasing offer or finding cost reductions')
    }
    
    // Time risk
    if (input.property_factors.days_to_close_estimate > 45) {
      riskScore += 1
      riskFactors.push('Extended closing timeline')
      mitigationStrategies.push('Factor in additional holding costs')
    }
    
    let overallRisk: 'low' | 'medium' | 'high' = 'low'
    if (riskScore >= 7) {
      overallRisk = 'high'
    } else if (riskScore >= 4) {
      overallRisk = 'medium'
    }
    
    return {
      overall_risk: overallRisk,
      risk_score: Math.min(riskScore, 10),
      risk_factors: riskFactors,
      mitigation_strategies: mitigationStrategies
    }
  }
  
  private static validateBusinessRules(
    input: MarginCalculationInput,
    finalMargin: number,
    recommendedOffer: number,
    businessRules: any
  ): {
    passes_minimum_margin: boolean
    passes_maximum_margin: boolean
    passes_roi_requirements: boolean
    passes_investment_limits: boolean
    warnings: string[]
    violations: string[]
  } {
    const warnings: string[] = []
    const violations: string[] = []
    
    const passesMinimumMargin = finalMargin >= businessRules.minimum_margin
    const passesMaximumMargin = finalMargin <= businessRules.maximum_margin
    
    if (!passesMinimumMargin) {
      violations.push(`Margin ${(finalMargin * 100).toFixed(1)}% below minimum ${(businessRules.minimum_margin * 100).toFixed(1)}%`)
    }
    
    if (!passesMaximumMargin) {
      warnings.push(`Margin ${(finalMargin * 100).toFixed(1)}% above maximum ${(businessRules.maximum_margin * 100).toFixed(1)}%`)
    }
    
    // ROI validation
    let passesROI = true
    if (input.financial_constraints?.required_roi) {
      const roi = this.calculateROI(
        recommendedOffer,
        input.estimated_value,
        input.financial_constraints.holding_cost_per_month * 6, // Assume 6 month hold
        input.property_factors.estimated_renovation_cost || 0
      )
      
      passesROI = roi.roi_percentage >= (input.financial_constraints.required_roi * 100)
      
      if (!passesROI) {
        violations.push(`Projected ROI ${roi.roi_percentage.toFixed(1)}% below required ${(input.financial_constraints.required_roi * 100).toFixed(1)}%`)
      }
    }
    
    // Investment limit validation
    let passesInvestmentLimits = true
    if (input.financial_constraints?.max_investment) {
      const totalInvestment = recommendedOffer + (input.property_factors.estimated_renovation_cost || 0)
      passesInvestmentLimits = totalInvestment <= input.financial_constraints.max_investment
      
      if (!passesInvestmentLimits) {
        violations.push(`Total investment $${totalInvestment.toLocaleString()} exceeds limit $${input.financial_constraints.max_investment.toLocaleString()}`)
      }
    }
    
    return {
      passes_minimum_margin: passesMinimumMargin,
      passes_maximum_margin: passesMaximumMargin,
      passes_roi_requirements: passesROI,
      passes_investment_limits: passesInvestmentLimits,
      warnings,
      violations
    }
  }
  
  private static performScenarioAnalysis(
    input: MarginCalculationInput,
    baseMargin: number
  ): {
    optimistic: { margin: number; offer: number; roi: number }
    realistic: { margin: number; offer: number; roi: number }
    pessimistic: { margin: number; offer: number; roi: number }
  } {
    // Optimistic: Market performs well, no major issues
    const optimisticMargin = baseMargin * 0.9 // 10% lower margin (higher offer)
    const optimisticOffer = input.estimated_value * (1 - optimisticMargin)
    const optimisticROI = this.calculateROI(
      optimisticOffer,
      input.estimated_value * 1.05, // 5% value appreciation
      (input.financial_constraints?.holding_cost_per_month || 1000) * 4, // 4 month hold
      input.property_factors.estimated_renovation_cost || 0
    ).roi_percentage
    
    // Realistic: Base case scenario
    const realisticOffer = input.estimated_value * (1 - baseMargin)
    const realisticROI = this.calculateROI(
      realisticOffer,
      input.estimated_value,
      (input.financial_constraints?.holding_cost_per_month || 1000) * 6, // 6 month hold
      input.property_factors.estimated_renovation_cost || 0
    ).roi_percentage
    
    // Pessimistic: Market challenges, additional costs
    const pessimisticMargin = baseMargin * 1.15 // 15% higher margin (lower offer)
    const pessimisticOffer = input.estimated_value * (1 - pessimisticMargin)
    const pessimisticROI = this.calculateROI(
      pessimisticOffer,
      input.estimated_value * 0.95, // 5% value decline
      (input.financial_constraints?.holding_cost_per_month || 1000) * 8, // 8 month hold
      (input.property_factors.estimated_renovation_cost || 0) * 1.2 // 20% cost overrun
    ).roi_percentage
    
    return {
      optimistic: {
        margin: optimisticMargin,
        offer: Math.round(optimisticOffer),
        roi: optimisticROI
      },
      realistic: {
        margin: baseMargin,
        offer: Math.round(realisticOffer),
        roi: realisticROI
      },
      pessimistic: {
        margin: pessimisticMargin,
        offer: Math.round(pessimisticOffer),
        roi: pessimisticROI
      }
    }
  }
}