import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Create admin client with service role for user queries
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 })
    }

    // Find seller profile by email
    const { data: sellerProfile, error: sellerError } = await supabaseAdmin
      .from('seller_profiles')
      .select(`
        id,
        email,
        full_name,
        phone,
        created_at,
        properties (
          id,
          address,
          city,
          state,
          zip_code,
          bedrooms,
          bathrooms,
          square_feet,
          estimated_value,
          status,
          created_at,
          leads (
            id,
            status,
            created_at
          )
        )
      `)
      .eq('email', email.toLowerCase())
      .single()

    if (sellerError) {
      if (sellerError.code === 'PGRST116') {
        // No seller profile found
        return NextResponse.json({
          success: false,
          message: 'No submissions found for this email address.'
        }, { status: 404 })
      }
      
      console.error('Error fetching seller profile:', sellerError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch submission status.'
      }, { status: 500 })
    }

    // Check if user has activated their account
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userAuth = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    
    const accountStatus = userAuth ? 'activated' : 'pending_activation'

    return NextResponse.json({
      success: true,
      data: {
        accountStatus,
        seller: {
          name: sellerProfile.full_name,
          email: sellerProfile.email,
          phone: sellerProfile.phone,
          memberSince: sellerProfile.created_at
        },
        properties: sellerProfile.properties?.map((property: any) => ({
          id: property.id,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zip_code,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          squareFeet: property.square_feet,
          estimatedValue: property.estimated_value,
          status: property.status,
          submittedAt: property.created_at,
          leads: property.leads?.map((lead: any) => ({
            id: lead.id,
            status: lead.status,
            createdAt: lead.created_at
          })) || []
        })) || []
      }
    })

  } catch (error) {
    console.error('Error in seller status API:', error)
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred.'
    }, { status: 500 })
  }
}