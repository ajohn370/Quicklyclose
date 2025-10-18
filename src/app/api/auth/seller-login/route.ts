import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
    
    // Check if user has a seller profile
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle()
    
    if (!sellerProfile) {
      // Create a seller profile if it doesn't exist
      const { error: createError } = await supabase
        .from('seller_profiles')
        .insert({
          user_id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || 'User',
          email: authData.user.email || '',
          preferred_communication: 'email',
          marketing_consent: false
        })
      
      if (createError) {
        console.error('Error creating seller profile:', createError)
      }
    }
    
    // Force update user metadata to seller role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: 'seller' }
    })
    
    if (updateError) {
      console.error('Error updating user role:', updateError)
    }
    
    return NextResponse.json({
      success: true,
      user: authData.user,
      role: 'seller',
      message: 'Successfully logged in as seller'
    })
    
  } catch (error: any) {
    console.error('Seller login error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}