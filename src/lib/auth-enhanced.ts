import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

// Types
export type Role = 'seller' | 'investor' | 'admin'
export type Portal = 'seller_portal' | 'investor_portal' | 'admin_portal'
export type AdminLevel = 'super_admin' | 'admin' | 'analyst' | 'support'

export interface AuthenticatedUser extends User {
  activeRole: Role
  availableRoles: Role[]
  profile: UserProfile
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
}

export interface UserRole {
  role: Role
  is_active: boolean
}

export interface SessionContext {
  user_id: string
  active_role: Role
  portal_context: Portal
  session_token: string
}

// Helper function to determine portal from request path
function getPortalFromPath(pathname: string): Portal | null {
  if (pathname.includes('/seller-portal')) return 'seller_portal'
  if (pathname.includes('/investor-portal')) return 'investor_portal'
  if (pathname.includes('/admin')) return 'admin_portal'
  return null
}

// Helper function to get role from portal
function getRoleFromPortal(portal: Portal): Role {
  switch (portal) {
    case 'seller_portal': return 'seller'
    case 'investor_portal': return 'investor'
    case 'admin_portal': return 'admin'
  }
}

// Get authenticated user with basic auth check
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

// Get authenticated user with role context
export async function getAuthenticatedUserWithRole(
  request: NextRequest,
  requiredRole?: Role
): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return null
    }

    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (rolesError) {
      console.error('Roles error:', rolesError)
      return null
    }

    const availableRoles = roles?.map(r => r.role as Role) || []

    // Determine active role based on portal context
    const pathname = request.nextUrl.pathname
    const portal = getPortalFromPath(pathname)
    let activeRole: Role = availableRoles[0] || 'investor'

    if (portal) {
      const portalRole = getRoleFromPortal(portal)
      if (availableRoles.includes(portalRole)) {
        activeRole = portalRole
      }
    }

    // Check required role if specified
    if (requiredRole) {
      if (!availableRoles.includes(requiredRole)) {
        return null
      }
      activeRole = requiredRole
    }

    return {
      ...user,
      activeRole,
      availableRoles,
      profile
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Check if user has a specific role
export async function userHasRole(userId: string, role: Role): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .rpc('user_has_role', {
        p_user_id: userId,
        p_role: role
      })

    if (error) {
      console.error('Role check error:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Role check error:', error)
    return false
  }
}

// Get user's available roles
export async function getUserRoles(userId: string): Promise<Role[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Get roles error:', error)
      return []
    }

    return data?.map(r => r.role as Role) || []
  } catch (error) {
    console.error('Get roles error:', error)
    return []
  }
}

// Add a role to a user
export async function addUserRole(userId: string, role: Role): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .rpc('add_user_role', {
        p_user_id: userId,
        p_role: role
      })

    if (error) {
      console.error('Add role error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Add role error:', error)
    return false
  }
}

// Create or update session context
export async function setSessionContext(
  userId: string,
  role: Role,
  portal: Portal,
  request: NextRequest
): Promise<string | null> {
  try {
    const supabase = await createClient()
    
    // Generate session token
    const sessionToken = crypto.randomUUID()
    
    // Get request metadata
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Set expiry (2 hours for seller, 1 hour for investor, 30 min for admin)
    const expiryMinutes = role === 'seller' ? 120 : role === 'investor' ? 60 : 30
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        active_role: role,
        portal_context: portal,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString()
      })

    if (error) {
      console.error('Session context error:', error)
      return null
    }

    return sessionToken
  } catch (error) {
    console.error('Session context error:', error)
    return null
  }
}

// Get active session and role
export async function getActiveSession(
  userId: string,
  sessionToken?: string
): Promise<SessionContext | null> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessionToken) {
      query = query.eq('session_token', sessionToken)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return null
    }

    // Update last activity
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', data.id)

    return {
      user_id: data.user_id,
      active_role: data.active_role as Role,
      portal_context: data.portal_context as Portal,
      session_token: data.session_token
    }
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

// Switch user's active role
export async function switchUserRole(
  userId: string,
  newRole: Role,
  portal: Portal,
  request: NextRequest
): Promise<string | null> {
  try {
    // Check if user has the role
    const hasRole = await userHasRole(userId, newRole)
    if (!hasRole) {
      // Try to add the role
      const added = await addUserRole(userId, newRole)
      if (!added) {
        return null
      }
    }

    // Create new session with new role
    return await setSessionContext(userId, newRole, portal, request)
  } catch (error) {
    console.error('Switch role error:', error)
    return null
  }
}

// Require authentication with specific role
export async function requireAuthWithRole(
  request: NextRequest,
  role: Role
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUserWithRole(request, role)
  
  if (!user) {
    throw new Error(`Authentication required with role: ${role}`)
  }
  
  return user
}

// Create standardized auth error response
export function createAuthErrorResponse(
  message: string = 'Authentication required',
  status: number = 401
) {
  return NextResponse.json({
    success: false,
    message,
    error: 'UNAUTHORIZED'
  }, { status })
}

// Create role error response
export function createRoleErrorResponse(
  requiredRole: Role,
  message?: string
) {
  return NextResponse.json({
    success: false,
    message: message || `Role '${requiredRole}' required`,
    error: 'FORBIDDEN',
    requiredRole
  }, { status: 403 })
}

// Middleware helper for role-based API protection
export async function withRoleAuth(
  request: NextRequest,
  requiredRole: Role,
  handler: (user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUserWithRole(request, requiredRole)
    
    if (!user) {
      return createAuthErrorResponse()
    }

    if (!user.availableRoles.includes(requiredRole)) {
      return createRoleErrorResponse(requiredRole)
    }

    return await handler(user)
  } catch (error) {
    console.error('Role auth middleware error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}