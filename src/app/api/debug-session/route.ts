import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG SESSION ===')
    
    // Get all cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    // Check request headers
    const authHeader = request.headers.get('authorization')
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing')
    
    // Try different Supabase approaches
    const supabase = await createClient()
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session result:', {
      hasSession: !!session,
      sessionUser: session?.user?.email,
      error: sessionError?.message
    })
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('User result:', {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      error: userError?.message
    })
    
    return NextResponse.json({
      success: true,
      debug: {
        cookies: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        hasAuthHeader: !!authHeader,
        hasSession: !!session,
        sessionUser: session?.user?.email,
        hasUser: !!user,
        userEmail: user?.email,
        userId: user?.id,
        sessionError: sessionError?.message,
        userError: userError?.message
      }
    })
    
  } catch (error) {
    console.error('Debug session error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}