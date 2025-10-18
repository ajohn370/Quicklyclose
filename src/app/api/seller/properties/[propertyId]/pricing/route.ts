/**
 * API Route: Seller Property Pricing Access
 * Provides pricing information for sellers via secure access
 */

import { NextRequest, NextResponse } from 'next/server'
import { SellerAuthManager } from '@/lib/seller-auth'
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

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Validate seller session
    const sessionResult = await SellerAuthManager.validateSellerSession(sessionToken)
    if (!sessionResult.success || !sessionResult.sellerId) {
      return NextResponse.json(
        { success: false, message: sessionResult.error || 'Invalid session' },
        { status: 401 }
      )
    }

    // Check seller access to this property
    const accessCheck = await SellerAuthManager.checkSellerAccess(
      sessionResult.sellerId,
      propertyId,
      'view'
    )

    if (!accessCheck.can_view_property) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied',
          restrictions: accessCheck.restrictions
        },
        { status: 403 }
      )
    }

    // Get property with pricing information
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        address,
        property_type,
        listing_price,
        estimated_value,
        confidence_score,
        current_state,
        analysis_data,
        pricing_revisions!left (
          id,
          recommended_offer,
          profit_margins,
          risk_factors,
          approval_status,
          created_at,
          revision_data
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

    // Get the latest approved pricing revision
    const latestPricing = property.pricing_revisions?.find(
      revision => revision.approval_status === 'approved'
    ) || property.pricing_revisions?.[0]

    if (!latestPricing) {
      return NextResponse.json(
        { success: false, message: 'Pricing not available yet' },
        { status: 404 }
      )
    }

    // Build comprehensive pricing response
    const pricingData = {
      property: {
        id: property.id,
        address: property.address,
        property_type: property.property_type,
        listing_price: property.listing_price,
        estimated_value: property.estimated_value,
        confidence_score: property.confidence_score
      },
      offer: {
        amount: latestPricing.recommended_offer,
        breakdown: {
          estimated_value: property.estimated_value,
          profit_margin: latestPricing.profit_margins?.adjusted || 0,
          closing_costs: latestPricing.revision_data?.closing_costs || 5000,
          repairs_allowance: latestPricing.revision_data?.repairs_allowance || 0,
          final_offer: latestPricing.recommended_offer
        },
        terms: {
          cash_offer: true,
          closing_timeline: '14-21 days',
          inspection_waived: true,
          as_is_condition: true
        }
      },
      analysis: {
        comparables: property.analysis_data?.comparables?.slice(0, 5) || [],
        market_trends: property.analysis_data?.market_trends || {
          trend: 'stable',
          percentage: 0,
          timeframe: '3 months'
        },
        condition_assessment: {
          overall_score: property.analysis_data?.condition_score || 75,
          major_repairs_needed: latestPricing.revision_data?.major_repairs || [],
          estimated_repair_cost: latestPricing.revision_data?.repairs_allowance || 0
        }
      },
      timeline: {
        offer_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        estimated_closing: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days
        key_milestones: [
          {
            step: 'Offer Review',
            timeline: '1-2 days',
            description: 'Review and respond to our offer'
          },
          {
            step: 'Purchase Agreement',
            timeline: '3-5 days', 
            description: 'Execute purchase agreement'
          },
          {
            step: 'Due Diligence',
            timeline: '7-10 days',
            description: 'Final property verification'
          },
          {
            step: 'Closing',
            timeline: '14-21 days',
            description: 'Complete transaction and transfer funds'
          }
        ]
      }
    }

    return NextResponse.json({
      success: true,
      data: pricingData
    })

  } catch (error) {
    console.error('Error fetching seller pricing data:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}