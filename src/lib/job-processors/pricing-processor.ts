/**
 * Pricing Job Processor
 * Handles investor price calculations and profit margin applications
 */

import { Job } from 'bullmq'
import { InvestorPriceJobData } from '../job-queue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processPricingJob(job: Job<InvestorPriceJobData>) {
  const { propertyId, sellerPrice, analysisId, profitMarginRules } = job.data

  try {
    await job.updateProgress(10)

    // 1. Get property and analysis data
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new Error(`Failed to fetch property: ${propertyError?.message}`)
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('comp_vision_analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      throw new Error(`Failed to fetch analysis: ${analysisError?.message}`)
    }

    await job.updateProgress(30)

    // 2. Calculate investor pricing based on multiple factors
    const pricingCalculation = calculateInvestorPricing({
      sellerPrice,
      estimatedValue: analysis.estimated_value,
      property,
      analysis,
      profitMarginRules
    })

    await job.updateProgress(60)

    // 3. Create pricing revision record
    const { data: pricingRevision, error: revisionError } = await supabase
      .from('pricing_revisions')
      .insert({
        property_id: propertyId,
        analysis_id: analysisId,
        seller_price: sellerPrice,
        investor_price: pricingCalculation.investorPrice,
        quicklyclose_margin: pricingCalculation.quicklyCloseMargin,
        calculation_method: pricingCalculation.method,
        confidence_score: pricingCalculation.confidenceScore,
        market_factors: pricingCalculation.marketFactors,
        status: 'calculated',
        metadata: {
          jobId: job.id,
          calculationDetails: pricingCalculation.details,
          profitMarginRules
        }
      })
      .select()
      .single()

    if (revisionError || !pricingRevision) {
      throw new Error(`Failed to create pricing revision: ${revisionError?.message}`)
    }

    await job.updateProgress(80)

    // 4. Update property status
    const { error: statusError } = await supabase
      .from('properties')
      .update({
        status: 'priced_for_investors',
        investor_price: pricingCalculation.investorPrice
      })
      .eq('id', propertyId)

    if (statusError) {
      throw new Error(`Failed to update property status: ${statusError.message}`)
    }

    // 5. Create state transition
    const { error: transitionError } = await supabase
      .from('property_transitions')
      .insert({
        property_id: propertyId,
        from_state: 'seller_approved',
        to_state: 'priced_for_investors',
        triggered_by: 'system',
        metadata: {
          pricingRevisionId: pricingRevision.id,
          sellerPrice,
          investorPrice: pricingCalculation.investorPrice,
          margin: pricingCalculation.quicklyCloseMargin
        }
      })

    if (transitionError) {
      console.error('Failed to create state transition:', transitionError)
    }

    await job.updateProgress(90)

    // 6. Trigger investor notifications
    const { addNotificationJob } = await import('../job-queue')
    await addNotificationJob({
      propertyId,
      notificationType: 'new_listing',
      listingData: {
        investorPrice: pricingCalculation.investorPrice,
        sellerPrice,
        margin: pricingCalculation.quicklyCloseMargin,
        confidenceScore: pricingCalculation.confidenceScore
      }
    })

    await job.updateProgress(100)

    return {
      success: true,
      pricingRevisionId: pricingRevision.id,
      sellerPrice,
      investorPrice: pricingCalculation.investorPrice,
      quicklyCloseMargin: pricingCalculation.quicklyCloseMargin,
      confidenceScore: pricingCalculation.confidenceScore
    }

  } catch (error) {
    // Update property status to pricing_failed
    await supabase
      .from('properties')
      .update({ status: 'pricing_failed' })
      .eq('id', propertyId)

    // Create failure state transition
    await supabase
      .from('property_transitions')
      .insert({
        property_id: propertyId,
        from_state: 'seller_approved',
        to_state: 'pricing_failed',
        triggered_by: 'system',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          jobId: job.id
        }
      })

    throw error
  }
}

interface PricingCalculationInput {
  sellerPrice: number
  estimatedValue: number
  property: any
  analysis: any
  profitMarginRules: Record<string, number>
}

interface PricingCalculationResult {
  investorPrice: number
  quicklyCloseMargin: number
  method: string
  confidenceScore: number
  marketFactors: Record<string, any>
  details: Record<string, any>
}

