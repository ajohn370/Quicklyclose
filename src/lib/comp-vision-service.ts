/**
 * Computer Vision Analysis Service
 * Integrates comp vision analysis with property workflow system
 */

import { createClient } from '@supabase/supabase-js'
import { PropertyStateMachine } from './property-state-machine'
import { PricingWorkflowManager } from './pricing-workflow'
import { DataGovernanceManager } from './data-governance'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CompVisionAnalysisRequest {
  property_id: string
  image_urls: string[]
  priority?: number
  analysis_types?: ('flip' | 'rental' | 'both')[]
}

export interface CompVisionFeature {
  name: string
  confidence: number
}

export interface CompVisionResults {
  features: CompVisionFeature[]
  estimated_value: number
  confidence: number
  flip_comps: any
  rental_comps: any
  similar_properties: any[]
  processing_duration_seconds: number
}

export class CompVisionService {

  /**
   * Create and queue a new comp vision analysis
   */
  static async createAnalysis(
    request: CompVisionAnalysisRequest,
    userId?: string
  ): Promise<{ success: boolean; analysis_id?: string; error?: string }> {
    try {
      // Validate property exists and get details
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          city,
          state,
          zip_code,
          current_state,
          seller_profiles!inner (
            user_id
          )
        `)
        .eq('id', request.property_id)
        .single()

      if (propertyError || !property) {
        return { success: false, error: 'Property not found' }
      }

      // Check if property is in correct state for analysis
      if (!['submitted', 'analyzing'].includes(property.current_state)) {
        return { 
          success: false, 
          error: `Property must be in submitted or analyzing state for analysis. Current state: ${property.current_state}` 
        }
      }

      // Use primary image URL
      const primaryImageUrl = request.image_urls[0]
      if (!primaryImageUrl) {
        return { success: false, error: 'At least one image URL is required' }
      }

      // Create analysis using database function
      const { data: analysisId, error: createError } = await supabase
        .rpc('create_comp_vision_analysis', {
          p_property_id: request.property_id,
          p_image_url: primaryImageUrl,
          p_priority: request.priority || 5
        })

      if (createError || !analysisId) {
        return { success: false, error: 'Failed to create analysis' }
      }

      // Transition property state to analyzing if not already
      if (property.current_state === 'submitted') {
        await PropertyStateMachine.transitionState(
          request.property_id,
          'analyzing',
          {
            triggeredBy: 'system',
            triggeredByUser: userId,
            reason: 'Starting computer vision analysis',
            data: {
              analysis_id: analysisId,
              image_count: request.image_urls.length,
              analysis_types: request.analysis_types || ['both']
            }
          }
        )
      }

      // Log the analysis creation
      await DataGovernanceManager.logActivity({
        userId: userId || 'system',
        action: 'comp_vision_analysis_created',
        tableName: 'comp_vision_analyses',
        recordId: analysisId,
        details: `Analysis created for property ${request.property_id}`,
        metadata: {
          property_id: request.property_id,
          image_count: request.image_urls.length,
          priority: request.priority
        }
      })

      // In a real implementation, this would trigger the ML processing pipeline
      // For now, we'll simulate processing with mock data
      setTimeout(() => {
        this.simulateAnalysisProcessing(analysisId, property)
      }, 2000)

      return {
        success: true,
        analysis_id: analysisId
      }

    } catch (error) {
      console.error('Error creating comp vision analysis:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update analysis with AI processing results
   */
  static async updateAnalysisResults(
    analysisId: string,
    results: CompVisionResults
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update analysis with results
      const { error: updateError } = await supabase
        .rpc('update_analysis_results', {
          p_analysis_id: analysisId,
          p_features: results.features,
          p_estimated_value: results.estimated_value,
          p_confidence: results.confidence,
          p_flip_comps: results.flip_comps,
          p_rental_comps: results.rental_comps,
          p_similar_properties: results.similar_properties,
          p_processing_duration: results.processing_duration_seconds
        })

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Get the property ID for state transition
      const { data: analysis, error: analysisError } = await supabase
        .from('comp_vision_analyses')
        .select('property_id')
        .eq('id', analysisId)
        .single()

      if (analysisError || !analysis) {
        return { success: false, error: 'Analysis not found' }
      }

      // Transition property state to pending admin review
      const stateResult = await PropertyStateMachine.transitionState(
        analysis.property_id,
        'pending_admin_review',
        {
          triggeredBy: 'system',
          reason: 'Analysis completed, awaiting admin review',
          data: {
            analysis_id: analysisId,
            estimated_value: results.estimated_value,
            confidence: results.confidence,
            processing_duration: results.processing_duration_seconds
          }
        }
      )

      if (!stateResult.success) {
        console.warn('Failed to transition property state:', stateResult.error)
      }

      return { success: true }

    } catch (error) {
      console.error('Error updating analysis results:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Mark analysis as failed
   */
  static async markAnalysisFailed(
    analysisId: string,
    errorMessage: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update analysis status
      const { error: updateError } = await supabase
        .rpc('mark_analysis_failed', {
          p_analysis_id: analysisId,
          p_error_message: errorMessage
        })

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Get the property ID for state transition
      const { data: analysis, error: analysisError } = await supabase
        .from('comp_vision_analyses')
        .select('property_id')
        .eq('id', analysisId)
        .single()

      if (analysisError || !analysis) {
        return { success: false, error: 'Analysis not found' }
      }

      // Transition property state to analysis failed
      await PropertyStateMachine.transitionState(
        analysis.property_id,
        'analysis_failed',
        {
          triggeredBy: 'system',
          reason: 'Analysis failed: ' + errorMessage,
          data: {
            analysis_id: analysisId,
            error_message: errorMessage
          }
        }
      )

      return { success: true }

    } catch (error) {
      console.error('Error marking analysis as failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Approve analysis and trigger pricing workflow
   */
  static async approveAnalysis(
    analysisId: string,
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get analysis details
      const { data: analysis, error: analysisError } = await supabase
        .from('comp_vision_analyses')
        .select(`
          id,
          property_id,
          estimated_value,
          confidence,
          features,
          flip_comps,
          rental_comps,
          similar_properties
        `)
        .eq('id', analysisId)
        .single()

      if (analysisError || !analysis) {
        return { success: false, error: 'Analysis not found' }
      }

      // Update analysis as approved
      const { error: updateError } = await supabase
        .from('comp_vision_analyses')
        .update({
          admin_approved: true,
          admin_approved_by: adminId,
          admin_approved_at: new Date().toISOString(),
          seller_visible_notes: notes,
          status: 'approved'
        })
        .eq('id', analysisId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Transition property state
      const stateResult = await PropertyStateMachine.transitionState(
        analysis.property_id,
        'analysis_completed',
        {
          triggeredBy: 'admin',
          triggeredByUser: adminId,
          reason: 'Analysis approved by admin',
          data: {
            analysis_id: analysisId,
            approved_by: adminId,
            approved_at: new Date().toISOString()
          }
        }
      )

      if (!stateResult.success) {
        console.warn('Failed to transition property state:', stateResult.error)
      }

      // Calculate initial pricing based on analysis  
      const pricingCalculation = await PricingWorkflowManager.calculatePricing({
        property_id: analysis.property_id,
        estimated_value: analysis.estimated_value,
        confidence_score: analysis.confidence,
        analysis_data: {
          features: analysis.features,
          flip_comps: analysis.flip_comps,
          rental_comps: analysis.rental_comps
        },
        comparables: analysis.similar_properties || [],
        market_trends: analysis.flip_comps?.neighborhood_trends || {}
      })

      // Create initial pricing revision with calculated offer
      const previousOffer = 0 // This is the initial pricing, no previous offer
      const pricingResult = await PricingWorkflowManager.createRevision(
        analysis.property_id,
        {
          previous_offer: previousOffer,
          new_offer: pricingCalculation.recommended_offer,
          reason: `Initial pricing based on comp vision analysis (ID: ${analysisId})`,
          confidence_adjustment: analysis.confidence / 100 - 0.75, // Convert to adjustment factor
          market_adjustment: 0 // No additional market adjustment for initial pricing
        },
        adminId
      )

      if (!pricingResult.success) {
        console.warn('Failed to create pricing revision:', pricingResult.error)
      }

      // Log the approval
      await DataGovernanceManager.logActivity({
        userId: adminId,
        action: 'comp_vision_analysis_approved',
        tableName: 'comp_vision_analyses',
        recordId: analysisId,
        details: `Analysis approved for property ${analysis.property_id}`,
        metadata: {
          property_id: analysis.property_id,
          estimated_value: analysis.estimated_value,
          confidence: analysis.confidence
        }
      })

      return { success: true }

    } catch (error) {
      console.error('Error approving analysis:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get analysis results for property
   */
  static async getPropertyAnalysis(
    propertyId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_property_analysis', {
          p_property_id: propertyId
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        data: data?.[0] || null
      }

    } catch (error) {
      console.error('Error getting property analysis:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Simulate ML processing for development/demo
   */
  private static async simulateAnalysisProcessing(
    analysisId: string,
    property: any
  ): Promise<void> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Generate mock results
      const mockResults: CompVisionResults = {
        features: [
          { name: 'Single Family Home', confidence: 95 },
          { name: 'Brick Exterior', confidence: 87 },
          { name: 'Attached Garage', confidence: 92 },
          { name: 'Landscaped Yard', confidence: 78 },
          { name: 'Updated Windows', confidence: 65 }
        ],
        estimated_value: Math.floor((200000 + Math.random() * 300000) / 1000) * 1000,
        confidence: Math.floor(75 + Math.random() * 20),
        flip_comps: {
          after_repair_value: Math.floor((250000 + Math.random() * 200000) / 1000) * 1000,
          price_per_sqft: Math.floor(120 + Math.random() * 80),
          days_on_market: Math.floor(30 + Math.random() * 60),
          sale_to_list_ratio: 0.95 + Math.random() * 0.08,
          renovation_grade: ['Light', 'Medium', 'Heavy'][Math.floor(Math.random() * 3)],
          recent_sales: [],
          lot_size: Math.floor(6000 + Math.random() * 4000),
          zoning_potential: 'Residential single-family with potential ADU',
          neighborhood_trends: 'Stable market with 3% annual appreciation',
          property_type_match: 'Excellent'
        },
        rental_comps: {
          market_rent_estimate: Math.floor(1500 + Math.random() * 1000),
          rent_to_price_ratio: 0.008 + Math.random() * 0.004,
          cap_rate: 0.06 + Math.random() * 0.03,
          vacancy_rate: 0.03 + Math.random() * 0.05,
          tenant_turnover: 'Low',
          crime_rate: 'Low',
          school_district_quality: 'Good',
          transit_employment_access: 'Moderate',
          hoa_fees: Math.floor(Math.random() * 200),
          property_taxes: Math.floor(3000 + Math.random() * 2000)
        },
        similar_properties: [
          {
            id: 'similar_1',
            address: '123 Comparable St',
            similarity: 92,
            price: Math.floor((180000 + Math.random() * 100000) / 1000) * 1000,
            image: '/images/similar1.jpg',
            sqft: Math.floor(1200 + Math.random() * 800),
            bedrooms: Math.floor(2 + Math.random() * 3),
            bathrooms: Math.floor(1 + Math.random() * 2)
          },
          {
            id: 'similar_2',
            address: '456 Market Ave',
            similarity: 87,
            price: Math.floor((190000 + Math.random() * 100000) / 1000) * 1000,
            image: '/images/similar2.jpg',
            sqft: Math.floor(1300 + Math.random() * 700),
            bedrooms: Math.floor(2 + Math.random() * 3),
            bathrooms: Math.floor(1 + Math.random() * 2)
          }
        ],
        processing_duration_seconds: Math.floor(15 + Math.random() * 30)
      }

      // Update analysis with results
      await this.updateAnalysisResults(analysisId, mockResults)

    } catch (error) {
      console.error('Error in simulated processing:', error)
      await this.markAnalysisFailed(analysisId, 'Simulated processing failed')
    }
  }
}