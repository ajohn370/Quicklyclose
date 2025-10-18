import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export function createAuthErrorResponse(message: string = 'Authentication required') {
  return NextResponse.json({
    success: false,
    message,
    error: 'UNAUTHORIZED'
  }, { status: 401 })
}

export async function requireAuth(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}