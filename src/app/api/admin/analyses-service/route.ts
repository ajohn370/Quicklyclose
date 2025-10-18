import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analyses-service
 * Fetch comp vision analyses using service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Use service role client to bypass RLS for all operations
    const { createClient: createServiceClient } = require('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // Check if user is admin using service role client to bypass RLS
    const { data: adminProfile } = await supabaseService
      .from('admin_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (!adminProfile) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'all'

    let query = supabaseService
      .from('comp_vision_analyses')
      .select(`
        id,
        user_id,
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
        admin_approved_by,
        admin_approved_at,
        error_message,
        processing_duration_seconds,
        ai_model_version,
        retry_count,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: analyses, error } = await query

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analyses',
        details: error.message
      }, { status: 500 })
    }

    // Transform data to match AIResponse interface expected by frontend
    const aiResponses = analyses?.map(analysis => ({
      id: analysis.id,
      workflow_id: 'comp_vision_analysis',
      workflow_name: 'Property Value Analysis',
      trigger_source: analysis.user_id ? 'property_submission' : 'manual_trigger',
      status: mapAnalysisStatus(analysis.status),
      input_data: {
        address: `${analysis.address}, ${analysis.city}, ${analysis.state} ${analysis.zip_code}`,
        image_url: analysis.image_url
      },
      ai_response: {
        estimated_value: analysis.estimated_value,
        confidence: analysis.confidence ? analysis.confidence / 100 : 0, // Convert percentage to decimal
        features: analysis.features,
        flip_comps: analysis.flip_comps,
        rental_comps: analysis.rental_comps,
        similar_properties: analysis.similar_properties
      },
      confidence_score: analysis.confidence || 0,
      processing_time: analysis.processing_duration_seconds ? analysis.processing_duration_seconds * 1000 : 0, // Convert to ms
      created_at: analysis.created_at,
      completed_at: analysis.updated_at,
      error_message: analysis.error_message,
      property_id: analysis.property_id,
      user_id: analysis.user_id
    })) || []

    return NextResponse.json({
      success: true,
      data: aiResponses,
      meta: {
        total: aiResponses.length,
        offset,
        limit
      }
    })

  } catch (error) {
    console.error('Error in admin analyses service API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function mapAnalysisStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'timeout' {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'processing':
      return 'processing'
    case 'completed':
    case 'approved':
      return 'completed'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}