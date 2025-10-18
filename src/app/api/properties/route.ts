import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required to view properties')
    }
    
    const supabase = await createClient()
    const { searchParams } = request.nextUrl
    
    // Parse filters from query parameters
    const filters = {
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      minBedrooms: searchParams.get('minBedrooms') ? parseInt(searchParams.get('minBedrooms')!) : undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      status: searchParams.get('status') || undefined,
      sellerId: searchParams.get('sellerId') || undefined
    }

    // Build the query
    let query = supabase
      .from('properties')
      .select(`
        *,
        seller_profiles!inner (
          id,
          full_name,
          email,
          phone
        ),
        property_images (
          id,
          image_url,
          is_primary
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.minPrice) {
      query = query.gte('listing_price', filters.minPrice)
    }
    
    if (filters.maxPrice) {
      query = query.lte('listing_price', filters.maxPrice)
    }
    
    if (filters.minBedrooms) {
      query = query.gte('bedrooms', filters.minBedrooms)
    }
    
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`)
    }
    
    if (filters.state) {
      query = query.eq('state', filters.state)
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    // If user is a seller, only show their properties
    const userRole = user.user_metadata?.role
    if (userRole === 'seller') {
      // Get seller profile
      const { data: sellerProfile } = await supabase
        .from('seller_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (sellerProfile) {
        query = query.eq('seller_id', sellerProfile.id)
      } else {
        // No seller profile, return empty
        return NextResponse.json({
          success: true,
          data: [],
          totalCount: 0,
          filters: filters
        })
      }
    } else if (filters.sellerId) {
      // Admin or investor can filter by specific seller
      query = query.eq('seller_id', filters.sellerId)
    }

    const { data: properties, error, count } = await query

    if (error) {
      console.error('Error fetching properties from database:', error)
      throw error
    }

    // Transform the data to match the expected format
    const transformedProperties = properties?.map(property => ({
      id: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip_code,
      price: property.listing_price || property.asking_price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.square_feet,
      images: property.property_images?.map((img: any) => img.image_url) || ['/api/placeholder/400/300'],
      status: property.status || 'active',
      listingDate: property.created_at,
      description: property.description,
      propertyType: property.property_type,
      yearBuilt: property.year_built,
      currentState: property.current_state,
      confidenceScore: property.confidence_score,
      seller: property.seller_profiles ? {
        id: property.seller_profiles.id,
        name: property.seller_profiles.full_name,
        email: property.seller_profiles.email,
        phone: property.seller_profiles.phone
      } : null
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedProperties,
      totalCount: count || transformedProperties.length,
      filters: filters
    })

  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch properties'
    }, { status: 500 })
  }
}