function calculateInvestorPricing(input: PricingCalculationInput): PricingCalculationResult {
  const { sellerPrice, estimatedValue, property, analysis, profitMarginRules } = input

  // Base margin calculation
  const baseMargin = profitMarginRules.base || 0.15 // 15% default

  // Property type adjustments
  const propertyTypeMultiplier = getPropertyTypeMultiplier(property.property_type, profitMarginRules)

  // Market condition adjustments
  const marketMultiplier = getMarketMultiplier(analysis, profitMarginRules)

  // Confidence score adjustments
  const confidenceMultiplier = getConfidenceMultiplier(analysis.confidence || 85, profitMarginRules)

  // Calculate final margin
  const finalMargin = baseMargin * propertyTypeMultiplier * marketMultiplier * confidenceMultiplier

  // Ensure margin is within bounds
  const minMargin = profitMarginRules.minimum || 0.10 // 10% minimum
  const maxMargin = profitMarginRules.maximum || 0.30 // 30% maximum
  const boundedMargin = Math.max(minMargin, Math.min(maxMargin, finalMargin))

  // Calculate investor price
  const investorPrice = Math.round(sellerPrice * (1 + boundedMargin))

  // Calculate confidence score based on multiple factors
  const confidenceScore = calculateConfidenceScore({
    analysisConfidence: analysis.confidence || 85,
    priceAlignment: Math.abs(sellerPrice - estimatedValue) / estimatedValue,
    marketFactors: analysis.flip_comps || {},
    propertyData: property
  })

  return {
    investorPrice,
    quicklyCloseMargin: boundedMargin,
    method: 'dynamic_margin_calculation',
    confidenceScore,
    marketFactors: {
      propertyTypeMultiplier,
      marketMultiplier,
      confidenceMultiplier,
      finalMargin: boundedMargin
    },
    details: {
      baseMargin,
      sellerPrice,
      estimatedValue,
      marginAdjustments: {
        propertyType: propertyTypeMultiplier,
        market: marketMultiplier,
        confidence: confidenceMultiplier
      },
      finalMargin: boundedMargin
    }
  }
}

function getPropertyTypeMultiplier(propertyType: string, rules: Record<string, number>): number {
  const typeMultipliers = {
    'single_family': rules.single_family || 1.0,
    'condo': rules.condo || 1.1,
    'townhouse': rules.townhouse || 1.05,
    'multi_family': rules.multi_family || 0.95,
    'land': rules.land || 1.2,
    'commercial': rules.commercial || 0.9
  }

  return typeMultipliers[propertyType] || 1.0
}

function getMarketMultiplier(analysis: any, rules: Record<string, number>): number {
  // Base market multiplier
  let multiplier = 1.0

  // Days on market factor
  const daysOnMarket = analysis.flip_comps?.days_on_market
  if (daysOnMarket) {
    if (daysOnMarket < 30) {
      multiplier *= rules.hot_market || 0.95 // Lower margin in hot markets
    } else if (daysOnMarket > 90) {
      multiplier *= rules.slow_market || 1.1 // Higher margin in slow markets
    }
  }

  // Sale to list ratio factor
  const saleToListRatio = analysis.flip_comps?.sale_to_list_ratio
  if (saleToListRatio) {
    if (saleToListRatio > 0.98) {
      multiplier *= rules.strong_pricing || 0.98
    } else if (saleToListRatio < 0.90) {
      multiplier *= rules.weak_pricing || 1.05
    }
  }

  return multiplier
}

function getConfidenceMultiplier(confidence: number, rules: Record<string, number>): number {
  if (confidence >= 90) {
    return rules.high_confidence || 0.95 // Lower margin for high confidence
  } else if (confidence >= 80) {
    return rules.medium_confidence || 1.0 // Standard margin
  } else {
    return rules.low_confidence || 1.1 // Higher margin for low confidence
  }
}

function calculateConfidenceScore(params: {
  analysisConfidence: number
  priceAlignment: number
  marketFactors: any
  propertyData: any
}): number {
  let baseScore = params.analysisConfidence

  // Adjust based on price alignment with estimated value
  if (params.priceAlignment < 0.1) {
    baseScore += 5 // Good alignment
  } else if (params.priceAlignment > 0.2) {
    baseScore -= 10 // Poor alignment
  }

  // Adjust based on market factors
  if (params.marketFactors.sale_to_list_ratio > 0.95) {
    baseScore += 3
  }

  if (params.marketFactors.days_on_market < 45) {
    baseScore += 2
  }

  // Property completeness factor
  const hasAllDetails = params.propertyData.bedrooms && 
                       params.propertyData.bathrooms && 
                       params.propertyData.square_feet
  if (hasAllDetails) {
    baseScore += 2
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(baseScore)))
}