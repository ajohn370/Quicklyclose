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
    
    // Check if user has an investor profile
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle()
    
    if (!investorProfile) {
      // Create an investor profile if it doesn't exist
      const { error: createError } = await supabase
        .from('investor_profiles')
        .insert({
          user_id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || 'User',
          investment_focus: [],
          minimum_investment: 0,
          maximum_investment: 0,
          preferred_locations: []
        })
      
      if (createError) {
        console.error('Error creating investor profile:', createError)
      }
    }
    
    // Force update user metadata to investor role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: 'investor' }
    })
    
    if (updateError) {
      console.error('Error updating user role:', updateError)
    }
    
    return NextResponse.json({
      success: true,
      user: authData.user,
      role: 'investor',
      message: 'Successfully logged in as investor'
    })
    
  } catch (error: any) {
    console.error('Investor login error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}