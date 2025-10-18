import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SellerProfile, Lead } from '@/types'
import { analyzePropertyWithN8n } from '@/lib/n8n-integration'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  
  if (!user) {
    return createAuthErrorResponse('Authentication required to view leads')
  }
  
  const supabase = await createClient()
  
  try {
    // Fetch leads with seller profile information
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        seller_profiles (
          full_name,
          email,
          phone
        ),
        properties (
          address,
          city,
          state,
          zip_code,
          bedrooms,
          bathrooms,
          square_feet
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch leads'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: leads || []
    })
  } catch (error) {
    console.error('Error in leads GET:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required to create leads')
    }
    
    const supabase = await createClient()
    
    // Safe JSON parsing with validation
    let body;
    try {
      body = await request.json();
      if (!body || typeof body !== 'object') {
        return NextResponse.json({
          success: false,
          message: 'Invalid request body'
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Invalid JSON format:', error);
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON format'
      }, { status: 400 });
    }
    
    // First, ensure seller profile exists or create it
    let sellerProfile: SellerProfile | null = null
    
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (existingProfile && !profileLookupError) {
      sellerProfile = existingProfile
    } else {
      // Create seller profile
      const { data: newProfile, error: profileError } = await supabase
        .from('seller_profiles')
        .insert({
          user_id: user.id,
          full_name: body.seller?.name || user.user_metadata?.full_name || '',
          email: body.seller?.email || user.email || '',
          phone: body.seller?.phone || '',
          preferred_communication: 'email'
        })
        .select()
        .single()
        
      if (profileError) {
        console.error('Error creating seller profile:', profileError)
        return NextResponse.json({
          success: false,
          message: 'Failed to create seller profile'
        }, { status: 500 })
      }
      
      sellerProfile = newProfile
    }
    
    // Create property if provided
    let propertyId: string | null = null
    if (body.address && body.city && body.state) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          seller_id: sellerProfile.id,
          address: body.address,
          city: body.city,
          state: body.state,
          zip_code: body.zip || '',
          bedrooms: body.bedrooms || null,
          bathrooms: body.bathrooms || null,
          square_feet: body.sqft || null,
          property_type: 'single_family',
          status: 'active'
        })
        .select()
        .single()
        
      if (propertyError) {
        console.error('Error creating property:', propertyError)
      } else {
        propertyId = property.id
        
        // Trigger n8n property analysis workflow
        try {
          console.log('Triggering n8n property analysis for:', property.address)
          
          // Generate a placeholder image URL for now - in production this would be from uploaded images
          const imageUrl = '/api/placeholder/800/600'
          
          const analysisRequest = {
            imageUrl,
            address: {
              street: property.address,
              city: property.city,
              state: property.state,
              zip: property.zip_code
            },
            requestId: `property-${property.id}-${Date.now()}`,
            userId: user.id
          }
          
          // Call n8n webhook asynchronously (don't wait for response to avoid timeout)
          analyzePropertyWithN8n(analysisRequest)
            .then(result => {
              console.log('n8n analysis started:', result.success ? 'SUCCESS' : 'FAILED')
              if (!result.success) {
                console.error('n8n analysis error:', result.error)
              }
            })
            .catch(error => {
              console.error('n8n analysis exception:', error)
            })
            
        } catch (error) {
          console.error('Error triggering n8n analysis:', error)
          // Don't fail the lead creation if n8n fails
        }
      }
    }
    
    // Create lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        seller_id: sellerProfile.id,
        property_id: propertyId,
        lead_source: 'website',
        status: 'new',
        contact_method: 'email'
      })
      .select(`
        *,
        seller_profiles (
          full_name,
          email,
          phone
        ),
        properties (
          address,
          city,
          state,
          zip_code,
          bedrooms,
          bathrooms,
          square_feet
        )
      `)
      .single()
      
    if (leadError) {
      console.error('Error creating lead:', leadError)
      return NextResponse.json({
        success: false,
        message: 'Failed to create lead'
      }, { status: 500 })
    }

    // TODO: Integrate with notification services
    // - Send SMS to seller via Twilio
    // - Send email confirmation via SendGrid
    // - Notify admin team

    return NextResponse.json({
      success: true,
      data: newLead,
      message: 'Lead submitted successfully'
    })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create lead'
    }, { status: 500 })
  }
}