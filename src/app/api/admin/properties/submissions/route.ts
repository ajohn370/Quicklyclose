import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Property Submissions API
 * Manages property submissions for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated admin
    const admin = await getAuthenticatedAdmin(request)
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'submitted_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query with enhanced seller information
    let query = supabase
      .from('properties')
      .select(`
        id,
        seller_id,
        address,
        city,
        state,
        zip_code,
        property_type,
        bedrooms,
        bathrooms,
        square_feet,
        listing_price,
        current_state,
        created_at,
        updated_at,
        seller_profiles!inner (
          id,
          full_name,
          email,
          phone,
          address,
          created_at,
          updated_at
        ),
        comp_vision_analyses (
          id,
          status,
          estimated_value,
          created_at
        ),
        state_transitions (
          id,
          previous_state,
          new_state,
          triggered_by,
          reason,
          created_at
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    // Apply state filter if provided
    if (state && state !== 'all') {
      query = query.eq('current_state', state)
    }

    const { data: properties, error: propertiesError, count } = await query

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch properties'
      }, { status: 500 })
    }

    // Get additional seller data for each property
    const sellerIds = properties?.map(p => p.seller_id).filter(Boolean) || []
    
    // Fetch seller communication and interaction history
    let sellerData = new Map()
    if (sellerIds.length > 0) {
      const { data: communications } = await supabase
        .from('seller_communication_log')
        .select('seller_id, communication_type, direction, created_at')
        .in('seller_id', sellerIds)
        .order('created_at', { ascending: false })
      
      const { data: interactions } = await supabase
        .from('seller_property_interactions')
        .select('seller_id, property_id, interaction_type, decision, created_at')
        .in('seller_id', sellerIds)
        .order('created_at', { ascending: false })
      
      const { data: feedback } = await supabase
        .from('seller_feedback')
        .select('seller_id, feedback_type, rating, created_at')
        .in('seller_id', sellerIds)
        .order('created_at', { ascending: false })
      
      // Group data by seller
      sellerIds.forEach(sellerId => {
        const sellerCommunications = communications?.filter(c => c.seller_id === sellerId) || []
        const sellerInteractions = interactions?.filter(i => i.seller_id === sellerId) || []
        const sellerFeedback = feedback?.filter(f => f.seller_id === sellerId) || []
        
        sellerData.set(sellerId, {
          communicationCount: sellerCommunications.length,
          lastCommunication: sellerCommunications[0]?.created_at,
          interactionCount: sellerInteractions.length,
          lastInteraction: sellerInteractions[0]?.created_at,
          feedbackCount: sellerFeedback.length,
          avgRating: sellerFeedback.length > 0 
            ? sellerFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / sellerFeedback.filter(f => f.rating).length 
            : null,
          hasResponded: sellerInteractions.some(i => i.decision)
        })
      })
    }

    // Transform data to match frontend interface
    const transformedProperties = properties?.map(property => {
      const sellerProfile = Array.isArray(property.seller_profiles) 
        ? property.seller_profiles[0] 
        : property.seller_profiles;
      
      const additionalSellerData = sellerData.get(property.seller_id) || {}
      
      return {
        id: property.id,
        seller_id: property.seller_id,
        address: property.address,
        city: property.city,
        state: property.state,
        zip_code: property.zip_code,
        property_type: property.property_type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_feet: property.square_feet,
        listing_price: property.listing_price,
        current_state: property.current_state,
        analysis_status: property.comp_vision_analyses?.[0]?.status || 'pending',
        confidence_score: 85, // Default confidence score for display
        submitted_at: property.created_at,
        updated_at: property.updated_at,
        seller_profile: {
          id: sellerProfile?.id || '',
          name: sellerProfile?.full_name || '',
          email: sellerProfile?.email || '',
          phone: sellerProfile?.phone || '',
          address: sellerProfile?.address || '',
          member_since: sellerProfile?.created_at || '',
          last_updated: sellerProfile?.updated_at || '',
          communication_count: additionalSellerData.communicationCount || 0,
          last_communication: additionalSellerData.lastCommunication,
          interaction_count: additionalSellerData.interactionCount || 0,
          last_interaction: additionalSellerData.lastInteraction,
          feedback_count: additionalSellerData.feedbackCount || 0,
          avg_rating: additionalSellerData.avgRating,
          has_responded: additionalSellerData.hasResponded || false
        },
        comp_vision_analyses: property.comp_vision_analyses || [],
        state_transitions: property.state_transitions || []
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: transformedProperties,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false
      }
    })

  } catch (error) {
    console.error('Property submissions API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process property submissions request'
    }, { status: 500 })
  }
}