/**
 * API Route: Computer Vision Analysis Results
 * Provides analysis data for the comp-vision-results component
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RBACManager } from '@/lib/rbac'
import { DataGovernanceManager } from '@/lib/data-governance'

interface RouteParams {
  params: Promise<{
    analysisId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { analysisId } = await params
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user role to determine access
    const { data: userData } = await supabase.auth.getUser()
    const userRole = userData?.user?.user_metadata?.role
    
    // For investors, we'll check if they have an investor profile
    // For admins, we'll check RBAC permissions
    if (userRole === 'admin') {
      const hasPermission = await RBACManager.hasPermission(
        session.user.id,
        'analysis.view'
      )

      if (!hasPermission) {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    } else if (userRole === 'investor') {
      // Check if user has an investor profile
      const { data: investorProfile } = await supabase
        .from('investor_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single()
      
      if (!investorProfile) {
        return NextResponse.json(
          { success: false, message: 'Investor profile not found' },
          { status: 403 }
        )
      }
    }

    // Get analysis with all related data
    const { data: analysis, error: analysisError } = await supabase
      .from('comp_vision_analyses')
      .select(`
        id,
        property_id,
        address,
        city,
        state,
        zip_code,
        image_url,
        features,
        estimated_value,
        confidence,
        flip_comps,
        rental_comps,
        similar_properties,
        status,
        admin_approved,
        seller_visible_notes,
        created_at,
        updated_at
      `)
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json(
        { success: false, message: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this analysis based on their role
    const isAdmin = userRole === 'admin' && await RBACManager.hasPermission(session.user.id, 'admin.dashboard.view')
    const isInvestor = userRole === 'investor'
    const isSeller = userRole === 'seller'
    
    // Investors can see admin-approved analyses
    // Sellers can see their own property analyses
    // Admins can see everything
    if (!isAdmin) {
      if (isInvestor) {
        // Investors can only see admin-approved analyses
        if (!analysis.admin_approved) {
          return NextResponse.json(
            { success: false, message: 'This analysis is not yet available' },
            { status: 403 }
          )
        }
      } else if (isSeller) {
        // Check if seller owns the property
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select(`
            id,
            seller_profiles!inner (
              user_id
            )
          `)
          .eq('id', analysis.property_id)
          .single()

        const sellerProfile = Array.isArray(property?.seller_profiles) 
          ? property.seller_profiles[0] 
          : property?.seller_profiles;
        const sellerUserId = sellerProfile?.user_id;
        
        if (propertyError || !property || sellerUserId !== session.user.id) {
          return NextResponse.json(
            { success: false, message: 'Access denied' },
            { status: 403 }
          )
        }
      } else {
        // Unknown role
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Transform data to match component interface
    const transformedAnalysis = {
      id: analysis.id,
      address: analysis.address,
      city: analysis.city,
      state: analysis.state,
      zip_code: analysis.zip_code,
      image_url: analysis.image_url,
      features: analysis.features || [],
      estimated_value: analysis.estimated_value,
      confidence: analysis.confidence,
      flip_comps: analysis.flip_comps || {
        after_repair_value: null,
        price_per_sqft: null,
        days_on_market: null,
        sale_to_list_ratio: null,
        renovation_grade: null,
        recent_sales: [],
        lot_size: null,
        zoning_potential: null,
        neighborhood_trends: null,
        property_type_match: null
      },
      rental_comps: analysis.rental_comps || {
        market_rent_estimate: null,
        rent_to_price_ratio: null,
        cap_rate: null,
        vacancy_rate: null,
        tenant_turnover: null,
        crime_rate: null,
        school_district_quality: null,
        transit_employment_access: null,
        hoa_fees: null,
        property_taxes: null
      },
      similar_properties: analysis.similar_properties || [],
      admin_approved: analysis.admin_approved,
      seller_visible_notes: analysis.seller_visible_notes,
      status: analysis.status
    }

    // Log access for audit
    await DataGovernanceManager.logActivity({
      userId: session.user.id,
      action: 'comp_vision_analysis_viewed',
      tableName: 'comp_vision_analyses',
      recordId: analysisId,
      details: JSON.stringify({
        property_id: analysis.property_id,
        is_admin: isAdmin
      })
    })

    return NextResponse.json({
      success: true,
      data: transformedAnalysis
    })

  } catch (error) {
    console.error('Error fetching comp vision analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { analysisId } = await params
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permission to approve analyses (admin only)
    const hasPermission = await RBACManager.hasPermission(
      session.user.id,
      'analysis.approve'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      admin_approved,
      seller_visible_notes,
      internal_notes,
      status
    } = body

    // Update analysis
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('comp_vision_analyses')
      .update({
        admin_approved,
        seller_visible_notes,
        internal_notes,
        status,
        admin_approved_by: admin_approved ? session.user.id : null,
        admin_approved_at: admin_approved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .select()
      .single()

    if (updateError || !updatedAnalysis) {
      return NextResponse.json(
        { success: false, message: 'Failed to update analysis' },
        { status: 500 }
      )
    }

    // If analysis is approved, trigger property state transition
    if (admin_approved && status === 'approved') {
      // Get property ID for state transition
      const { data: property } = await supabase
        .from('properties')
        .select('id, current_state')
        .eq('id', updatedAnalysis.property_id)
        .single()

      if (property && property.current_state === 'analyzing') {
        // Transition to pricing review
        await supabase.rpc('transition_property_state', {
          p_property_id: property.id,
          p_new_state: 'analysis_completed',
          p_metadata: {
            analysis_id: analysisId,
            approved_by: session.user.id,
            approved_at: new Date().toISOString()
          }
        })
      }
    }

    // Log the action
    await DataGovernanceManager.logActivity({
      userId: session.user.id,
      action: admin_approved ? 'comp_vision_analysis_approved' : 'comp_vision_analysis_updated',
      tableName: 'comp_vision_analyses',
      recordId: analysisId,
      details: JSON.stringify({
        property_id: updatedAnalysis.property_id,
        status,
        admin_approved
      })
    })

    return NextResponse.json({
      success: true,
      data: updatedAnalysis,
      message: admin_approved ? 'Analysis approved successfully' : 'Analysis updated successfully'
    })

  } catch (error) {
    console.error('Error updating comp vision analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}