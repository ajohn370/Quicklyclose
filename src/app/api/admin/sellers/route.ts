import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin, createAdminAuthErrorResponse, logAdminActivity, getClientIP } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(request)
    if (!admin) {
      return createAdminAuthErrorResponse('Admin access required')
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('seller_profiles')
      .select(`
        *,
        properties:properties(count),
        analyses:comp_vision_analyses(count),
        latest_analysis:comp_vision_analyses(
          id,
          estimated_value,
          confidence,
          created_at
        ),
        pending_pricing:pricing_revisions(
          id,
          status,
          suggested_price,
          created_at
        )
      `)

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply status filter
    if (status) {
      switch (status) {
        case 'no_analysis':
          query = query.is('analyses.count', 0)
          break
        case 'pending_pricing':
          query = query.not('pending_pricing', 'is', null)
          break
        case 'active':
          query = query.gt('analyses.count', 0)
          break
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const { data: sellers, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching sellers:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch sellers'
      }, { status: 500 })
    }

    // Process sellers data
    const processedSellers = sellers?.map(seller => ({
      ...seller,
      properties_count: seller.properties?.[0]?.count || 0,
      analyses_count: seller.analyses?.[0]?.count || 0,
      latest_analysis: seller.latest_analysis?.[0] || null,
      has_pending_pricing: seller.pending_pricing?.some((pr: any) => pr.status === 'pending') || false,
      status: seller.analyses?.[0]?.count === 0 ? 'no_analysis' : 
              seller.pending_pricing?.some((pr: any) => pr.status === 'pending') ? 'pending_pricing' : 'active'
    }))

    // Log activity
    await logAdminActivity(
      admin.adminProfile.id,
      'VIEW_SELLERS',
      'sellers',
      undefined,
      { search, status, page, limit },
      getClientIP(request)
    )

    return NextResponse.json({
      success: true,
      data: {
        sellers: processedSellers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error in admin sellers API:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(request)
    if (!admin) {
      return createAdminAuthErrorResponse('Admin access required')
    }

    // Only super_admin and admin can create seller entries
    if (!['super_admin', 'admin'].includes(admin.adminProfile.role)) {
      return createAdminAuthErrorResponse('Insufficient privileges to create sellers')
    }

    const body = await request.json()
    const { full_name, email, phone, marketing_consent = false } = body

    if (!full_name || !email) {
      return NextResponse.json({
        success: false,
        message: 'Full name and email are required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if seller already exists
    const { data: existingSeller } = await supabase
      .from('seller_profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingSeller) {
      return NextResponse.json({
        success: false,
        message: 'Seller with this email already exists'
      }, { status: 409 })
    }

    // Create seller profile
    const { data: newSeller, error } = await supabase
      .from('seller_profiles')
      .insert({
        full_name,
        email,
        phone,
        marketing_consent,
        created_by_admin: admin.adminProfile.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating seller:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to create seller'
      }, { status: 500 })
    }

    // Log activity
    await logAdminActivity(
      admin.adminProfile.id,
      'CREATE_SELLER',
      'seller',
      newSeller.id,
      { full_name, email },
      getClientIP(request)
    )

    return NextResponse.json({
      success: true,
      data: newSeller,
      message: 'Seller created successfully'
    })

  } catch (error) {
    console.error('Error creating seller:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
