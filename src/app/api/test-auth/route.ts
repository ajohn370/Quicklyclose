import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get all cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    console.log('All cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    // Try to get session
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('Session check:', {
      hasSession: !!session,
      sessionUser: session?.user?.email,
      hasUser: !!user,
      userEmail: user?.email,
      sessionError: sessionError?.message,
      userError: userError?.message
    })
    
    return NextResponse.json({
      success: true,
      data: {
        cookies: allCookies.map(c => c.name),
        hasSession: !!session,
        sessionUser: session?.user?.email,
        hasUser: !!user,
        userEmail: user?.email,
        sessionError: sessionError?.message,
        userError: userError?.message
      }
    })
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}