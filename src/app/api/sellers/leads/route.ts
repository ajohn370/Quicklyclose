import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Create admin client with service role for user creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function findUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error);
        return null;
    }
    return data.users.find((u: any) => u.email === email) || null;
}

export async function POST(request: NextRequest) {
  try {
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

    const { seller, property } = body;

    if (!seller || !property || !seller.email) {
      return NextResponse.json({
        success: false,
        message: 'Missing seller or property information.'
      }, { status: 400 })
    }

    let userId: string;
    let userExists = false;

    // 1. Check if user already exists
    const existingUser = await findUserByEmail(seller.email);

    if (existingUser) {
      userId = existingUser.id;
      userExists = true;
    } else {
      // 2. Create user account with temporary password
      const tempPassword = crypto.randomUUID()
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: seller.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: seller.name,
          role: 'seller'
        }
      })

      if (authError) {
        console.error('Error creating user account:', authError)
        return NextResponse.json({
          success: false,
          message: 'Failed to create user account.'
        }, { status: 500 })
      }

      userId = authData.user.id

      // 3. Send password reset email so seller can claim their account
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(seller.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?portal=seller`
      })

      if (resetError) {
        console.error('Error sending password reset:', resetError)
        // Continue anyway - account is created
      }
    }

    // 4. Handle Seller Profile creation/update safely
    let sellerProfile;
    
    // First try to get existing profile
    const { data: existingProfile, error: getError } = await supabaseAdmin
      .from('seller_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (getError) {
      console.error('Error checking existing seller profile:', getError)
      return NextResponse.json({
        success: false,
        message: 'Failed to save seller information.'
      }, { status: 500 })
    }

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('seller_profiles')
        .update({
          email: seller.email,
          full_name: seller.name,
          phone: seller.phone,
          preferred_communication: 'email',
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating seller profile:', updateError)
        return NextResponse.json({
          success: false,
          message: 'Failed to update seller information.'
        }, { status: 500 })
      }
      sellerProfile = updatedProfile
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('seller_profiles')
        .insert({
          user_id: userId,
          email: seller.email,
          full_name: seller.name,
          phone: seller.phone,
          preferred_communication: 'email',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating seller profile:', insertError)
        return NextResponse.json({
          success: false,
          message: 'Failed to save seller information.'
        }, { status: 500 })
      }
      sellerProfile = newProfile
    }

    // 5. Create Property
    const { data: newProperty, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert({
        seller_id: sellerProfile.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zip_code: property.zip,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_feet: property.sqft,
        property_type: 'single_family',
        status: 'active'
      })
      .select()
      .single()

    if (propertyError) {
      console.error('Error creating property:', propertyError)
      return NextResponse.json({
        success: false,
        message: 'Failed to save property details.'
      }, { status: 500 })
    }

    // 6. Create Lead
    const { data: newLead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        seller_id: sellerProfile.id,
        property_id: newProperty.id,
        lead_source: 'website',
        status: 'new',
        contact_method: 'email'
      })
      .select()
      .single()

    if (leadError) {
      console.error('Error creating lead:', leadError)
      return NextResponse.json({
        success: false,
        message: 'Failed to create lead.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        leadId: newLead.id,
        sellerId: sellerProfile.id,
        propertyId: newProperty.id,
        userExists: userExists,
        email: seller.email
      },
      message: userExists 
        ? 'Property submitted successfully! You can track it in your seller dashboard.' 
        : 'Property submitted successfully! We\'ve sent an account activation email to access your seller dashboard.'
    })

  } catch (error) {
    console.error('Error processing lead submission:', error)
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred.'
    }, { status: 500 })
  }
}
