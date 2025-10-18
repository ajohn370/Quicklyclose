import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { password, confirmPassword } = await request.json()

    // Validation
    if (!password || !confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'Password and confirmation are required',
        error: 'MISSING_FIELDS'
      }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'Passwords do not match',
        error: 'PASSWORD_MISMATCH'
      }, { status: 400 })
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT'
      }, { status: 400 })
    }

    // Check for required character types
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumberOrSpecial = /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumberOrSpecial) {
      return NextResponse.json({
        success: false,
        message: 'Password must contain uppercase, lowercase, and number/special characters',
        error: 'PASSWORD_TOO_WEAK'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the current user (should be authenticated via the reset token)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired reset token',
        error: 'INVALID_TOKEN'
      }, { status: 401 })
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update password. Please try again.',
        error: 'UPDATE_FAILED'
      }, { status: 400 })
    }

    // Log the password reset for security auditing
    console.log(`Password reset successful for user: ${user.id} at ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      data: {
        userId: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Reset password API error:', error)
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