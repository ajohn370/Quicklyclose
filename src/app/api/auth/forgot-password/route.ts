import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, portal } = await request.json()

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required',
        error: 'MISSING_EMAIL'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the origin from the request headers or use the configured app URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://quickly-close-app.vercel.app'
    
    // Construct the redirect URL with portal context
    const redirectUrl = `${origin}/reset-password?portal=${portal || 'investor'}`

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error('Password reset error:', error)
      
      // Don't expose specific error details for security
      return NextResponse.json({
        success: false,
        message: 'Failed to send reset email. Please check your email address and try again.',
        error: 'RESET_FAILED'
      }, { status: 400 })
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we\'ve sent a password reset link.',
      data: {
        email,
        portal: portal || 'investor'
      }
    })
  } catch (error) {
    console.error('Forgot password API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed',
    error: 'METHOD_NOT_ALLOWED'
  }, { status: 405 })
}