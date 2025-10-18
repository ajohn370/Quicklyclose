import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-rbac'
import { PricingWorkflowManager } from '@/lib/pricing-workflow'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Property Pricing Analysis API
 * Returns comprehensive pricing analysis for a specific property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { user, hasPermission, error } = await requirePermission(request, 'pricing.view')
    
    if (!user || !hasPermission) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const { propertyId } = await params

    // Get property details with analysis
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        address,
        property_type,
        listing_price,
        current_state,
        confidence_score,
        recommended_offer,
        created_at,
        updated_at,
        seller_profiles!inner (
          name,
          email,
          phone
        ),
        comp_vision_analyses (
          id,
          estimated_value,
          confidence_score,
          analysis_data,
          status,
          created_at
        )
      `)
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({
        success: false,
        message: 'Property not found'
      }, { status: 404 })
    }

    // Get the latest analysis
    const latestAnalysis = property.comp_vision_analyses?.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    if (!latestAnalysis) {
      return NextResponse.json({
        success: false,
        message: 'No analysis found for this property'
      }, { status: 404 })
    }

    // Calculate pricing using workflow manager
    const pricingCalculation = await PricingWorkflowManager.calculatePricing({
      property_id: propertyId,
      estimated_value: latestAnalysis.estimated_value,
      confidence_score: latestAnalysis.confidence_score || property.confidence_score,
      analysis_data: latestAnalysis.analysis_data,
      comparables: latestAnalysis.analysis_data?.comparables || [],
      market_trends: latestAnalysis.analysis_data?.market_trends || {}
    })

    // Get pricing revision history
    const revisionHistory = await PricingWorkflowManager.getPricingHistory(propertyId)

    // Build comprehensive analysis response
    const analysisResponse = {
      id: latestAnalysis.id,
      property_id: propertyId,
      address: property.address,
      property_type: property.property_type,
      listing_price: property.listing_price,
      estimated_value: latestAnalysis.estimated_value,
      confidence_score: latestAnalysis.confidence_score || property.confidence_score,
      current_state: property.current_state,
      analysis_data: {
        comparables: latestAnalysis.analysis_data?.comparables || [],
        market_trends: latestAnalysis.analysis_data?.market_trends || {
          trend: 'stable',
          percentage: 0,
          timeframe: '3 months'
        },
        condition_score: latestAnalysis.analysis_data?.condition_score || 85,
        location_score: latestAnalysis.analysis_data?.location_score || 78,
        market_score: latestAnalysis.analysis_data?.market_score || 82
      },
      profit_margins: pricingCalculation.profit_margins,
      recommended_offer: property.recommended_offer || pricingCalculation.recommended_offer,
      risk_assessment: pricingCalculation.risk_assessment,
      revision_history: revisionHistory.slice(0, 10), // Last 10 revisions
      seller_profile: (() => {
        const sellerProfile = Array.isArray(property.seller_profiles) 
          ? property.seller_profiles[0] 
          : property.seller_profiles;
        return {
          name: sellerProfile?.name || '',
          email: sellerProfile?.email || '',
          phone: sellerProfile?.phone || ''
        };
      })(),
      created_at: latestAnalysis.created_at,
      updated_at: property.updated_at
    }

    return NextResponse.json({
      success: true,
      data: analysisResponse
    })

  } catch (error) {
    console.error('Pricing analysis API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to load pricing analysis'
    }, { status: 500 })
  }
}