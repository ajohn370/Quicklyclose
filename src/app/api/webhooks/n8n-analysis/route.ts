import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * N8N Analysis Webhook Endpoint
 * Receives analysis results from n8n and stores them in comp_vision_analyses table
 */
export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const body = await request.json()
    console.log('n8n webhook received data:', JSON.stringify(body, null, 2))
    
    const { 
      requestId,
      userId,
      address,
      estimated_value,
      confidence,
      flip_comps,
      rental_comps,
      similar_properties,
      features,
      gemini_analysis,
      zillow_data,
      ai_analysis,
      property_condition,
      architectural_style,
      curb_appeal,
      maintenance_needs,
      key_features,
      suggested_improvements,
      market_readiness
    } = body

    // Validate required fields
    if (!address || !address.street || !address.city || !address.state || !address.zip) {
      return NextResponse.json({
        success: false,
        error: 'Missing required address fields'
      }, { status: 400 })
    }

    // Prepare analysis data for database insertion
    const analysisData = {
      // Required fields
      image_url: '/api/placeholder/800/600', // Placeholder since n8n doesn't return image URL
      address: address.street,
      city: address.city,
      state: address.state,
      zip_code: address.zip,
      
      // Analysis results
      estimated_value: estimated_value || 0,
      confidence: confidence || 0,
      features: features || [],
      flip_comps: flip_comps || {},
      rental_comps: rental_comps || {},
      similar_properties: similar_properties || [],
      
      // Store additional data in features array for now
      // (since these columns don't exist in the current schema)
      
      // Status and metadata
      status: 'completed',
      admin_approved: false, // Require admin approval by default
      processing_duration_seconds: 3, // Estimated processing time
      
      // User ID if provided and valid UUID
      ...(userId && userId !== 'anonymous' && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) && {
        user_id: userId
      })
    }

    console.log('Inserting analysis data:', JSON.stringify(analysisData, null, 2))

    const { data: analysisRecord, error: insertError } = await supabase
      .from('comp_vision_analyses')
      .insert(analysisData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting analysis:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to store analysis results',
        details: insertError.message
      }, { status: 500 })
    }

    console.log('Successfully stored analysis:', analysisRecord.id)

    return NextResponse.json({
      success: true,
      data: {
        id: analysisRecord.id,
        message: 'Analysis results stored successfully'
      }
    })

  } catch (error) {
    console.error('N8N webhook error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}